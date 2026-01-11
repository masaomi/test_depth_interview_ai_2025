import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ConversationLog } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id');
    const format = searchParams.get('format') || 'json';
    const includeVirtual = searchParams.get('include_virtual') !== 'false'; // default true

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Get template info
    const template = db.prepare('SELECT id, title FROM interview_templates WHERE id = ?').get(templateId) as any;
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get all sessions for this template
    const sessionsQuery = includeVirtual
      ? `SELECT s.id, s.started_at, s.ended_at, s.summary, s.language, s.is_virtual, s.persona_id,
                p.name as persona_name
         FROM interview_sessions s
         LEFT JOIN personas p ON s.persona_id = p.id
         WHERE s.template_id = ?
         ORDER BY s.started_at ASC`
      : `SELECT s.id, s.started_at, s.ended_at, s.summary, s.language, s.is_virtual, s.persona_id,
                p.name as persona_name
         FROM interview_sessions s
         LEFT JOIN personas p ON s.persona_id = p.id
         WHERE s.template_id = ? AND (s.is_virtual = 0 OR s.is_virtual IS NULL)
         ORDER BY s.started_at ASC`;

    const sessions = db.prepare(sessionsQuery).all(templateId) as any[];

    // Get logs for each session
    const fullData = sessions.map((session, index) => {
      const logsStmt = db.prepare(`
        SELECT role, content, timestamp 
        FROM conversation_logs 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `);
      const logs = logsStmt.all(session.id) as ConversationLog[];
      return { 
        ...session, 
        logs,
        session_number: index + 1  // Oldest = 1, newest = highest
      };
    });

    if (format === 'markdown') {
      let markdown = `# Interview Logs for Template: ${template.title}\n\n`;
      markdown += `**Template ID**: ${templateId}\n`;
      markdown += `**Total Sessions**: ${fullData.length}\n`;
      markdown += `**Human Sessions**: ${fullData.filter(s => !s.is_virtual).length}\n`;
      markdown += `**Virtual Sessions**: ${fullData.filter(s => s.is_virtual).length}\n\n`;
      markdown += `---\n\n`;

      // Display in reverse order (newest first) but keep session numbers (oldest = 1)
      const displayData = [...fullData].reverse();
      
      displayData.forEach((session) => {
        const sessionType = session.is_virtual ? '🤖 Virtual' : '👤 Human';
        const personaInfo = session.persona_name ? ` (Persona: ${session.persona_name})` : '';
        
        markdown += `## Session ${session.session_number}: ${sessionType}${personaInfo}\n`;
        markdown += `- **Date**: ${session.started_at}\n`;
        markdown += `- **Language**: ${session.language || 'en'}\n`;
        markdown += `- **ID**: ${session.id}\n\n`;
        
        if (session.summary) {
          markdown += `### Summary\n${session.summary}\n\n`;
        }
        
        markdown += `### Conversation\n\n`;
        if (session.logs.length === 0) {
          markdown += `*No conversation logs recorded*\n\n`;
        } else {
          session.logs.forEach((log: ConversationLog) => {
            const role = log.role === 'assistant' ? '🎤 Interviewer' : '💬 Participant';
            markdown += `**${role}**: ${log.content}\n\n`;
          });
        }
        
        markdown += `---\n\n`;
      });

      // Create safe filename
      const safeTitle = template.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="template_${safeTitle}_logs.md"`
        }
      });
    }

    return NextResponse.json({
      template,
      sessions: fullData
    });
  } catch (error) {
    console.error('Error fetching template sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
