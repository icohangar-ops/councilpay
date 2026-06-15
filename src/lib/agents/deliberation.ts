import { AgentMessage, AgentRole, DeliberationSession, AGENT_CONFIGS, DELIBERATION_PHASES } from './types';
import { verifyAPass, queryAPass } from '../cleanverse/api';

// Simulated agent deliberation logic for hackathon demo
// In production, each agent would be a real LLM-powered agent

function generateAgentResponse(
  role: AgentRole,
  phase: number,
  session: DeliberationSession,
  externalData?: Record<string, unknown>
): AgentMessage {
  const config = AGENT_CONFIGS[role];
  const now = Date.now();

  // Simulate different outcomes based on data
  const isValid = externalData?.valid !== false;
  const confidence = isValid ? 0.85 + Math.random() * 0.14 : 0.1 + Math.random() * 0.3;
  const verdict = isValid ? 'approve' as const : 'reject' as const;

  const phaseDetails: Record<number, Record<AgentRole, string>> = {
    1: {
      identity: isValid
        ? `A-Pass verification complete. Wallet ${session.initiator.slice(0, 10)}... bound to verified identity. KYC level: ${externalData?.tier || 'Standard'}. Status: Active. No sanctions match. All 5 identity checks passed.`
        : `A-Pass verification FAILED. Wallet ${session.initiator.slice(0, 10)}... has identity issues: ${externalData?.reason || 'KYC expired'}. Rejecting transaction — identity requirements not met.`,
      compliance: 'Awaiting identity verification results before compliance assessment.',
      treasury: 'Standing by for compliance clearance.',
      audit: 'Monitoring deliberation progress. Audit trail initialized.',
    },
    2: {
      compliance: isValid
        ? `Compliance assessment passed. A-Token rules validated: min_tier=${externalData?.minTier || 0}, group=${externalData?.group || 'open'}. Travel Rule data assembled. Jurisdictional checks clear for ${session.chain} network.`
        : `Compliance check FAILED. A-Token rule violation detected: ${externalData?.reason || 'Sender tier below minimum requirement'}. Transaction cannot proceed without compliance clearance.`,
      treasury: 'Reviewing compliance assessment for treasury implications.',
      audit: 'Compliance findings logged. Preparing audit verification.',
    },
    3: {
      treasury: isValid
        ? `Treasury validation complete. Sufficient aUSDC balance confirmed. Settlement route: ${session.chain} → deposit address. Amount ${session.amount || '0'} aUSDC within transfer limits. Reserve ratio: 1:1 maintained.`
        : `Treasury validation FAILED. ${externalData?.reason || 'Insufficient aUSDC balance for this transaction'}. Settlement cannot proceed.`,
      audit: 'Treasury validation recorded. Generating audit confirmation.',
    },
    4: {
      audit: `Audit trail finalized. Transaction ID: ${session.id}. All 4 agent assessments recorded. Travel Rule report generated. Authorization chain: Identity → Compliance → Treasury → Audit. Full regulatory traceability confirmed.`,
    },
    5: {
      audit: `Consensus reached. All required agents approved. Quorum: 4/4. Final verdict: APPROVED. Transaction cleared for execution on ${session.chain}.`,
    },
  };

  return {
    agent: role,
    phase,
    content: phaseDetails[phase]?.[role] || `${config.name} assessment complete for phase ${phase}.`,
    verdict,
    confidence: Math.round(confidence * 100) / 100,
    timestamp: now,
  };
}

export function runDeliberationPhase(
  session: DeliberationSession,
  phaseIndex: number,
  externalData?: Record<string, unknown>
): AgentMessage[] {
  const phase = DELIBERATION_PHASES[phaseIndex];
  if (!phase) return [];

  const messages: AgentMessage[] = [];

  // The primary agent for this phase always responds
  messages.push(generateAgentResponse(phase.agent, phase.phase, session, externalData));

  // Other agents may add commentary (abstain on other phases)
  const otherAgents: AgentRole[] = ['identity', 'compliance', 'treasury', 'audit'].filter(
    (r) => r !== phase.agent
  );

  // Phase 5 is consensus - all agents weigh in
  if (phase.phase === 5) {
    for (const agent of otherAgents) {
      messages.push({
        agent,
        phase: 5,
        content: `Confirming approval. ${AGENT_CONFIGS[agent].name} concurs with consensus.`,
        verdict: externalData?.valid !== false ? 'approve' : 'reject',
        confidence: 0.9 + Math.random() * 0.1,
        timestamp: Date.now() + Math.random() * 1000,
      });
    }
  }

  return messages;
}

export function calculateConsensus(messages: AgentMessage[]): {
  verdict: 'approved' | 'rejected';
  score: number;
} {
  const votes = messages.filter((m) => m.verdict !== 'abstain' && m.verdict !== 'pending');
  const approvals = votes.filter((m) => m.verdict === 'approve').length;
  const total = votes.length;
  const score = total > 0 ? approvals / total : 0;

  return {
    verdict: score >= 0.75 ? 'approved' : 'rejected',
    score: Math.round(score * 100) / 100,
  };
}