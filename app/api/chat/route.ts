import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
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

// Robustly extract the first valid-looking JSON object from arbitrary text
function extractFirstJsonObject(text: string): string | null {
  if (!text) return null;
  // Fast path: code fence with json
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  // Brace matching
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

async function repairResponseToJson(openai: OpenAI, modelName: string, raw: string): Promise<AIResponse | null> {
  try {
    const prompt = `Convert the following assistant output into STRICT VALID JSON matching this exact schema keys and types.
Schema:
{
  "question": string,
  "type": "text" | "single_choice" | "multi_choice" | "scale",
  "options"?: string[],
  "scaleMin"?: number,
  "scaleMax"?: number,
  "scaleMinLabel"?: string,
  "scaleMaxLabel"?: string
}

Rules:
- Output ONLY the JSON object, no code fences, no commentary.
- Use double quotes for all keys and strings.
- No trailing commas.

CONTENT:
${raw}`;

    const isGpt5 = modelName.startsWith('gpt-5');
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }] as any,
      ...(isGpt5 ? { max_completion_tokens: 400 } : { max_tokens: 400, temperature: 0 }),
    });
    const repaired = completion.choices[0]?.message?.content?.trim() || '';
    const json = extractFirstJsonObject(repaired) || repaired;
    return JSON.parse(json) as AIResponse;
  } catch (e) {
    console.warn('JSON repair attempt failed:', e);
    return null;
  }
}

// Bedrock client and helper functions
function getBedrockClient(): BedrockRuntimeClient | null {
  const provider = process.env.LLM_PROVIDER;
  
  if (provider !== 'bedrock') {
    return null;
  }
  
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are required for Bedrock');
  }
  
  console.log(`Using Amazon Bedrock in region ${region}`);
  
  return new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

async function callBedrockAPI(
  client: BedrockRuntimeClient,
  modelId: string,
  messages: Message[],
  languageName: string
): Promise<string> {
  try {
    // Convert messages to Bedrock format
    // For Claude models, we need to separate system messages from conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
    
    // Build messages in Anthropic Claude format (Bedrock messages API)
    const claudeMessages = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: [
        {
          type: 'text',
          text: msg.content,
        },
      ],
    }));
    
    // Prepare request body based on model type
    let requestBody: any;
    
    if (modelId.startsWith('anthropic.claude')) {
      // Claude models
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 800,
        temperature: 0.7,
        messages: claudeMessages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
      };
    } else if (modelId.startsWith('amazon.titan')) {
      // Amazon Titan models
      const fullPrompt = [
        systemPrompt,
        ...conversationMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      ].filter(Boolean).join('\n\n');
      
      requestBody = {
        inputText: fullPrompt,
        textGenerationConfig: {
          maxTokenCount: 800,
          temperature: 0.7,
        },
      };
    } else if (modelId.startsWith('meta.llama')) {
      // Meta Llama models
      const fullPrompt = [
        systemPrompt,
        ...conversationMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      ].filter(Boolean).join('\n\n');
      
      requestBody = {
        prompt: fullPrompt,
        max_gen_len: 800,
        temperature: 0.7,
      };
    } else {
      throw new Error(`Unsupported Bedrock model: ${modelId}`);
    }
    
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });
    
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract content based on model type
    let content = '';
    
    if (modelId.startsWith('anthropic.claude')) {
      // Claude response format
      if (responseBody.content && Array.isArray(responseBody.content)) {
        content = responseBody.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('');
      } else if (responseBody.completion) {
        content = responseBody.completion;
      }
    } else if (modelId.startsWith('amazon.titan')) {
      // Titan response format
      if (responseBody.results && Array.isArray(responseBody.results)) {
        content = responseBody.results[0]?.outputText || '';
      }
    } else if (modelId.startsWith('meta.llama')) {
      // Llama response format
      content = responseBody.generation || '';
    }
    
    return content.trim();
  } catch (error) {
    console.error('Bedrock API error:', error);
    throw error;
  }
}

async function repairResponseToJsonBedrock(
  client: BedrockRuntimeClient,
  modelId: string,
  raw: string
): Promise<AIResponse | null> {
  try {
    const prompt = `Convert the following assistant output into STRICT VALID JSON matching this exact schema keys and types.
Schema:
{
  "question": string,
  "type": "text" | "single_choice" | "multi_choice" | "scale",
  "options"?: string[],
  "scaleMin"?: number,
  "scaleMax"?: number,
  "scaleMinLabel"?: string,
  "scaleMaxLabel"?: string
}

Rules:
- Output ONLY the JSON object, no code fences, no commentary.
- Use double quotes for all keys and strings.
- No trailing commas.

CONTENT:
${raw}`;

    const repaired = await callBedrockAPI(
      client,
      modelId,
      [{ role: 'user', content: prompt }],
      'English'
    );
    
    const json = extractFirstJsonObject(repaired) || repaired;
    return JSON.parse(json) as AIResponse;
  } catch (e) {
    console.warn('JSON repair attempt failed:', e);
    return null;
  }
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
  
  if (provider === 'bedrock') {
    return process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  } else if (provider === 'local') {
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
        content: `You are conducting an interview. ${template.prompt}\n\nREQUIREMENTS:\n- Respond exclusively in ${languageName}.\n- If the user's occupation, age, and region have not been collected yet, ask for them first in one concise message in ${languageName}.\n- After the profile is collected, proceed with topic-specific questions, one question at a time, concise and conversational.\n- Always adapt follow-up questions based on the user's answers.\n\nRESPONSE FORMAT (STRICT):\nReturn a single JSON object with this schema:\n{\n  "question": "your question text in ${languageName}",\n  "type": "text" | "single_choice" | "multi_choice" | "scale",\n  "options": ["option1", "option2", ...],\n  "scaleMin": 1,\n  "scaleMax": 5,\n  "scaleMinLabel": "...",\n  "scaleMaxLabel": "..."\n}\nRules:\n- Output ONLY the JSON object.\n- Do NOT include code fences (no triple backticks).\n- Use double quotes for all keys/strings.\n- No comments, no preface, no trailing commas.`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    // Call LLM API
    const provider = process.env.LLM_PROVIDER;
    const modelName = getModelName();
    let rawResponse = '';
    
    console.log(`Calling LLM model: ${modelName} in language: ${languageName}`);
    
    if (provider === 'bedrock') {
      // Use Amazon Bedrock
      const bedrockClient = getBedrockClient();
      if (!bedrockClient) {
        throw new Error('Failed to initialize Bedrock client');
      }
      
      try {
        rawResponse = await callBedrockAPI(bedrockClient, modelName, messages, languageName);
        
        // Bedrock retry with simplified prompt if empty response
        if (!rawResponse) {
          console.warn('Bedrock returned empty content, retrying with simplified prompt');
          const simplifiedMessages: Message[] = [
            {
              role: 'system',
              content:
                'You are a helpful interviewer. Reply in the user\'s language. Keep it concise and ask one clear follow-up question. Return a JSON object with format: {"question": "your question", "type": "text"}',
            },
            { role: 'user', content: message },
          ];
          rawResponse = await callBedrockAPI(bedrockClient, modelName, simplifiedMessages, languageName);
        }
      } catch (error) {
        console.error('Bedrock API call failed:', error);
        throw error;
      }
    } else {
      // Use OpenAI or Local LLM
      const openai = getOpenAIClient();
      const isGpt5 = modelName.startsWith('gpt-5');
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: messages as any,
        ...(isGpt5 ? {} : { temperature: 0.7 }),
        ...(isGpt5 ? { max_completion_tokens: 800 } : { max_tokens: 800 }),
      });
      rawResponse = completion.choices[0]?.message?.content?.trim() || '';

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
    }

    if (!rawResponse) {
      rawResponse = '{"question": "I apologize, I did not understand. Could you please rephrase?", "type": "text"}';
    }

    // Parse AI response as JSON
    let aiResponse: AIResponse;
    let questionMetadata: QuestionMetadata;
    
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const extracted = extractFirstJsonObject(rawResponse);
      const jsonString = extracted || rawResponse;
      aiResponse = JSON.parse(jsonString) as AIResponse;
      
      // Validate and set defaults
      if (!aiResponse.question || !aiResponse.type) {
        throw new Error('Invalid AI response structure');
      }
      
      // Build normalized question metadata (handles synonyms and defaults)
      questionMetadata = normalizeQuestionMetadata(aiResponse as any);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, attempting repair:', parseError);
      // Attempt a repair call to coerce into strict JSON
      let repaired: AIResponse | null = null;
      try {
        if (provider === 'bedrock') {
          const bedrockClient = getBedrockClient();
          if (bedrockClient) {
            repaired = await repairResponseToJsonBedrock(bedrockClient, modelName, rawResponse);
          }
        } else {
          const openaiForRepair = getOpenAIClient();
          repaired = await repairResponseToJson(openaiForRepair, modelName, rawResponse);
        }
      } catch {}

      if (repaired && repaired.question && repaired.type) {
        aiResponse = repaired;
        questionMetadata = normalizeQuestionMetadata(aiResponse as any);
      } else {
        console.warn('JSON repair failed; falling back to text');
        // Fallback: treat as plain text
        aiResponse = {
          question: rawResponse,
          type: 'text',
        };
        questionMetadata = { type: 'text' };
      }
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
