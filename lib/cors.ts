import { NextRequest, NextResponse } from 'next/server';

export function applyCors(req: NextRequest): NextResponse | null {
  const res = new NextResponse();

  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res; // Return early for preflight
  }

  return null; // Let handler continue
}
