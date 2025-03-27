import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './auth';

export function withAuth(handler: Function) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    const user = token && verifyJwt(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Attach user to request
    return handler(req, user);
  };
}
