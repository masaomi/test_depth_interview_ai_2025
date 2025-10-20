import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import db from '@/lib/db';
import { Message, InterviewTemplate, AIResponse, QuestionMetadata, ResponseMetadata } from '@/lib/types';

// Normalize helpers to make LLM outputs robust against minor format differences
function normalizeQuestionType(rawType: unknown): QuestionMetadata['type'] {
  const t = String(rawType || '').toLowerCase().replace(/[^a-z]/g, '');
  if (t === 'single' || t === 'radio' || t === 'singlechoice') return 'single_choice';
  if (t === 'multi' || t === 'multiplechoice' || t === 'checkbox' || t === 'checkboxes') return 'multi_choice';
  if (t === 'likert' || t === 'rating' || t === 'scale' || t === 'slider' || t === 'scale15') return 'scale';
  return 'text';
}

function coerceStringArray(value: any): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : (v && typeof v.label === 'string' ? v.label : String(v || ''))))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return undefined;
}

function coerceNumber(n: any): number | undefined {
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeQuestionMetadata(ai: Partial<AIResponse>): QuestionMetadata {
  const type = normalizeQuestionType(ai.type);
  if (type === 'scale') {
    const min = coerceNumber((ai as any).scaleMin) ?? 1;
    const max = coerceNumber((ai as any).scaleMax) ?? 5;
    const normalizedMin = Math.min(min, max);
    const normalizedMax = Math.max(min, max);
    return {
      type: 'scale',
      scaleMin: normalizedMin,
      scaleMax: normalizedMax,
      ...(ai as any).scaleMinLabel ? { scaleMinLabel: String((ai as any).scaleMinLabel) } : {},
      ...(ai as any).scaleMaxLabel ? { scaleMaxLabel: String((ai as any).scaleMaxLabel) } : {},
    };
  }
  if (type === 'single_choice' || type === 'multi_choice') {
    const options = coerceStringArray((ai as any).options) || [];
    return { type, options };
  }
  return { type: 'text' };
}

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
    const { session_id, message, metadata } = body;

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

    // Save user message with metadata
    const saveUserMsg = db.prepare(
      'INSERT INTO conversation_logs (session_id, role, content, metadata) VALUES (?, ?, ?, ?)'
    );
    const userMetadata = metadata ? JSON.stringify(metadata) : null;
    saveUserMsg.run(session_id, 'user', message, userMetadata);

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

    // Build messages for OpenAI with JSON response instructions
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are conducting an interview. ${template.prompt}\n\nREQUIREMENTS:\n- Respond exclusively in ${languageName}.\n- If the user's occupation, age, and region have not been collected yet, ask for them first in one concise message in ${languageName}.\n- After the profile is collected, proceed with topic-specific questions, one question at a time, concise and conversational.\n- Always adapt follow-up questions based on the user's answers.\n\nRESPONSE FORMAT:\nYou MUST respond with a valid JSON object with the following structure:\n{\n  "question": "your question text in ${languageName}",\n  "type": "text" | "single_choice" | "multi_choice" | "scale",\n  "options": ["option1", "option2", ...] (only for single_choice or multi_choice),\n  "scaleMin": 1 (only for scale, default 1),\n  "scaleMax": 5 (only for scale, default 5),\n  "scaleMinLabel": "label for minimum" (optional, for scale),\n  "scaleMaxLabel": "label for maximum" (optional, for scale)\n}\n\nQUESTION TYPE SELECTION:\n- Use "text" for open-ended questions requiring detailed responses\n- Use "single_choice" when there are clear mutually exclusive options (provide 2-5 options)\n- Use "multi_choice" when multiple selections are valid (provide 2-7 options)\n- Use "scale" for rating, agreement level, or satisfaction questions (1-5 Likert scale)\n\nIMPORTANT: Return ONLY the JSON object, no additional text before or after.`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    // Call LLM API
    const openai = getOpenAIClient();
    const modelName = getModelName();
    
    console.log(`Calling LLM model: ${modelName} in language: ${languageName}`);
    
    const isGpt5 = modelName.startsWith('gpt-5');
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      ...(isGpt5 ? {} : { temperature: 0.7 }),
      ...(isGpt5 ? { max_completion_tokens: 800 } : { max_tokens: 800 }),
    });
    let rawResponse = completion.choices[0]?.message?.content?.trim() || '';

    // GPT-5 sometimes returns empty content; do a simplified retry without history
    if (!rawResponse && isGpt5) {
      try {
        console.warn('GPT-5 returned empty content, retrying with simplified prompt');
        const simplified = await openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful interviewer. Reply in the user\'s language. Keep it concise and ask one clear follow-up question. Return a JSON object with format: {"question": "your question", "type": "text"}',
            },
            { role: 'user', content: message },
          ] as any,
          ...(isGpt5 ? { max_completion_tokens: 300 } : { max_tokens: 300, temperature: 0.7 }),
        });
        rawResponse = simplified.choices[0]?.message?.content?.trim() || '';
      } catch (e) {
        console.warn('GPT-5 simplified retry failed');
      }
    }

    if (!rawResponse) {
      rawResponse = '{"question": "I apologize, I did not understand. Could you please rephrase?", "type": "text"}';
    }

    // Parse AI response as JSON
    let aiResponse: AIResponse;
    let questionMetadata: QuestionMetadata;
    
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawResponse;
      aiResponse = JSON.parse(jsonString) as AIResponse;
      
      // Validate and set defaults
      if (!aiResponse.question || !aiResponse.type) {
        throw new Error('Invalid AI response structure');
      }
      
      // Build normalized question metadata (handles synonyms and defaults)
      questionMetadata = normalizeQuestionMetadata(aiResponse as any);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, falling back to text type:', parseError);
      // Fallback: treat as plain text
      aiResponse = {
        question: rawResponse,
        type: 'text',
      };
      questionMetadata = { type: 'text' };
    }

    // Save assistant message with metadata
    const saveAssistantMsg = db.prepare(
      'INSERT INTO conversation_logs (session_id, role, content, metadata) VALUES (?, ?, ?, ?)'
    );
    const assistantMetadata = JSON.stringify(questionMetadata);
    saveAssistantMsg.run(session_id, 'assistant', aiResponse.question, assistantMetadata);

    return NextResponse.json({ 
      message: aiResponse.question,
      metadata: questionMetadata
    });
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
      'SELECT role, content, metadata, timestamp FROM conversation_logs WHERE session_id = ? ORDER BY timestamp ASC'
    );
    const messages = stmt.all(session_id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
