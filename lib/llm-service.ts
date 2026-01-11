import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';
import { Message } from '@/lib/types';

// Bedrock client setup
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

async function callBedrock(
  client: BedrockRuntimeClient,
  modelId: string,
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  // Add middleware for bearer token if needed
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (bearerToken) {
    // Note: Middleware addition should be idempotent or done once. 
    // Here we assume client is fresh or middleware stack handles dupes gracefully?
    // Actually, middleware stack might grow if we reuse client. 
    // For this helper, we get a fresh client each time or assume it's fine.
    // The previous implementation added it on client creation logic in the file scope or inside the getter.
    // We'll add it here.
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
  }

  // Convert messages to Bedrock Claude format
  // Filter out system messages and empty content
  const conversationMessages = messages.filter(m => m.role !== 'system' && m.content && m.content.trim() !== '');
  
  // Ensure we have at least one message
  if (conversationMessages.length === 0) {
    conversationMessages.push({ role: 'user', content: 'Please respond.' });
  }
  
  const claudeMessages = conversationMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: [
      {
        type: 'text',
        text: msg.content.trim() || 'Continue.',
      },
    ],
  }));

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    temperature: 0.7,
    messages: claudeMessages,
    ...(systemPrompt ? { system: systemPrompt } : {}),
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
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

export function getModelName() {
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

export async function callLLM(messages: Message[]): Promise<string> {
  const provider = process.env.LLM_PROVIDER;
  const modelName = getModelName();
  
  const systemMessages = messages.filter(m => m.role === 'system');
  const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

  if (provider === 'bedrock') {
    const client = getBedrockClient();
    if (!client) throw new Error('Bedrock client initialization failed');
    
    return await callBedrock(client, modelName, messages, systemPrompt);
  } else {
    const openai = getOpenAIClient();
    const isGpt5 = modelName.startsWith('gpt-5');
    
    // Filter out system messages from messages array if passing to OpenAI, 
    // but usually OpenAI accepts system messages in the array.
    // However, some local models or specific configs might prefer it differently.
    // Standard OpenAI API handles system messages fine.
    
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      ...(isGpt5 ? {} : { temperature: 0.7 }),
      ...(isGpt5 ? { max_completion_tokens: 1000 } : { max_tokens: 1000 }),
    });
    
    return completion.choices[0]?.message?.content?.trim() || '';
  }
}
