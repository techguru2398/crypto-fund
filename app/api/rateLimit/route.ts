import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimiter';
import { applyCors } from '@/lib/cors';

const handler = async (req: NextRequest) => {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  return NextResponse.json({ message: 'Allowed' });
};

export const GET = rateLimit(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
