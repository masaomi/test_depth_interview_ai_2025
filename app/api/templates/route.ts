import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { InterviewTemplate } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM interview_templates ORDER BY created_at DESC');
    const templates = stmt.all() as InterviewTemplate[];
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, prompt, duration } = body;

    if (!title || !prompt) {
      return NextResponse.json({ error: 'Title and prompt are required' }, { status: 400 });
    }

    const id = randomUUID();
    const stmt = db.prepare(
      'INSERT INTO interview_templates (id, title, prompt, duration) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, title, prompt, duration || 600);

    return NextResponse.json({ id, title, prompt, duration: duration || 600 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const stmt = db.prepare('DELETE FROM interview_templates WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
