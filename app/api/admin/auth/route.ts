import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = !!process.env.ADMIN_PASSWORD;
  return NextResponse.json({ enabled });
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const ok = !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
    if (ok) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}


