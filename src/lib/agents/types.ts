// CouncilPay Agent Types

export type AgentRole = 'identity' | 'compliance' | 'treasury' | 'audit';

export interface AgentMessage {
  agent: AgentRole;
  phase: number;
  content: string;
  verdict: 'approve' | 'reject' | 'abstain' | 'pending';
  confidence: number;
  timestamp: number;
}

export interface DeliberationSession {
  id: string;
  transactionType: 'transfer' | 'mint' | 'withdraw' | 'deposit';
  initiator: string;
  recipient?: string;
  amount?: string;
  tokenSymbol?: string;
  chain: string;
  status: 'deliberating' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  currentPhase: number;
  messages: AgentMessage[];
  finalVerdict?: 'approved' | 'rejected';
  consensusScore?: number;
  createdAt: number;
  completedAt?: number;
  txHash?: string;
  cleanverseRequestId?: string;
}

export interface AgentConfig {
  role: AgentRole;
  name: string;
  icon: string;
  color: string;
  description: string;
  checks: string[];
}

export const AGENT_CONFIGS: Record<AgentRole, AgentConfig> = {
  identity: {
    role: 'identity',
    name: 'Identity Sentinel',
    icon: 'ShieldCheck',
    color: 'emerald',
    description: 'Verifies A-Pass credentials, KYC status, and wallet-bound identity proofs before any transaction proceeds.',
    checks: [
      'A-Pass active and not frozen',
      'KYC verification current',
      'Wallet-to-identity binding valid',
      'Expiration time not exceeded',
      'No blacklist entries',
    ],
  },
  compliance: {
    role: 'compliance',
    name: 'Compliance Arbiter',
    icon: 'Scale',
    color: 'amber',
    description: 'Evaluates A-Token rule compliance, Travel Rule requirements, and jurisdictional constraints.',
    checks: [
      'A-Token compliance rules met',
      'Sender/receiver tier requirements',
      'Group and sub-group restrictions',
      'Travel Rule data completeness',
      'Jurisdictional transfer limits',
    ],
  },
  treasury: {
    role: 'treasury',
    name: 'Treasury Warden',
    icon: 'Vault',
    color: 'violet',
    description: 'Manages aUSDC balances, validates deposit/withdraw flows, and ensures settlement integrity.',
    checks: [
      'Sufficient aUSDC balance',
      'Deposit address whitelisted',
      '1:1 reserve ratio maintained',
      'Settlement route validated',
      'Amount within transfer limits',
    ],
  },
  audit: {
    role: 'audit',
    name: 'Audit Scribe',
    icon: 'ScrollText',
    color: 'sky',
    description: 'Generates immutable audit trails, validates Travel Rule reports, and ensures full regulatory traceability.',
    checks: [
      'Audit trail immutable',
      'Travel Rule report generated',
      'Transaction logged with all parties',
      'Consensus quorum achieved',
      'Authorization chain complete',
    ],
  },
};

// Deliberation phases
export const DELIBERATION_PHASES = [
  { phase: 1, name: 'Identity Verification', agent: 'identity' as AgentRole },
  { phase: 2, name: 'Compliance Check', agent: 'compliance' as AgentRole },
  { phase: 3, name: 'Treasury Validation', agent: 'treasury' as AgentRole },
  { phase: 4, name: 'Audit Trail Generation', agent: 'audit' as AgentRole },
  { phase: 5, name: 'Consensus Resolution', agent: 'audit' as AgentRole },
];