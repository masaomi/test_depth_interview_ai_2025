import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 1. Total Summary
    const summaryStmt = db.prepare(`
      SELECT 
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(CASE WHEN is_virtual = 1 THEN total_tokens ELSE 0 END) as virtual_tokens,
        SUM(CASE WHEN is_virtual = 0 THEN total_tokens ELSE 0 END) as human_tokens
      FROM token_usage_logs
    `);
    const summary = summaryStmt.get() as any;

    // 2. By Model
    const byModelStmt = db.prepare(`
      SELECT model_name as model, SUM(total_tokens) as tokens
      FROM token_usage_logs
      GROUP BY model_name
      ORDER BY tokens DESC
    `);
    const byModel = byModelStmt.all();

    // 3. By Endpoint
    const byEndpointStmt = db.prepare(`
      SELECT api_endpoint as endpoint, SUM(total_tokens) as tokens
      FROM token_usage_logs
      GROUP BY api_endpoint
      ORDER BY tokens DESC
    `);
    const byEndpoint = byEndpointStmt.all();

    // 4. Daily Usage (Last 30 days)
    const dailyStmt = db.prepare(`
      SELECT date(created_at) as date, SUM(total_tokens) as tokens
      FROM token_usage_logs
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    const daily = dailyStmt.all();

    // 5. Recent Logs
    const recentLogsStmt = db.prepare(`
      SELECT * FROM token_usage_logs ORDER BY created_at DESC LIMIT 50
    `);
    const recentLogs = recentLogsStmt.all();

    return NextResponse.json({
      summary: {
        total_tokens: summary.total_tokens || 0,
        total_input_tokens: summary.total_input_tokens || 0,
        total_output_tokens: summary.total_output_tokens || 0,
        virtual_tokens: summary.virtual_tokens || 0,
        human_tokens: summary.human_tokens || 0
      },
      by_model: byModel,
      by_endpoint: byEndpoint,
      daily: daily,
      recent_logs: recentLogs
    });
  } catch (error) {
    console.error('Error fetching token stats:', error);
    return NextResponse.json({ error: 'Failed to fetch token stats' }, { status: 500 });
  }
}
