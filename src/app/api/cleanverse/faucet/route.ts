import { NextRequest, NextResponse } from 'next/server';
import { requestFaucet } from '@/lib/cleanverse/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await requestFaucet(body.chain, body.symbol, body.depositAddress, body.amount);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}