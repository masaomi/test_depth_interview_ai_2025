import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ConversationLog } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('persona_id');
    const format = searchParams.get('format') || 'json';

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    // Get all sessions for this persona
    const sessionsStmt = db.prepare(`
      SELECT s.id, s.started_at, s.ended_at, s.summary, t.title as template_title
      FROM interview_sessions s
      JOIN interview_templates t ON s.template_id = t.id
      WHERE s.persona_id = ? AND s.is_virtual = 1
      ORDER BY s.started_at DESC
    `);
    const sessions = sessionsStmt.all(personaId) as any[];

    // Get logs for each session
    const fullData = sessions.map(session => {
      const logsStmt = db.prepare(`
        SELECT role, content, timestamp 
        FROM conversation_logs 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `);
      const logs = logsStmt.all(session.id) as ConversationLog[];
      return { ...session, logs };
    });

    if (format === 'markdown') {
      let markdown = `# Interview Logs for Persona ID: ${personaId}\n\n`;
      const totalSessions = fullData.length;
      
      fullData.forEach((session, index) => {
        // Session number: newest session gets the highest number
        // Since fullData is sorted DESC (newest first), we calculate: total - index
        const sessionNumber = totalSessions - index;
        markdown += `## Session ${sessionNumber}: ${session.template_title}\n`;
        markdown += `- **Date**: ${session.started_at}\n`;
        markdown += `- **ID**: ${session.id}\n\n`;
        
        if (session.summary) {
          markdown += `### Summary\n${session.summary}\n\n`;
        }
        
        markdown += `### Conversation\n\n`;
        session.logs.forEach((log: ConversationLog) => {
          const role = log.role === 'assistant' ? 'Interviewer' : 'Persona';
          markdown += `**${role}**: ${log.content}\n\n`;
        });
        
        markdown += `---\n\n`;
      });

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="persona_${personaId}_logs.md"`
        }
      });
    }

    return NextResponse.json(fullData);
  } catch (error) {
    console.error('Error fetching persona sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
