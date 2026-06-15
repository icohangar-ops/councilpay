import { NextRequest, NextResponse } from 'next/server';
import { generateAPass, queryAPass, verifyAPass, updateAPassStatus } from '@/lib/cleanverse/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate': {
        const result = await generateAPass(params);
        return NextResponse.json(result);
      }
      case 'query': {
        const result = await queryAPass(params.chain, params.address);
        return NextResponse.json(result);
      }
      case 'verify': {
        const result = await verifyAPass(params.atoken, params.chain, params.address);
        return NextResponse.json(result);
      }
      case 'update_status': {
        const result = await updateAPassStatus(
          params.customerId,
          params.status,
          params.chain,
          params.address,
          params.blacklistReason
        );
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}