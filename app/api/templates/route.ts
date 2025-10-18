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
  it: 'Italian',
  rm: 'Romansh',
  gsw: 'Swiss German',
};

const SUPPORTED_LANGUAGES = ['en', 'ja', 'es', 'fr', 'de', 'zh', 'it', 'rm', 'gsw'];

async function translateText(text: string, targetLangCode: string): Promise<string> {
  const languageName = languageNames[targetLangCode] || 'English';
  const openai = getOpenAIClient();
  const modelName = getModelName();

  // Helper to detect if output still contains CJK characters (likely untranslated)
  const containsCJK = (s: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9d]/.test(s);

  try {
    // Use a more explicit instruction for Swiss German and Romansh
    const systemInstructions = (() => {
      if (targetLangCode === 'gsw') {
        return 'Translate the text into Swiss German (language code: gsw). Use natural Swiss German orthography (e.g., chum, nöd, gärn, d, s, ä, ö, ü). Avoid High German. Return only the final Swiss German text without quotes.';
      }
      if (targetLangCode === 'rm') {
        return 'Translate the text into Romansh (Rumantsch, Grischun standard if unsure). Return only the translated text without quotes.';
      }
      return `Translate the following text to ${languageName}. Only return the translated text without quotes.`;
    })();

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: text },
      ],
      temperature: 0.0,
      max_tokens: 800,
    });

    let result = completion.choices[0].message.content?.trim();

    // Fallback for Swiss German: sometimes models return source text or High German
    if (targetLangCode === 'gsw' && (!result || result === text || containsCJK(result))) {
      try {
        const fallback = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'First translate the user text to Standard German. Then rewrite that German translation into Swiss German (gsw) using natural Swiss German orthography and vocabulary. Return only the final Swiss German text without quotes.' },
            { role: 'user', content: text },
          ],
          temperature: 0.0,
          max_tokens: 800,
        });
        result = fallback.choices[0].message.content?.trim() || result;
      } catch (fallbackErr) {
        console.error('Swiss German fallback translation failed:', fallbackErr);
      }
    }

    return result || text;
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

    // Use pre-translated data if available, otherwise fallback to original
    const translated = templates.map((t) => {
      if (t.translations) {
        try {
          const translations = JSON.parse(t.translations) as Record<string, { title: string; prompt: string }>;
          if (translations[lang]) {
            return { ...t, title: translations[lang].title, prompt: translations[lang].prompt };
          }
        } catch (e) {
          console.error('Error parsing translations:', e);
        }
      }
      // Fallback to original if translation not found
      return t;
    });

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

    // Generate translations for all supported languages in parallel
    console.log('Generating translations for all languages...');
    const translationPromises = SUPPORTED_LANGUAGES.map(async (lang) => {
      const [translatedTitle, translatedPrompt] = await Promise.all([
        translateText(title, lang),
        translateText(prompt, lang),
      ]);
      return [lang, { title: translatedTitle, prompt: translatedPrompt }] as const;
    });

    const translationResults = await Promise.all(translationPromises);
    const translations: Record<string, { title: string; prompt: string }> = {};
    translationResults.forEach(([lang, translation]) => {
      translations[lang] = translation;
    });

    const translationsJson = JSON.stringify(translations);

    const stmt = db.prepare(
      'INSERT INTO interview_templates (id, title, prompt, duration, translations) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, title, prompt, duration || 600, translationsJson);

    console.log('Template created with translations for all languages');
    return NextResponse.json({ id, title, prompt, duration: duration || 600, translations: translationsJson });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, prompt, duration } = body;

    if (!id || !title || !prompt) {
      return NextResponse.json({ error: 'ID, title and prompt are required' }, { status: 400 });
    }

    // Generate translations for all supported languages in parallel
    console.log('Regenerating translations for all languages...');
    const translationPromises = SUPPORTED_LANGUAGES.map(async (lang) => {
      const [translatedTitle, translatedPrompt] = await Promise.all([
        translateText(title, lang),
        translateText(prompt, lang),
      ]);
      return [lang, { title: translatedTitle, prompt: translatedPrompt }] as const;
    });

    const translationResults = await Promise.all(translationPromises);
    const translations: Record<string, { title: string; prompt: string }> = {};
    translationResults.forEach(([lang, translation]) => {
      translations[lang] = translation;
    });

    const translationsJson = JSON.stringify(translations);

    const stmt = db.prepare(
      'UPDATE interview_templates SET title = ?, prompt = ?, duration = ?, translations = ? WHERE id = ?'
    );
    stmt.run(title, prompt, duration || 600, translationsJson, id);

    console.log('Template updated with translations for all languages');
    return NextResponse.json({ id, title, prompt, duration: duration || 600, translations: translationsJson });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
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
