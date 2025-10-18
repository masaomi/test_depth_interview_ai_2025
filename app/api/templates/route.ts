import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { InterviewTemplate } from '@/lib/types';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

function getOpenAIClient() {
  const provider = process.env.LLM_PROVIDER;

  // Priority: LLM_PROVIDER=local > OPENAI_API_KEY
  if (provider === 'local') {
    const baseURL = process.env.LOCAL_LLM_BASE_URL;
    const apiKey = process.env.LOCAL_LLM_API_KEY || 'dummy';
    if (!baseURL) {
      throw new Error('LOCAL_LLM_BASE_URL environment variable is not set');
    }
    return new OpenAI({ baseURL, apiKey });
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    return new OpenAI({ apiKey });
  }
}

function getModelName() {
  const provider = process.env.LLM_PROVIDER;
  if (provider === 'local') {
    return process.env.LOCAL_LLM_MODEL || 'gpt-oss20B';
  }
  return process.env.OPENAI_MODEL || 'gpt-4';
}

const languageNames: Record<string, string> = {
  en: 'English',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
};

async function translateText(text: string, targetLangCode: string): Promise<string> {
  const languageName = languageNames[targetLangCode] || 'English';
  const openai = getOpenAIClient();
  const modelName = getModelName();
  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: `Translate the following text to ${languageName}. Only return the translated text without quotes.` },
        { role: 'user', content: text },
      ],
      temperature: 0.0,
      max_tokens: 400,
    });
    return completion.choices[0].message.content?.trim() || text;
  } catch (e) {
    console.error('Translation failed, returning original text:', e);
    return text;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || undefined;

    const stmt = db.prepare('SELECT * FROM interview_templates ORDER BY created_at DESC');
    const templates = stmt.all() as InterviewTemplate[];

    if (!lang) {
      return NextResponse.json(templates);
    }

    // Translate title and prompt to requested language in parallel per template
    const translated = await Promise.all(
      templates.map(async (t) => {
        const [title, prompt] = await Promise.all([
          translateText(t.title, lang),
          translateText(t.prompt, lang),
        ]);
        return { ...t, title, prompt };
      })
    );

    return NextResponse.json(translated);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, prompt, duration } = body;

    if (!title || !prompt) {
      return NextResponse.json({ error: 'Title and prompt are required' }, { status: 400 });
    }

    const id = randomUUID();
    const stmt = db.prepare(
      'INSERT INTO interview_templates (id, title, prompt, duration) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, title, prompt, duration || 600);

    return NextResponse.json({ id, title, prompt, duration: duration || 600 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const stmt = db.prepare('DELETE FROM interview_templates WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
