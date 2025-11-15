import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ConversationLog } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get session details
    const sessionStmt = db.prepare(`
      SELECT 
        s.*, 
        t.title as template_title
      FROM interview_sessions s
      JOIN interview_templates t ON s.template_id = t.id
      WHERE s.id = ?
    `);
    const session = sessionStmt.get(sessionId) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Get conversation logs
    const logsStmt = db.prepare(
      'SELECT role, content, metadata, timestamp FROM conversation_logs WHERE session_id = ? ORDER BY timestamp ASC'
    );
    const logs = logsStmt.all(sessionId) as ConversationLog[];
    
    // Format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };
    
    // Calculate duration
    let duration = 'N/A';
    if (session.started_at && session.ended_at) {
      const start = new Date(session.started_at).getTime();
      const end = new Date(session.ended_at).getTime();
      const durationMs = end - start;
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      duration = `${minutes}分${seconds}秒`;
    }
    
    // Build markdown content
    let markdown = `# インタビューレポート\n\n`;
    markdown += `## 基本情報\n\n`;
    markdown += `- **タイトル**: ${session.template_title}\n`;
    markdown += `- **セッションID**: ${sessionId}\n`;
    markdown += `- **言語**: ${session.language}\n`;
    markdown += `- **開始時刻**: ${formatDate(session.started_at)}\n`;
    if (session.ended_at) {
      markdown += `- **終了時刻**: ${formatDate(session.ended_at)}\n`;
    }
    markdown += `- **所要時間**: ${duration}\n`;
    markdown += `- **ステータス**: ${session.status}\n\n`;
    
    // Add summary if available
    if (session.summary) {
      markdown += `## インタビューサマリー\n\n`;
      markdown += `${session.summary}\n\n`;
    }
    
    // Add conversation logs
    markdown += `## 会話ログ\n\n`;
    markdown += `全 ${logs.length} メッセージ\n\n`;
    markdown += `---\n\n`;
    
    logs.forEach((log, index) => {
      const roleLabel = log.role === 'user' ? '👤 **参加者**' : '🤖 **AI**';
      const timestamp = formatDate(log.timestamp);
      
      markdown += `### ${roleLabel} (${timestamp})\n\n`;
      markdown += `${log.content}\n\n`;
      
      // Add metadata if available
      if (log.metadata) {
        try {
          const metadata = JSON.parse(log.metadata);
          if (metadata.type && log.role === 'assistant') {
            markdown += `*質問タイプ: ${metadata.type}*\n\n`;
            if (metadata.options) {
              markdown += `*選択肢: ${metadata.options.join(', ')}*\n\n`;
            }
            if (metadata.scaleMin && metadata.scaleMax) {
              markdown += `*スケール: ${metadata.scaleMin} - ${metadata.scaleMax}*\n\n`;
            }
          }
          if (metadata.selectedOptions && log.role === 'user') {
            markdown += `*選択: ${metadata.selectedOptions.join(', ')}*\n\n`;
          }
          if (metadata.scaleValue && log.role === 'user') {
            markdown += `*評価値: ${metadata.scaleValue}*\n\n`;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      markdown += `---\n\n`;
    });
    
    // Add footer
    markdown += `\n\n---\n\n`;
    markdown += `*このレポートは自動生成されました - ${new Date().toLocaleString('ja-JP')}*\n`;
    
    // Return as downloadable file
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="interview_${sessionId}_${Date.now()}.md"`,
      },
    });
  } catch (error) {
    console.error('Error exporting session:', error);
    return NextResponse.json(
      { error: 'Failed to export session', details: (error as Error).message },
      { status: 500 }
    );
  }
}

