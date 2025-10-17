import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, language } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const id = randomUUID();
    const stmt = db.prepare(
      'INSERT INTO interview_sessions (id, template_id, language) VALUES (?, ?, ?)'
    );
    stmt.run(id, template_id, language || 'en');

    return NextResponse.json({ id, template_id, language: language || 'en' });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, status } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const stmt = db.prepare(
      'UPDATE interview_sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(status || 'completed', session_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('id');

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const stmt = db.prepare('SELECT * FROM interview_sessions WHERE id = ?');
    const session = stmt.get(session_id);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
