import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import db from '@/lib/db';
import { InterviewTemplate } from '@/lib/types';

function getOpenAIClient() {
  const provider = process.env.LLM_PROVIDER;

  // Priority: LLM_PROVIDER=local > OPENAI_API_KEY
  if (provider === 'local') {
    // Local LLM server (Ollama, LM Studio, etc.)
    const baseURL = process.env.LOCAL_LLM_BASE_URL;
    const apiKey = process.env.LOCAL_LLM_API_KEY || 'dummy';

    if (!baseURL) {
      throw new Error('LOCAL_LLM_BASE_URL environment variable is not set');
    }

    console.log(`Using local LLM at ${baseURL}`);
    return new OpenAI({
      baseURL,
      apiKey,
    });
  } else {
    // OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    console.log('Using OpenAI API');
    return new OpenAI({ apiKey });
  }
}

function getModelName() {
  const provider = process.env.LLM_PROVIDER;
  if (provider === 'local') {
    return process.env.LOCAL_LLM_MODEL || 'gpt-oss20B';
  } else {
    return process.env.OPENAI_MODEL || 'gpt-4';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session details
    const sessionStmt = db.prepare('SELECT * FROM interview_sessions WHERE id = ?');
    const session = sessionStmt.get(session_id) as any;

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get template
    const templateStmt = db.prepare('SELECT * FROM interview_templates WHERE id = ?');
    const template = templateStmt.get(session.template_id) as InterviewTemplate;

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get language name for the prompt
    const languageNames: Record<string, string> = {
      en: 'English',
      ja: 'Japanese',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      zh: 'Chinese',
    };
    const languageName = languageNames[session.language] || 'English';

    // Create initial greeting using configured LLM
    const openai = getOpenAIClient();
    const modelName = getModelName();
    console.log(`Calling LLM model: ${modelName} in language: ${languageName}`);
    const isGpt5 = modelName.startsWith('gpt-5');
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: `You are conducting an interview. ${template.prompt}\n\nREQUIREMENTS:\n- Respond exclusively in ${languageName}. Do not use any other language.\n- First message: Give a brief, friendly greeting in ${languageName} and ask the user to provide the following three items so the interview can start smoothly: their occupation, age, and the region where they live. Ask them clearly and concisely in one message. Do not start topic-specific questions yet.\n- After the user provides these profile details, proceed with the interview topic, asking focused questions based on the template and their answers.\n- Keep responses concise and conversational, asking one question at a time.`,
        },
        {
          role: 'user',
          content: 'Please start the interview.',
        },
      ],
      ...(isGpt5 ? {} : { temperature: 0.7 }),
      ...(isGpt5 ? { max_completion_tokens: 300 } : { max_tokens: 300 }),
    });

    // Optionally translate template.title to session language for UI consumption
    let localizedTitle = template.title;
    try {
      const languageDisplay = languageNames[session.language] || 'English';
      const completionTitle = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: `Translate the following title to ${languageDisplay}. Only return the translated text.` },
          { role: 'user', content: template.title },
        ],
        ...(isGpt5 ? {} : { temperature: 0.0 }),
        ...(isGpt5 ? { max_completion_tokens: 60 } : { max_tokens: 60 }),
      });
      localizedTitle = completionTitle.choices[0].message.content?.trim() || template.title;
    } catch (e) {
      console.warn('Title translation failed, fallback to original title');
    }

    const greeting = completion.choices[0].message.content || 'Hello! Thank you for participating in this interview. Let\'s begin.';

    // Save the greeting
    const saveMsg = db.prepare(
      'INSERT INTO conversation_logs (session_id, role, content) VALUES (?, ?, ?)'
    );
    saveMsg.run(session_id, 'assistant', greeting);

    return NextResponse.json({ 
      message: greeting,
      template: {
        title: localizedTitle,
        duration: template.duration
      }
    });
  } catch (error) {
    console.error('Error initializing interview:', error);
    return NextResponse.json({ error: 'Failed to initialize interview' }, { status: 500 });
  }
}
