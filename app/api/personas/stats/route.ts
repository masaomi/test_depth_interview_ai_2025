import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('persona_id');

    if (personaId) {
      // Get stats for a specific persona
      const stats = db.prepare(`
        SELECT 
          p.id as persona_id,
          p.name as persona_name,
          t.id as template_id,
          t.title as template_title,
          COUNT(s.id) as run_count,
          MAX(s.started_at) as last_run
        FROM personas p
        LEFT JOIN interview_sessions s ON s.persona_id = p.id AND s.is_virtual = 1
        LEFT JOIN interview_templates t ON t.id = s.template_id
        WHERE p.id = ?
        GROUP BY p.id, t.id
        ORDER BY run_count DESC
      `).all(personaId);

      const totalRuns = stats.reduce((sum: number, s: any) => sum + (s.run_count || 0), 0);

      return NextResponse.json({
        persona_id: personaId,
        total_runs: totalRuns,
        by_template: stats.filter((s: any) => s.template_id).map((s: any) => ({
          template_id: s.template_id,
          template_title: s.template_title,
          run_count: s.run_count,
          last_run: s.last_run
        }))
      });
    } else {
      // Get stats for all personas
      const stats = db.prepare(`
        SELECT 
          p.id as persona_id,
          p.name as persona_name,
          COUNT(s.id) as total_runs,
          COUNT(DISTINCT s.template_id) as template_count,
          MAX(s.started_at) as last_run
        FROM personas p
        LEFT JOIN interview_sessions s ON s.persona_id = p.id AND s.is_virtual = 1
        GROUP BY p.id
        ORDER BY total_runs DESC
      `).all();

      // Get detailed breakdown for each persona
      const detailedStats = stats.map((persona: any) => {
        const byTemplate = db.prepare(`
          SELECT 
            t.id as template_id,
            t.title as template_title,
            COUNT(s.id) as run_count
          FROM interview_sessions s
          JOIN interview_templates t ON t.id = s.template_id
          WHERE s.persona_id = ? AND s.is_virtual = 1
          GROUP BY t.id
          ORDER BY run_count DESC
        `).all(persona.persona_id);

        return {
          ...persona,
          by_template: byTemplate
        };
      });

      return NextResponse.json(detailedStats);
    }
  } catch (error) {
    console.error('Error fetching persona stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
