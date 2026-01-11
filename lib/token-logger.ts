import db from '@/lib/db';

export function logTokenUsage(params: {
  sessionId?: string;
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  isVirtual?: boolean;
}) {
  try {
    const stmt = db.prepare(`
      INSERT INTO token_usage_logs 
      (session_id, api_endpoint, model_name, input_tokens, output_tokens, total_tokens, is_virtual)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      params.sessionId || null,
      params.endpoint,
      params.model,
      params.inputTokens,
      params.outputTokens,
      params.inputTokens + params.outputTokens,
      params.isVirtual ? 1 : 0
    );
  } catch (error) {
    console.error('Failed to log token usage:', error);
  }
}
