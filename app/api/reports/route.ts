import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

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

async function callBedrockForAnalysis(modelId: string, userPrompt: string, maxTokens: number = 2000): Promise<string> {
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
    throw new Error('Only Claude models are currently supported for Bedrock in reports API');
  }
  
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
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
    
    return new OpenAI({ 
      baseURL,
      apiKey,
    });
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
  } else {
    return process.env.OPENAI_MODEL || 'gpt-4';
  }
}

interface AnalysisResult {
  executive_summary: string;
  key_findings: string[];
  segment_analysis: string;
  recommended_actions: string[];
}

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

function safeParseJson<T = any>(text: string): T | null {
  try {
    return JSON.parse(extractJsonBlock(text));
  } catch {
    return null;
  }
}

async function analyzeInterviewWithLLM(
  templateTitle: string,
  conversations: Array<{ session_id: string; messages: Array<{ role: string; content: string }> }>
): Promise<AnalysisResult> {
  const provider = process.env.LLM_PROVIDER;
  const modelName = getModelName();

  // Prepare conversation data for analysis
  const conversationSummaries = conversations.map((conv, idx) => {
    const messages = conv.messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    return `\n--- Session ${idx + 1} (${conv.session_id}) ---\n${messages}`;
  }).join('\n\n');

  const analysisPrompt = `You are an expert qualitative researcher analyzing interview data.

Interview Topic: ${templateTitle}
Number of Sessions: ${conversations.length}

Interview Conversations:
${conversationSummaries}

Please analyze these interviews IN ENGLISH and provide a structured report in JSON format with the following fields:
1. executive_summary: A concise 2-3 paragraph summary of the overall findings
2. key_findings: An array of 4-6 key discoveries or insights
3. segment_analysis: A paragraph analyzing trends across different user segments (if identifiable)
4. recommended_actions: An array of 3-5 actionable recommendations based on the findings

Respond ONLY with valid JSON in this exact format:
{
  "executive_summary": "string",
  "key_findings": ["string", "string", ...],
  "segment_analysis": "string",
  "recommended_actions": ["string", "string", ...]
}`;

  try {
    let responseText = '';
    
    if (provider === 'bedrock') {
      responseText = await callBedrockForAnalysis(modelName, analysisPrompt, 2000);
    } else {
      const openai = getOpenAIClient();
      const isGpt5 = modelName.startsWith('gpt-5');
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
        ...(isGpt5 ? {} : { temperature: 0.3 }),
        ...(isGpt5 ? { max_completion_tokens: 2000 } : { max_tokens: 2000 }),
      });
      responseText = completion.choices[0]?.message?.content?.trim() || '';
    }

    let analysis = safeParseJson<AnalysisResult>(responseText);

    if (!analysis) {
      // Repair attempt: ask model to fix to strict JSON
      const repairPrompt = `Convert the following content into STRICT, VALID JSON matching this schema keys: {executive_summary: string, key_findings: string[], segment_analysis: string, recommended_actions: string[]}. Output JSON only with no code fences, no commentary.\n\nCONTENT:\n${responseText}`;
      
      if (provider === 'bedrock') {
        const repairedText = await callBedrockForAnalysis(modelName, repairPrompt, 1000);
        analysis = safeParseJson<AnalysisResult>(repairedText);
      } else {
        const openai = getOpenAIClient();
        const repaired = await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: repairPrompt }] as any,
          ...(modelName.startsWith('gpt-5') ? { max_completion_tokens: 1000 } : { max_tokens: 1000, temperature: 0 }),
        });
        const repairedText = repaired.choices[0]?.message?.content?.trim() || '';
        analysis = safeParseJson<AnalysisResult>(repairedText);
      }
    }

    if (!analysis) {
      throw new Error('Failed to parse analysis JSON');
    }
    return analysis;
  } catch (error) {
    console.error('Error analyzing interviews with LLM:', error);
    // Return default values if LLM analysis fails
    return {
      executive_summary: `Analysis of ${conversations.length} interview sessions for "${templateTitle}". Due to processing limitations, detailed analysis is not available at this time.`,
      key_findings: [
        `Total of ${conversations.length} sessions were conducted`,
        'Detailed findings require manual review'
      ],
      segment_analysis: 'Segment analysis not available',
      recommended_actions: [
        'Review individual sessions for detailed insights',
        'Consider conducting follow-up interviews'
      ]
    };
  }
}

async function translateAnalysisToLanguage(
  analysis: AnalysisResult,
  targetLanguage: string
): Promise<AnalysisResult> {
  const provider = process.env.LLM_PROVIDER;
  const modelName = getModelName();

  const languageNames: Record<string, string> = {
    ja: 'Japanese',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    it: 'Italian',
    rm: 'Romansh',
    gsw: 'Swiss German'
  };

  const targetLanguageName = languageNames[targetLanguage] || targetLanguage;

  const translationPrompt = `Translate the following interview analysis report from English to ${targetLanguageName}.
Maintain the exact JSON structure and translate all text content accurately while preserving the professional tone and meaning.

Original English Report:
${JSON.stringify(analysis, null, 2)}

Respond ONLY with the translated JSON in the same format:
{
  "executive_summary": "translated summary",
  "key_findings": ["translated finding 1", "translated finding 2", ...],
  "segment_analysis": "translated analysis",
  "recommended_actions": ["translated action 1", "translated action 2", ...]
}`;

  try {
    let responseText = '';
    
    if (provider === 'bedrock') {
      responseText = await callBedrockForAnalysis(modelName, translationPrompt, 2500);
    } else {
      const openai = getOpenAIClient();
      const isGpt5 = modelName.startsWith('gpt-5');
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: translationPrompt }
        ],
        ...(isGpt5 ? {} : { temperature: 0.3 }),
        ...(isGpt5 ? { max_completion_tokens: 2500 } : { max_tokens: 2500 }),
      });
      responseText = completion.choices[0]?.message?.content?.trim() || '';
    }

    let translated = safeParseJson<AnalysisResult>(responseText);

    if (!translated) {
      // Repair attempt
      const repairPrompt = `Fix the following into STRICT VALID JSON (no code fences, no comments) preserving meaning. Keys must be: executive_summary (string), key_findings (string array), segment_analysis (string), recommended_actions (string array).\n\nCONTENT:\n${responseText}`;
      
      if (provider === 'bedrock') {
        const repairedText = await callBedrockForAnalysis(modelName, repairPrompt, 1000);
        translated = safeParseJson<AnalysisResult>(repairedText);
      } else {
        const openai = getOpenAIClient();
        const repaired = await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: repairPrompt }] as any,
          ...(modelName.startsWith('gpt-5') ? { max_completion_tokens: 1000 } : { max_tokens: 1000, temperature: 0 }),
        });
        const repairedText = repaired.choices[0]?.message?.content?.trim() || '';
        translated = safeParseJson<AnalysisResult>(repairedText);
      }
    }

    if (!translated) {
      console.warn(`JSON repair failed for language ${targetLanguage}; falling back to English.`);
      return analysis; // fallback to English analysis
    }
    return translated;
  } catch (error) {
    console.warn(`Error translating to ${targetLanguage}:`, error);
    // Return original if translation fails
    return analysis;
  }
}

export async function POST(request: NextRequest) {
  const aggregationId = randomUUID();
  
  try {
    const modelName = getModelName();

    // Get all templates
    const templatesStmt = db.prepare('SELECT * FROM interview_templates ORDER BY created_at DESC');
    const templates = templatesStmt.all() as Array<{ id: string; title: string }>;

    // Get all sessions
    const allSessionsStmt = db.prepare('SELECT COUNT(*) as count FROM interview_sessions');
    const totalSessions = (allSessionsStmt.get() as any).count;

    // Create aggregation record
    const createAggregation = db.prepare(
      'INSERT INTO report_aggregations (id, llm_model, total_sessions, status) VALUES (?, ?, ?, ?)'
    );
    createAggregation.run(aggregationId, modelName, totalSessions, 'processing');

    // Process each template
    const runAggregation = db.transaction((work: () => void) => work());

    for (const template of templates) {
      // Get session statistics for this template
      const sessionsStmt = db.prepare(`
        SELECT 
          id,
          status,
          started_at,
          ended_at
        FROM interview_sessions 
        WHERE template_id = ?
        ORDER BY started_at DESC
      `);
      const sessions = sessionsStmt.all(template.id) as Array<{
        id: string;
        status: string;
        started_at: string;
        ended_at?: string;
      }>;

      const totalInterviews = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const inProgressSessions = sessions.filter(s => s.status === 'active' || s.status === 'extended');
      
      // Calculate total messages
      const messagesStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM conversation_logs
        WHERE session_id IN (SELECT id FROM interview_sessions WHERE template_id = ?)
      `);
      const totalMessages = (messagesStmt.get(template.id) as any).count;

      // Calculate average duration for completed sessions
      let avgDuration = '0分';
      let avgDurationSeconds: number | null = null;
      if (completedSessions.length > 0) {
        const durations = completedSessions
          .filter(s => s.ended_at)
          .map(s => {
            const start = new Date(s.started_at).getTime();
            const end = new Date(s.ended_at!).getTime();
            return Math.max(0, Math.floor((end - start) / 1000)); // seconds
          });
        
        if (durations.length > 0) {
          avgDurationSeconds = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
          const avgMinutes = Math.round((avgDurationSeconds || 0) / 60);
          avgDuration = `${avgMinutes}分`;
        }
      }

      // Get last conducted date
      const lastConducted = sessions.length > 0 ? sessions[0].started_at : null;

      // Get conversations for completed sessions for LLM analysis
      let englishAnalysis: AnalysisResult | null = null;

      if (completedSessions.length > 0) {
        // Limit sessions/messages to control token usage
        const maxSessions = Number(process.env.REPORT_MAX_SESSIONS || '10');
        const maxMessages = Number(process.env.REPORT_MAX_MESSAGES || '30');
        const maxChars = Number(process.env.REPORT_MAX_CHARS || '2000');
        const sessionsToAnalyze = completedSessions.slice(0, Math.max(1, maxSessions));
        
        const conversations = sessionsToAnalyze.map(session => {
          const messagesStmt = db.prepare(`
            SELECT role, content
            FROM conversation_logs
            WHERE session_id = ?
            ORDER BY timestamp ASC
          `);
          const messagesFull = messagesStmt.all(session.id) as Array<{ role: string; content: string }>;
          const trimmed = (messagesFull.length > maxMessages
            ? messagesFull.slice(messagesFull.length - maxMessages)
            : messagesFull
          ).map(m => ({ role: m.role, content: (m.content || '').slice(0, maxChars) }));
          
          return {
            session_id: session.id,
            messages: trimmed
          };
        });

        // Analyze with LLM in English (master version)
        try {
          englishAnalysis = await analyzeInterviewWithLLM(template.title, conversations);
        } catch (error) {
          console.error(`Error analyzing template ${template.id}:`, error);
        }
      }

      // Define all target languages
      const languages = ['en', 'ja', 'es', 'fr', 'de', 'zh', 'it', 'rm', 'gsw'];
      
      // Prepare insert statement
      const insertDetail = db.prepare(`
        INSERT INTO report_details (
          aggregation_id,
          template_id,
          template_title,
          language,
          total_interviews,
          completed_interviews,
          in_progress_interviews,
          total_messages,
          avg_duration,
          avg_duration_seconds,
          last_conducted_at,
          executive_summary,
          key_findings,
          segment_analysis,
          recommended_actions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Save English version (master) inside a transaction
      if (englishAnalysis) {
        runAggregation(() => {
          insertDetail.run(
          aggregationId,
          template.id,
          template.title,
          'en',
          totalInterviews,
          completedSessions.length,
          inProgressSessions.length,
          totalMessages,
          avgDuration,
          avgDurationSeconds,
          lastConducted,
          englishAnalysis.executive_summary,
          JSON.stringify(englishAnalysis.key_findings),
          englishAnalysis.segment_analysis,
          JSON.stringify(englishAnalysis.recommended_actions)
          );
        });

        // Translate and save for other languages
        const otherLangs = languages.filter((l) => l !== 'en');
        const concurrency = Number(process.env.REPORT_TRANSLATE_CONCURRENCY || '3');

        const queue: string[] = [...otherLangs];
        const workers: Promise<void>[] = [];
        const runWorker = async () => {
          while (queue.length) {
            const lang = queue.shift()!;
            try {
              const translatedAnalysis = await translateAnalysisToLanguage(englishAnalysis!, lang);
              runAggregation(() => {
                insertDetail.run(
                  aggregationId,
                  template.id,
                  template.title,
                  lang,
                  totalInterviews,
                  completedSessions.length,
                  inProgressSessions.length,
                  totalMessages,
                  avgDuration,
                  avgDurationSeconds,
                  lastConducted,
                  translatedAnalysis.executive_summary,
                  JSON.stringify(translatedAnalysis.key_findings),
                  translatedAnalysis.segment_analysis,
                  JSON.stringify(translatedAnalysis.recommended_actions)
                );
              });
            } catch (error) {
              console.error(`Error translating to ${lang} for template ${template.id}:`, error);
              runAggregation(() => {
                insertDetail.run(
                  aggregationId,
                  template.id,
                  template.title,
                  lang,
                  totalInterviews,
                  completedSessions.length,
                  inProgressSessions.length,
                  totalMessages,
                  avgDuration,
                  avgDurationSeconds,
                  lastConducted,
                  '',
                  '[]',
                  '',
                  '[]'
                );
              });
            }
          }
        };
        for (let i = 0; i < Math.max(1, Math.min(concurrency, otherLangs.length)); i++) {
          workers.push(runWorker());
        }
        await Promise.all(workers);

        // Safety check: ensure a row exists for every target language
        try {
          const existingLangsStmt = db.prepare(`
            SELECT language FROM report_details
            WHERE aggregation_id = ? AND template_id = ?
          `);
          const existingRows = existingLangsStmt.all(aggregationId, template.id) as Array<{ language: string }>;
          const existing = new Set(existingRows.map(r => r.language));
          const missing = languages.filter(l => !existing.has(l));

          if (missing.length > 0) {
            for (const lang of missing) {
              const fallback = englishAnalysis || {
                executive_summary: '',
                key_findings: [],
                segment_analysis: '',
                recommended_actions: [],
              };
              runAggregation(() => {
                insertDetail.run(
                  aggregationId,
                  template.id,
                  template.title,
                  lang,
                  totalInterviews,
                  completedSessions.length,
                  inProgressSessions.length,
                  totalMessages,
                  avgDuration,
                  avgDurationSeconds,
                  lastConducted,
                  fallback.executive_summary,
                  JSON.stringify(fallback.key_findings),
                  fallback.segment_analysis,
                  JSON.stringify(fallback.recommended_actions)
                );
              });
            }
          }
        } catch (verifyErr) {
          console.warn('Verification of language rows failed:', verifyErr);
        }
      } else {
        // No analysis available, insert empty records for all languages
        for (const lang of languages) {
          runAggregation(() => {
            insertDetail.run(
            aggregationId,
            template.id,
            template.title,
            lang,
            totalInterviews,
            completedSessions.length,
            inProgressSessions.length,
            totalMessages,
            avgDuration,
            avgDurationSeconds,
            lastConducted,
            '',
            '[]',
            '',
            '[]'
            );
          });
        }
      }
    }

    // Update aggregation status to completed
    const updateStatus = db.prepare('UPDATE report_aggregations SET status = ? WHERE id = ?');
    updateStatus.run('completed', aggregationId);

    return NextResponse.json({ 
      success: true, 
      aggregation_id: aggregationId,
      message: 'Report aggregation completed successfully'
    });
  } catch (error) {
    console.error('Error creating report aggregation:', error);
    
    // Update aggregation status to failed
    try {
      const updateStatus = db.prepare('UPDATE report_aggregations SET status = ? WHERE id = ?');
      updateStatus.run('failed', aggregationId);
    } catch (e) {
      // Ignore if aggregation record doesn't exist
    }
    
    return NextResponse.json(
      { error: 'Failed to create report aggregation', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aggregationId = searchParams.get('aggregation_id');

    if (aggregationId) {
      // Get specific aggregation
      const aggStmt = db.prepare('SELECT * FROM report_aggregations WHERE id = ?');
      const aggregation = aggStmt.get(aggregationId);

      if (!aggregation) {
        return NextResponse.json({ error: 'Aggregation not found' }, { status: 404 });
      }

      return NextResponse.json(aggregation);
    } else {
      // Get all aggregations
      const stmt = db.prepare('SELECT * FROM report_aggregations ORDER BY created_at DESC');
      const aggregations = stmt.all();

      return NextResponse.json(aggregations);
    }
  } catch (error) {
    console.error('Error fetching report aggregations:', error);
    return NextResponse.json({ error: 'Failed to fetch aggregations' }, { status: 500 });
  }
}

