import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';
import db from '@/lib/db';
import { Message, ConversationLog } from '@/lib/types';

// Bedrock client setup (reused from chat API)
function getBedrockClient(): BedrockRuntimeClient | null {
  const provider = process.env.LLM_PROVIDER;
  
  if (provider !== 'bedrock') {
    return null;
  }
  
  const region = process.env.AWS_REGION;
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!region) {
    throw new Error('AWS_REGION is required for Bedrock');
  }
  
  if (bearerToken) {
    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: 'BEARER_TOKEN',
        secretAccessKey: '',
      },
    });
  } else if (accessKeyId && secretAccessKey) {
    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } else {
    throw new Error('Either AWS_BEARER_TOKEN_BEDROCK or (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) are required for Bedrock');
  }
}

async function callBedrockForSummary(modelId: string, userPrompt: string): Promise<string> {
  const bedrockClient = getBedrockClient();
  if (!bedrockClient) {
    throw new Error('Bedrock client not initialized');
  }
  
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (bearerToken) {
    bedrockClient.middlewareStack.add(
      (next: any) => async (args: any) => {
        if (args.request && args.request.headers) {
          args.request.headers['Authorization'] = `Bearer ${bearerToken}`;
        }
        return next(args);
      },
      {
        step: 'build',
        name: 'addBearerToken',
        priority: 'high',
      }
    );
  }
  
  const isClaudeModel = modelId.startsWith('anthropic.claude') || modelId.includes('.anthropic.claude');
  
  if (!isClaudeModel) {
    throw new Error('Only Claude models are currently supported for Bedrock');
  }
  
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1500,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }],
      },
    ],
  };
  
  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  if (responseBody.content && Array.isArray(responseBody.content)) {
    return responseBody.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('');
  }
  
  return '';
}

function getOpenAIClient() {
  const provider = process.env.LLM_PROVIDER;

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
  
  if (provider === 'bedrock') {
    const defaultModel = process.env.AWS_BEARER_TOKEN_BEDROCK 
      ? 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0'
      : 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    return process.env.BEDROCK_MODEL_ID || defaultModel;
  } else if (provider === 'local') {
    return process.env.LOCAL_LLM_MODEL || 'gpt-oss20B';
  }
  return process.env.OPENAI_MODEL || 'gpt-4';
}

async function generateSummary(
  sessionId: string,
  templateTitle: string,
  language: string,
  conversations: ConversationLog[]
): Promise<string> {
  const provider = process.env.LLM_PROVIDER;
  const modelName = getModelName();
  
  // Get language name for prompt
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
  const languageName = languageNames[language] || 'English';
  
  // Format conversation for analysis
  const conversationText = conversations
    .filter(log => log.role !== 'system')
    .map(log => `${log.role.toUpperCase()}: ${log.content}`)
    .join('\n\n');
  
  const summaryPrompt = `You are an expert interviewer analyzing a completed interview session.

Interview Title: ${templateTitle}
Language: ${languageName}
Session ID: ${sessionId}

CONVERSATION LOG:
${conversationText}

Please create a comprehensive summary of this interview IN ${languageName}. Include:

1. **Overview**: Brief summary of the interview (2-3 sentences)
2. **Key Points**: Main topics discussed and important insights (3-5 bullet points)
3. **User Profile**: Summary of the interviewee's background and context if mentioned
4. **Notable Responses**: Highlight any particularly interesting or significant responses

Format your response in clear, professional ${languageName}. Structure it with proper headings and bullet points for readability.`;

  try {
    let summary = '';
    
    if (provider === 'bedrock') {
      summary = await callBedrockForSummary(modelName, summaryPrompt);
    } else {
      const openai = getOpenAIClient();
      const isGpt5 = modelName.startsWith('gpt-5');
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: summaryPrompt }],
        ...(isGpt5 ? {} : { temperature: 0.3 }),
        ...(isGpt5 ? { max_completion_tokens: 1500 } : { max_tokens: 1500 }),
      });
      summary = completion.choices[0]?.message?.content?.trim() || '';
    }
    
    if (!summary) {
      throw new Error('Empty summary generated');
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get session details
    const sessionStmt = db.prepare('SELECT * FROM interview_sessions WHERE id = ?');
    const session = sessionStmt.get(sessionId) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Check if summary already exists
    if (session.summary) {
      return NextResponse.json({ summary: session.summary });
    }
    
    // Get template details
    const templateStmt = db.prepare('SELECT * FROM interview_templates WHERE id = ?');
    const template = templateStmt.get(session.template_id) as any;
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Get conversation logs
    const logsStmt = db.prepare(
      'SELECT role, content, timestamp FROM conversation_logs WHERE session_id = ? ORDER BY timestamp ASC'
    );
    const logs = logsStmt.all(sessionId) as ConversationLog[];
    
    if (logs.length === 0) {
      return NextResponse.json({ error: 'No conversation logs found' }, { status: 404 });
    }
    
    // Generate summary
    const summary = await generateSummary(
      sessionId,
      template.title,
      session.language,
      logs
    );
    
    // Save summary to database
    const updateStmt = db.prepare('UPDATE interview_sessions SET summary = ? WHERE id = ?');
    updateStmt.run(summary, sessionId);
    
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get session with summary
    const sessionStmt = db.prepare('SELECT summary FROM interview_sessions WHERE id = ?');
    const session = sessionStmt.get(sessionId) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (!session.summary) {
      return NextResponse.json({ error: 'Summary not generated yet' }, { status: 404 });
    }
    
    return NextResponse.json({ summary: session.summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}

