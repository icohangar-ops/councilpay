import { NextRequest, NextResponse } from 'next/server';
import { DeliberationSession, DELIBERATION_PHASES } from '@/lib/agents/types';
import { runDeliberationPhase, calculateConsensus } from '@/lib/agents/deliberation';

// In-memory session store for demo
const sessions = new Map<string, DeliberationSession>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, ...params } = body;

    switch (action) {
      case 'create': {
        const session: DeliberationSession = {
          id: `CP-${Date.now().toString(36).toUpperCase()}`,
          transactionType: params.transactionType || 'transfer',
          initiator: params.initiator || '0xUnknown',
          recipient: params.recipient,
          amount: params.amount,
          tokenSymbol: params.tokenSymbol || 'aUSDC',
          chain: params.chain || 'monad',
          status: 'deliberating',
          currentPhase: 0,
          messages: [],
          createdAt: Date.now(),
        };
        sessions.set(session.id, session);
        return NextResponse.json({ session });
      }

      case 'advance': {
        const session = sessions.get(sessionId);
        if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        if (session.status !== 'deliberating') {
          return NextResponse.json({ error: 'Session not in deliberation' }, { status: 400 });
        }

        const nextPhaseIndex = session.currentPhase;
        if (nextPhaseIndex >= DELIBERATION_PHASES.length) {
          return NextResponse.json({ error: 'Deliberation complete' }, { status: 400 });
        }

        const newMessages = runDeliberationPhase(session, nextPhaseIndex, params.externalData);
        session.messages.push(...newMessages);
        session.currentPhase = nextPhaseIndex + 1;

        // Check if deliberation is complete
        if (session.currentPhase >= DELIBERATION_PHASES.length) {
          const { verdict, score } = calculateConsensus(session.messages);
          session.finalVerdict = verdict;
          session.consensusScore = score;
          session.status = verdict === 'approved' ? 'completed' : 'rejected';
          session.completedAt = Date.now();
        }

        sessions.set(sessionId, session);
        return NextResponse.json({ session });
      }

      case 'run_all': {
        const session = sessions.get(sessionId);
        if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        // Run all phases sequentially with simulated delays
        for (let i = 0; i < DELIBERATION_PHASES.length; i++) {
          const newMessages = runDeliberationPhase(session, i, params.externalData);
          session.messages.push(...newMessages);
          session.currentPhase = i + 1;
        }

        const { verdict, score } = calculateConsensus(session.messages);
        session.finalVerdict = verdict;
        session.consensusScore = score;
        session.status = verdict === 'approved' ? 'completed' : 'rejected';
        session.completedAt = Date.now();
        session.txHash = verdict === 'approved' ? `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}` : undefined;

        sessions.set(sessionId, session);
        return NextResponse.json({ session });
      }

      case 'get': {
        const session = sessions.get(sessionId);
        if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        return NextResponse.json({ session });
      }

      case 'list': {
        return NextResponse.json({ sessions: Array.from(sessions.values()) });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}