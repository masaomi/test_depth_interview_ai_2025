import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { Persona } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const stmt = db.prepare('SELECT * FROM personas WHERE id = ?');
      const persona = stmt.get(id);
      
      if (!persona) {
        return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
      }
      
      return NextResponse.json(persona);
    }

    const stmt = db.prepare('SELECT * FROM personas ORDER BY created_at DESC');
    const personas = stmt.all();

    return NextResponse.json(personas);
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Failed to fetch personas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, base_prompt, variation_params } = body;

    if (!name || !base_prompt) {
      return NextResponse.json({ error: 'Name and base_prompt are required' }, { status: 400 });
    }

    const id = randomUUID();
    const variationParamsJson = variation_params ? JSON.stringify(variation_params) : null;

    const stmt = db.prepare(
      'INSERT INTO personas (id, name, base_prompt, variation_params) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, name, base_prompt, variationParamsJson);

    return NextResponse.json({ id, name, base_prompt, variation_params: variationParamsJson });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Failed to create persona' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, base_prompt, variation_params } = body;

    if (!id || !name || !base_prompt) {
      return NextResponse.json({ error: 'ID, name and base_prompt are required' }, { status: 400 });
    }

    const variationParamsJson = variation_params ? JSON.stringify(variation_params) : null;

    const stmt = db.prepare(
      'UPDATE personas SET name = ?, base_prompt = ?, variation_params = ? WHERE id = ?'
    );
    const info = stmt.run(name, base_prompt, variationParamsJson, id);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    return NextResponse.json({ id, name, base_prompt, variation_params: variationParamsJson });
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    // Check for related sessions before deleting? 
    // Usually for personas we might want to keep the sessions but maybe nullify the key or just keep the ID.
    // The foreign key is not strictly enforced in code but DB might complain if FK constraint is active.
    // In lib/db.ts: db.pragma('foreign_keys = ON'); is set.
    // But wait, I added persona_id column to interview_sessions but did I add a FOREIGN KEY constraint?
    // In migration: ensureColumn('interview_sessions', 'persona_id', `ALTER TABLE interview_sessions ADD COLUMN persona_id TEXT`);
    // SQLite's ALTER TABLE ADD COLUMN does NOT support adding FK constraints on the fly easily in one go compatible with all versions without recreating table.
    // So there is likely NO FK constraint on persona_id.
    
    const stmt = db.prepare('DELETE FROM personas WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 });
  }
}
