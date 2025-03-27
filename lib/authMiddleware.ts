import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './auth';

type HandlerFunction = (req: NextRequest, user: any) => Promise<NextResponse>;

export function withAuth(handler: HandlerFunction) {
  return async (req: NextRequest): Promise<NextResponse> => {
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
