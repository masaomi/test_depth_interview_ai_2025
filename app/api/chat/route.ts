import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import db from '@/lib/db';
import { Message, InterviewTemplate } from '@/lib/types';

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
    const { session_id, message } = body;

    if (!session_id || !message) {
      return NextResponse.json({ error: 'Session ID and message are required' }, { status: 400 });
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

    // Get conversation history
    const historyStmt = db.prepare(
      'SELECT role, content FROM conversation_logs WHERE session_id = ? ORDER BY timestamp ASC'
    );
    const history = historyStmt.all(session_id) as Message[];

    // Save user message
    const saveUserMsg = db.prepare(
      'INSERT INTO conversation_logs (session_id, role, content) VALUES (?, ?, ?)'
    );
    saveUserMsg.run(session_id, 'user', message);

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

    // Build messages for OpenAI
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are conducting an interview. ${template.prompt}\n\nIMPORTANT: You must conduct the entire interview in ${languageName}. All your responses must be in ${languageName}.\n\nConduct the interview in a conversational manner. Ask follow-up questions based on the user's responses. Keep your responses concise and focused.`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    // Call LLM API
    const openai = getOpenAIClient();
    const modelName = getModelName();
    
    console.log(`Calling LLM model: ${modelName} in language: ${languageName}`);
    
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantMessage = completion.choices[0].message.content || 'I apologize, I did not understand. Could you please rephrase?';

    // Save assistant message
    const saveAssistantMsg = db.prepare(
      'INSERT INTO conversation_logs (session_id, role, content) VALUES (?, ?, ?)'
    );
    saveAssistantMsg.run(session_id, 'assistant', assistantMessage);

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const stmt = db.prepare(
      'SELECT role, content, timestamp FROM conversation_logs WHERE session_id = ? ORDER BY timestamp ASC'
    );
    const messages = stmt.all(session_id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
