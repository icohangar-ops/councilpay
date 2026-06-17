import { NextRequest, NextResponse } from 'next/server';
import { verifyPool, queryPoolRules, isPoolRegistered } from '@/lib/cleanverse/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'verify': {
        const result = await verifyPool(params.chain, params.poolAddress, params.userAddress);
        return NextResponse.json(result);
      }
      case 'rules': {
        const result = await queryPoolRules(params.chain, params.poolAddress);
        return NextResponse.json(result);
      }
      case 'is_registered': {
        const result = await isPoolRegistered(params.chain, params.poolAddress);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}