import { NextRequest, NextResponse } from 'next/server';
import { rebalancePortfolio } from '@/lib/rebalance';
import { applyCors } from '@/lib/cors'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);

    const fundId = searchParams.get('fundId');

    try {
        await rebalancePortfolio(fundId as string);
        return NextResponse.json({ status: 'Rebalance triggered' });
    } catch (err) {
        console.error('❌ Rebalance error:', err.message);
        return NextResponse.json({ error: 'Rebalance failed' }, { status: 500 });
    }
}