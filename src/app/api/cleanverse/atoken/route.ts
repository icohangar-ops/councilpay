import { NextRequest, NextResponse } from 'next/server';
import {
  launchAToken,
  launchWrappedAToken,
  queryATokenStatus,
  queryATokenRules,
  queryDepositATokenList,
  queryDepositAddress,
} from '@/lib/cleanverse/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'launch': {
        const result = await launchAToken(params);
        return NextResponse.json(result);
      }
      case 'launch_wrapped': {
        const result = await launchWrappedAToken(params);
        return NextResponse.json(result);
      }
      case 'query_status': {
        const result = await queryATokenStatus(params.requestId);
        return NextResponse.json(result);
      }
      case 'query_rules': {
        const result = await queryATokenRules(params.chain, params.atokenAddress);
        return NextResponse.json(result);
      }
      case 'query_deposit_list': {
        const result = await queryDepositATokenList(params.chain);
        return NextResponse.json(result);
      }
      case 'query_deposit_address': {
        const result = await queryDepositAddress(params.chain, params.address);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}