import { NextRequest, NextResponse } from 'next/server';
import { queryTransactions, downloadTravelRule } from '@/lib/cleanverse/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'query': {
        const result = await queryTransactions(params.chain, params.address, params.filters);
        return NextResponse.json(result);
      }
      case 'travel_rule': {
        const result = await downloadTravelRule(params.txHash);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}