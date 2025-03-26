import { NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; start: number }>();

export function rateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limit = 100,
  windowMs = 15 * 60 * 1000
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, start: now };

    if (now - record.start > windowMs) {
      record.count = 1;
      record.start = now;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(ip, record);

    if (record.count > limit) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(windowMs / 1000).toString(),
          },
        }
      );
    }

    return handler(req);
  };
}
