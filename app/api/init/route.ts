import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import db from '@/lib/db';
import { InterviewTemplate, Message } from '@/lib/types';

// Bedrock client and helper functions
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
  
  console.log(`Using Amazon Bedrock in region ${region}`);
  
  let client: BedrockRuntimeClient;
  
  // Check if using Bearer token authentication or Access Key authentication
  if (bearerToken) {
    console.log('Using Bearer token authentication for Bedrock');
    // Bearer token authentication - credentials are not used for signing
    client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: 'BEARER_TOKEN',
        secretAccessKey: '',
      },
    });
    
    // Add middleware to inject Bearer token into request headers
    client.middlewareStack.add(
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
  } else if (accessKeyId && secretAccessKey) {
    console.log('Using Access Key authentication for Bedrock');
    client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } else {
    throw new Error('Either AWS_BEARER_TOKEN_BEDROCK or (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) are required for Bedrock');
  }
  
  return client;
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
    
    // Handle inference profile model IDs (e.g., eu.anthropic.claude-sonnet-4-5-*)
    const isInferenceProfile = modelId.includes('.anthropic.claude');
    const isClaudeModel = modelId.startsWith('anthropic.claude') || isInferenceProfile;
    
    if (isClaudeModel) {
      // Claude models
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
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
          maxTokenCount: 300,
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
        max_gen_len: 300,
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
    
    // Check if it's a Claude model (including inference profiles)
    const isClaudeResponse = modelId.startsWith('anthropic.claude') || modelId.includes('.anthropic.claude');
    
    if (isClaudeResponse) {
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
    // Default to Sonnet 4.5 inference profile for EU region
    // If using Bearer token, you likely want to use inference profiles
    const defaultModel = process.env.AWS_BEARER_TOKEN_BEDROCK 
      ? 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0'
      : 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    return process.env.BEDROCK_MODEL_ID || defaultModel;
  } else if (provider === 'local') {
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
    const provider = process.env.LLM_PROVIDER;
    const modelName = getModelName();
    console.log(`Calling LLM model: ${modelName} in language: ${languageName}`);
    
    let greeting = '';
    let localizedTitle = template.title;
    
    if (provider === 'bedrock') {
      // Use Amazon Bedrock
      const bedrockClient = getBedrockClient();
      if (!bedrockClient) {
        throw new Error('Failed to initialize Bedrock client');
      }
      
      try {
        // Get initial greeting
        const greetingMessages: Message[] = [
          {
            role: 'system',
            content: `You are conducting an interview. ${template.prompt}\n\nREQUIREMENTS:\n- Respond exclusively in ${languageName}. Do not use any other language.\n- First message: Give a brief, friendly greeting in ${languageName} and ask the user to provide the following three items so the interview can start smoothly: their occupation, age, and the region where they live. Ask them clearly and concisely in one message. Do not start topic-specific questions yet.\n- After the user provides these profile details, proceed with the interview topic, asking focused questions based on the template and their answers.\n- Keep responses concise and conversational, asking one question at a time.`,
          },
          {
            role: 'user',
            content: 'Please start the interview.',
          },
        ];
        
        greeting = await callBedrockAPI(bedrockClient, modelName, greetingMessages, languageName);
        
        // Translate title
        try {
          const languageDisplay = languageNames[session.language] || 'English';
          const titleMessages: Message[] = [
            { role: 'system', content: `Translate the following title to ${languageDisplay}. Only return the translated text.` },
            { role: 'user', content: template.title },
          ];
          localizedTitle = await callBedrockAPI(bedrockClient, modelName, titleMessages, languageDisplay);
          if (!localizedTitle) {
            localizedTitle = template.title;
          }
        } catch (e) {
          console.warn('Title translation failed, fallback to original title');
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
      
      greeting = completion.choices[0].message.content || 'Hello! Thank you for participating in this interview. Let\'s begin.';

      // Optionally translate template.title to session language for UI consumption
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
    }
    
    if (!greeting) {
      greeting = 'Hello! Thank you for participating in this interview. Let\'s begin.';
    }

    // Save the greeting (no metadata for initial greeting as it's just text)
    const saveMsg = db.prepare(
      'INSERT INTO conversation_logs (session_id, role, content, metadata) VALUES (?, ?, ?, ?)'
    );
    const metadata = JSON.stringify({ type: 'text' });
    saveMsg.run(session_id, 'assistant', greeting, metadata);

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
