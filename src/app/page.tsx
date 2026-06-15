'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ShieldCheck, Scale, Vault, ScrollText, ArrowRight, Play,
  CheckCircle2, XCircle, Clock, Loader2, Send, RefreshCw,
  Zap, Eye, FileText, Users, Globe, Lock, ChevronDown, AlertTriangle, Copy, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DeliberationSession, AgentMessage, AgentRole } from '@/lib/agents/types';
import { AGENT_CONFIGS, DELIBERATION_PHASES } from '@/lib/agents/types';

// ── Icons per agent ──
const AGENT_ICONS: Record<AgentRole, React.ReactNode> = {
  identity: <ShieldCheck className="w-5 h-5" />,
  compliance: <Scale className="w-5 h-5" />,
  treasury: <Vault className="w-5 h-5" />,
  audit: <ScrollText className="w-5 h-5" />,
};

const AGENT_COLORS: Record<AgentRole, string> = {
  identity: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  compliance: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  treasury: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  audit: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
};

const AGENT_DOT_COLORS: Record<AgentRole, string> = {
  identity: 'bg-emerald-400',
  compliance: 'bg-amber-400',
  treasury: 'bg-violet-400',
  audit: 'bg-sky-400',
};

const AGENT_GLOW: Record<AgentRole, string> = {
  identity: 'shadow-emerald-500/20',
  compliance: 'shadow-amber-500/20',
  treasury: 'shadow-violet-500/20',
  audit: 'shadow-sky-500/20',
};

// ── Verdict badge ──
function VerdictBadge({ verdict }: { verdict: AgentMessage['verdict'] }) {
  if (verdict === 'approve') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">APPROVE</Badge>;
  if (verdict === 'reject') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">REJECT</Badge>;
  if (verdict === 'pending') return <Badge variant="outline" className="text-muted-foreground">PENDING</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">ABSTAIN</Badge>;
}

// ── Phase step indicator ──
function PhaseIndicator({ currentPhase, total }: { currentPhase: number; total: number }) {
  const progress = (currentPhase / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Phase {currentPhase}/{total}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex gap-1">
        {DELIBERATION_PHASES.map((p, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
              i < currentPhase
                ? AGENT_DOT_COLORS[p.agent as AgentRole]
                : i === currentPhase - 1
                ? 'bg-white animate-pulse'
                : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Agent card ──
function AgentCard({
  role,
  message,
  isActive,
}: {
  role: AgentRole;
  message?: AgentMessage;
  isActive: boolean;
}) {
  const config = AGENT_CONFIGS[role];
  return (
    <Card
      className={`border transition-all duration-500 ${
        isActive
          ? `${AGENT_COLORS[role]} shadow-lg ${AGENT_GLOW[role]}`
          : 'border-border/50 bg-card/50'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isActive ? AGENT_COLORS[role] : 'bg-zinc-800/50 text-muted-foreground'
              }`}
            >
              {AGENT_ICONS[role]}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{config.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{config.description.slice(0, 60)}...</CardDescription>
            </div>
          </div>
          {isActive && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          {message && !isActive && <VerdictBadge verdict={message.verdict} />}
        </div>
      </CardHeader>
      {message && (
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground leading-relaxed animate-slide-in">
            {message.content}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>Confidence: <span className="text-foreground font-medium">{Math.round(message.confidence * 100)}%</span></span>
            <span>Phase {message.phase}</span>
          </div>
        </CardContent>
      )}
      {!message && !isActive && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {config.checks.slice(0, 3).map((check, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3.5 h-3.5 rounded border border-zinc-700" />
                <span>{check}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Deliberation message feed ──
function MessageFeed({ messages }: { messages: AgentMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No deliberation activity yet.</p>
        <p className="text-xs mt-1">Initiate a transaction to begin the council protocol.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-3" ref={scrollRef}>
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-slide-in flex gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
          >
            <div className={`p-1.5 rounded-md mt-0.5 ${AGENT_COLORS[msg.agent]}`}>
              {AGENT_ICONS[msg.agent]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold">{AGENT_CONFIGS[msg.agent].name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Phase {msg.phase}
                </Badge>
                <VerdictBadge verdict={msg.verdict} />
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {Math.round(msg.confidence * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Consensus result banner ──
function ConsensusBanner({ session }: { session: DeliberationSession }) {
  if (session.status !== 'completed' && session.status !== 'rejected') return null;
  const isApproved = session.status === 'completed';

  return (
    <div
      className={`animate-slide-in p-4 rounded-lg border ${
        isApproved
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}
    >
      <div className="flex items-center gap-3">
        {isApproved ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        ) : (
          <XCircle className="w-6 h-6 text-red-400" />
        )}
        <div>
          <p className={`font-semibold text-sm ${isApproved ? 'text-emerald-400' : 'text-red-400'}`}>
            {isApproved ? 'CONSENSUS REACHED — TRANSACTION APPROVED' : 'CONSENSUS FAILED — TRANSACTION REJECTED'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consensus score: {session.consensusScore !== undefined ? `${Math.round(session.consensusScore * 100)}%` : 'N/A'}
            {session.txHash && ` | TxHash: ${session.txHash.slice(0, 16)}...`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Cleanverse status panel ──
function CleanverseStatusPanel() {
  const [apassStatus, setApassStatus] = useState<string>('--');
  const [atokenStatus, setAtokenStatus] = useState<string>('--');
  const [faucetStatus, setFaucetStatus] = useState<string>('Not tested');
  const [loading, setLoading] = useState(false);

  const testConnectivity = async () => {
    setLoading(true);
    try {
      // Test A-Pass query
      const apassRes = await fetch('/api/cleanverse/apass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          chain: 'monad',
          address: '0x0000000000000000000000000000000000000001',
        }),
      });
      const apassData = await apassRes.json();
      setApassStatus(apassRes.ok ? 'Connected' : `Error ${apassRes.status}`);

      // Test A-Token deposit list
      const atokenRes = await fetch('/api/cleanverse/atoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query_deposit_list', chain: 'monad' }),
      });
      const atokenData = await atokenRes.json();
      setAtokenStatus(atokenRes.ok ? 'Connected' : `Error ${atokenRes.status}`);

      setFaucetStatus('Ready');
    } catch (e: any) {
      setApassStatus('Connection failed');
      setAtokenStatus('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Cleanverse API Status</CardTitle>
          <Button variant="outline" size="sm" onClick={testConnectivity} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="ml-1.5">Test</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'A-Pass', status: apassStatus, icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'A-Token', status: atokenStatus, icon: <Zap className="w-4 h-4" /> },
            { label: 'Faucet', status: faucetStatus, icon: <Globe className="w-4 h-4" /> },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <div className="text-muted-foreground">{item.icon}</div>
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className={`text-[10px] ${item.status === 'Connected' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {item.status}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>API ID: APP2026****ZXM | AES-256-CBC encryption active | UAT sandbox</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function Home() {
  const [activeTab, setActiveTab] = useState('deliberate');
  const [session, setSession] = useState<DeliberationSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Transaction form
  const [senderAddr, setSenderAddr] = useState('0xA1B2C3D4E5F60718293A4B5C6D7E8F9001234567');
  const [recipientAddr, setRecipientAddr] = useState('0xF1E2D3C4B5A60718293F4E5D6C7B8A9098765432');
  const [amount, setAmount] = useState('500');
  const [chain, setChain] = useState('monad');
  const [simulateRejection, setSimulateRejection] = useState(false);

  // Stats
  const [stats, setStats] = useState({ sessions: 0, approved: 0, rejected: 0 });
  const [history, setHistory] = useState<DeliberationSession[]>([]);

  const runDeliberation = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      // 1. Create session
      const createRes = await fetch('/api/council/deliberate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          transactionType: 'transfer',
          initiator: senderAddr,
          recipient: recipientAddr,
          amount,
          tokenSymbol: 'aUSDC',
          chain,
        }),
      });
      const createData = await createRes.json();
      const newSession: DeliberationSession = createData.session;
      setSession(newSession);

      // 2. Run all phases
      await new Promise((r) => setTimeout(r, 600));
      const runRes = await fetch('/api/council/deliberate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_all',
          sessionId: newSession.id,
          externalData: {
            valid: !simulateRejection,
            tier: simulateRejection ? 10 : 45,
            minTier: 30,
            group: 'open',
            reason: simulateRejection ? 'Sender KYC verification expired — identity level below A-Token requirement' : undefined,
          },
        }),
      });
      const runData = await runRes.json();
      setSession(runData.session);

      // 3. Update stats
      setHistory((prev) => [runData.session, ...prev].slice(0, 20));
      setStats((prev) => ({
        sessions: prev.sessions + 1,
        approved: prev.approved + (runData.session.status === 'completed' ? 1 : 0),
        rejected: prev.rejected + (runData.session.status === 'rejected' ? 1 : 0),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, senderAddr, recipientAddr, amount, chain, simulateRejection]);

  // Get the active agent for current phase
  const activeAgent: AgentRole | null =
    session && session.status === 'deliberating' && session.currentPhase < DELIBERATION_PHASES.length
      ? DELIBERATION_PHASES[session.currentPhase]?.agent ?? null
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <Scale className="w-5 h-5 text-amber-400 -ml-1" />
              <Vault className="w-5 h-5 text-violet-400 -ml-1" />
              <ScrollText className="w-5 h-5 text-sky-400 -ml-1" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">CouncilPay</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                Multi-Agent Compliant Payment Orchestrator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cleanverse Hackathon
            </Badge>
            <Badge variant="outline" className="text-[10px] hidden sm:flex items-center gap-1">
              Monad Testnet
            </Badge>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Hero strip */}
        <div className="mb-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-violet-500/10 to-sky-500/10 border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                Trusted AI Agent Transactions
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                4 specialized AI agents deliberate through a 5-phase protocol before executing any
                compliant aUSDC transfer on Monad. Every agent-initiated transaction has confirmed identity,
                clean funds, and auditable authorization.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">A-Pass</Badge>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">A-Token</Badge>
              <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">CCP</Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-zinc-900/50 border border-border/50">
            <TabsTrigger value="deliberate" className="text-xs sm:text-sm">
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Deliberate
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Agent Council
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="infra" className="text-xs sm:text-sm">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Cleanverse Stack
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Deliberate ── */}
          <TabsContent value="deliberate" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Transaction Form + Controls */}
              <div className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Initiate Transaction
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure a compliant aUSDC transfer for council deliberation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sender Wallet</Label>
                      <Input
                        className="text-xs h-9 font-mono"
                        value={senderAddr}
                        onChange={(e) => setSenderAddr(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Recipient Wallet</Label>
                      <Input
                        className="text-xs h-9 font-mono"
                        value={recipientAddr}
                        onChange={(e) => setRecipientAddr(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Amount (aUSDC)</Label>
                        <Input
                          className="text-xs h-9"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Chain</Label>
                        <Input className="text-xs h-9 bg-zinc-800" value="Monad" disabled />
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simulateRejection}
                        onChange={(e) => setSimulateRejection(e.target.checked)}
                        className="rounded border-zinc-700"
                      />
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Simulate compliance failure (demo)
                    </label>
                    <Button
                      onClick={runDeliberation}
                      disabled={isRunning || !senderAddr || !recipientAddr || !amount}
                      className="w-full"
                      size="sm"
                    >
                      {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      {isRunning ? 'Council Deliberating...' : 'Start Council Protocol'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Session Info */}
                {session && (
                  <Card className="border-border/50 animate-slide-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center justify-between">
                        <span>Session {session.id}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            session.status === 'completed'
                              ? 'border-emerald-500/30 text-emerald-400'
                              : session.status === 'rejected'
                              ? 'border-red-500/30 text-red-400'
                              : 'border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {session.status.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <PhaseIndicator currentPhase={session.currentPhase} total={DELIBERATION_PHASES.length} />
                      {session.consensusScore !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Consensus: <span className="text-foreground font-medium">{Math.round(session.consensusScore * 100)}%</span> quorum
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Stats */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Session Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Total', value: stats.sessions, color: 'text-foreground' },
                        { label: 'Approved', value: stats.approved, color: 'text-emerald-400' },
                        { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-2 rounded-lg bg-zinc-900/50">
                          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Deliberation Feed */}
              <div className="lg:col-span-2 space-y-4">
                {/* Agent Status Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['identity', 'compliance', 'treasury', 'audit'] as AgentRole[]).map((role) => {
                    const agentMsg = session?.messages.filter((m) => m.agent === role).pop();
                    const isActive = activeAgent === role || (session?.status === 'deliberating' && !agentMsg && role === 'identity');
                    return (
                      <TooltipProvider key={role}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50 cursor-default">
                              <div className={`w-2 h-2 rounded-full ${
                                agentMsg
                                  ? agentMsg.verdict === 'approve'
                                    ? 'bg-emerald-400'
                                    : 'bg-red-400'
                                  : isActive
                                  ? `${AGENT_DOT_COLORS[role]} animate-pulse`
                                  : 'bg-zinc-700'
                              }`} />
                              <span className="text-xs font-medium truncate">{AGENT_CONFIGS[role].name.split(' ')[0]}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{AGENT_CONFIGS[role].name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {agentMsg ? `${agentMsg.verdict} (${Math.round(agentMsg.confidence * 100)}%)` : isActive ? 'Active' : 'Waiting'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>

                {/* Consensus Banner */}
                {session && <ConsensusBanner session={session} />}

                {/* Message Feed */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Deliberation Feed
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {session
                        ? `${session.messages.length} messages across ${session.currentPhase} phases`
                        : 'Start a transaction to see the council deliberate'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MessageFeed messages={session?.messages ?? []} />
                  </CardContent>
                </Card>

                {/* 5-Phase Protocol Visualization */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">5-Phase Council Protocol</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {DELIBERATION_PHASES.map((phase, i) => {
                        const phaseComplete = session && session.currentPhase > i;
                        const phaseActive = session && session.currentPhase === i + 1 && session.status === 'deliberating';
                        return (
                          <div key={i} className="flex items-center">
                            <div
                              className={`flex flex-col items-center min-w-[100px] p-2.5 rounded-lg border transition-all ${
                                phaseComplete
                                  ? `${AGENT_COLORS[phase.agent as AgentRole]} border`
                                  : phaseActive
                                  ? 'border-primary/50 bg-primary/5 animate-pulse-glow'
                                  : 'border-zinc-800/50 bg-zinc-900/30'
                              }`}
                            >
                              <div className={`mb-1 ${phaseComplete || phaseActive ? '' : 'opacity-30'}`}>
                                {AGENT_ICONS[phase.agent as AgentRole]}
                              </div>
                              <span className="text-[10px] font-medium text-center">{phase.name}</span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">Phase {phase.phase}</span>
                              {phaseComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-1" />}
                              {phaseActive && <Loader2 className="w-3 h-3 text-primary mt-1 animate-spin" />}
                            </div>
                            {i < DELIBERATION_PHASES.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-700 mx-1 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: Agent Council ── */}
          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['identity', 'compliance', 'treasury', 'audit'] as AgentRole[]).map((role) => {
                const agentMsg = session?.messages.filter((m) => m.agent === role).pop();
                return (
                  <AgentCard
                    key={role}
                    role={role}
                    message={agentMsg}
                    isActive={activeAgent === role}
                  />
                );
              })}
            </div>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">How CouncilPay Works</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-3">
                <p>
                  <strong className="text-foreground">No single agent can execute a transaction.</strong> The CouncilPay protocol
                  requires all 4 specialized agents to reach consensus through a structured 5-phase deliberation before any
                  on-chain aUSDC transfer is authorized.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="font-semibold text-emerald-400 mb-1">Phase 1 — Identity Verification</p>
                    <p>The Identity Sentinel verifies the sender&apos;s A-Pass credential: active status, KYC current,
                    wallet binding validity, and absence from sanctions lists. No identity, no transaction.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="font-semibold text-amber-400 mb-1">Phase 2 — Compliance Check</p>
                    <p>The Compliance Arbiter validates A-Token transfer rules against both sender and receiver
                    A-Pass attributes: tier thresholds, group restrictions, Travel Rule data assembly, and
                    jurisdictional transfer limits.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <p className="font-semibold text-violet-400 mb-1">Phase 3 — Treasury Validation</p>
                    <p>The Treasury Warden confirms sufficient aUSDC balance, validates the settlement route,
                    ensures the 1:1 reserve ratio is maintained, and checks that the amount falls within
                    transfer limits.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
                    <p className="font-semibold text-sky-400 mb-1">Phase 4-5 — Audit &amp; Consensus</p>
                    <p>The Audit Scribe generates the immutable audit trail, assembles the Travel Rule report,
                    then all agents cast final votes. A 75% supermajority is required to authorize execution.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: History ── */}
          <TabsContent value="history" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Deliberation History
                </CardTitle>
                <CardDescription className="text-xs">
                  Past council deliberation sessions with full audit trails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No sessions yet.</p>
                    <p className="text-xs mt-1">Run a deliberation to see it recorded here.</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
                        >
                          <div className="flex items-center gap-3">
                            {h.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <div>
                              <p className="text-xs font-medium">{h.id}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {h.transactionType} {h.amount} {h.tokenSymbol} | {h.messages.length} messages |{' '}
                                {h.consensusScore !== undefined ? `${Math.round(h.consensusScore * 100)}% consensus` : '--'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-medium ${h.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {h.status.toUpperCase()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(h.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: Cleanverse Stack ── */}
          <TabsContent value="infra" className="space-y-4">
            <CleanverseStatusPanel />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* A-Pass Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <CardTitle className="text-sm">A-Pass</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    Identity tokens bound to wallets of verified users. Bank-verified identity proofs
                    stored locally (no PII on-chain), with revocable credentials and expiration controls.
                  </p>
                  <div className="space-y-1">
                    {['Bank-verified identity NFT', 'Local-only PII storage', 'Revocable + expirable', 'Wallet-bound credentials', 'Tier & group classification'].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] pt-1">
                    Used by <span className="text-foreground">Identity Sentinel</span> agent in Phase 1
                  </p>
                </CardContent>
              </Card>

              {/* A-Token Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-sm">A-Token</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    Digital representation of verified stablecoins with clean origination, programmable
                    compliance rules, and full traceability. Wrapped A-Tokens (e.g., aUSDC) are 1:1 with
                    native tokens.
                  </p>
                  <div className="space-y-1">
                    {['Programmable compliance rules', '1:1 wrapped token minting', 'Tier-based transfer restrictions', 'Full transaction traceability', 'Automatic compliance enforcement'].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] pt-1">
                    Used by <span className="text-foreground">Compliance Arbiter</span> + <span className="text-foreground">Treasury Warden</span> agents
                  </p>
                </CardContent>
              </Card>

              {/* CCP Protocol Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-sky-400" />
                    <CardTitle className="text-sm">CCP Protocol</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    Embedded pre-transaction rule checks, Travel Rule data assembly, and audit-ready
                    extractable reports. On-chain compliance pools via the APass Compliance Validator contract.
                  </p>
                  <div className="space-y-1">
                    {['Pre-transaction rule checks', 'Travel Rule data & reports', 'On-chain compliance pools', 'Audit-ready extraction', 'Validator pool governance'].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-sky-400" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] pt-1">
                    Used by <span className="text-foreground">Audit Scribe</span> agent in Phases 4-5
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Architecture Flow */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Integration Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 flex-wrap py-4 text-xs">
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                    AI Agent
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                  <div className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium">
                    Council Protocol
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                  <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                    Cleanverse API
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                  <div className="px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-medium">
                    A-Pass + A-Token
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                  <div className="px-3 py-2 rounded-lg bg-zinc-700/50 border border-zinc-600/50 text-foreground font-medium">
                    Monad
                  </div>
                </div>
                <div className="text-center text-[10px] text-muted-foreground mt-2">
                  AES-256-CBC encrypted requests | A-Pass identity verification | A-Token compliance rules | Travel Rule reports | CCP Protocol pools
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>CouncilPay by </span>
            <span className="font-medium text-foreground">Cubiczan</span>
            <span>|</span>
            <span>Cleanverse Build Hackathon — Track 2: Trusted AI Agent Transactions</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Powered by Cleanverse A-Pass, A-Token &amp; CCP Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}