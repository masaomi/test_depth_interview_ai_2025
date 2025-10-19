import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: aggregationId } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    // Get aggregation metadata
    const aggStmt = db.prepare('SELECT * FROM report_aggregations WHERE id = ?');
    const aggregation = aggStmt.get(aggregationId);

    if (!aggregation) {
      return NextResponse.json({ error: 'Aggregation not found' }, { status: 404 });
    }

    // Get report details for this aggregation filtered by language
    const detailsStmt = db.prepare(`
      SELECT * FROM report_details 
      WHERE aggregation_id = ? AND language = ?
      ORDER BY total_interviews DESC
    `);
    const details = detailsStmt.all(aggregationId, language);

    return NextResponse.json({
      aggregation,
      details,
      language
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    return NextResponse.json({ error: 'Failed to fetch report details' }, { status: 500 });
  }
}

