# CouncilPay — Multi-Agent Compliant Payment Orchestrator

> **Cleanverse Build: Verified Finance Hackathon — Track 2: Trusted AI Agent Transactions**

CouncilPay ensures every AI agent-initiated transaction has **confirmed identity**, **clean funds**, and **auditable authorization** by requiring 4 specialized AI agents to reach consensus through a structured 5-phase deliberation protocol before any on-chain aUSDC transfer is executed.

## How It Works

No single agent can execute a transaction. The CouncilPay protocol mandates all 4 agents deliberate and vote:

| Phase | Agent | Role |
|-------|-------|------|
| 1 | **Identity Sentinel** | Verifies A-Pass credentials, KYC status, wallet binding |
| 2 | **Compliance Arbiter** | Validates A-Token rules, Travel Rule data, jurisdictional limits |
| 3 | **Treasury Warden** | Confirms aUSDC balance, settlement route, 1:1 reserves |
| 4-5 | **Audit Scribe** | Generates audit trail, Travel Rule report, runs final consensus vote |

A **75% supermajority** is required to authorize execution.

## Cleanverse Integration

CouncilPay integrates the full Cleanverse compliance stack:

- **A-Pass** — Identity tokens bound to verified wallets (bank-verified, local-only PII, revocable)
- **A-Token** — Compliant stablecoins (aUSDC) with programmable rules and full traceability
- **CCP Protocol** — Pre-transaction rule checks, Travel Rule data, audit-ready reports

### API Integration

All Cleanverse API calls use AES-256-CBC encryption (PKCS5Padding, zero IV) with the provided sandbox API key. Encrypted payloads are sent as `{"data": "<base64>"}` with the `api-id` header — the API key itself is never transmitted.

**Endpoints integrated:**
- `POST /generate_apass` — Issue identity credentials
- `POST /query_apass` — Verify wallet identity
- `POST /verify_apass` — Check A-Token transfer eligibility
- `POST /atoken/launch` — Issue A-Tokens
- `POST /query_deposit_atoken_list` — Query supported tokens
- `POST /faucet` — Request test tokens
- `POST /validator/verify` — CCP compliance pool verification
- `POST /download_travel_rule` — Export Travel Rule reports

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes, crypto-js (AES encryption)
- **Chain**: Monad Testnet
- **Compliance**: Cleanverse API v3 (UAT Sandbox)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cleanverse/
│   │   │   ├── apass/route.ts      # A-Pass management
│   │   │   ├── atoken/route.ts     # A-Token management
│   │   │   ├── faucet/route.ts     # Test token faucet
│   │   │   ├── transactions/route.ts  # Tx queries & Travel Rule
│   │   │   └── validator/route.ts  # CCP Protocol pools
│   │   └── council/
│   │       └── deliberate/route.ts # Multi-agent deliberation engine
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # Dashboard (single-page app)
├── lib/
│   ├── agents/
│   │   ├── types.ts                # Agent configs, session types, phases
│   │   └── deliberation.ts         # Deliberation engine logic
│   └── cleanverse/
│       ├── crypto.ts               # AES-256-CBC encryption utilities
│       └── api.ts                  # Full Cleanverse API client
└── components/
    └── ui/                         # shadcn/ui component library
```

## Running Locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Cleanverse credentials
npm run dev
# Open http://localhost:3000
```

## Demo

1. **Approval flow**: Click "Start Council Protocol" → watch 4 agents deliberate across 5 phases → consensus reached → transaction approved
2. **Rejection flow**: Check "Simulate compliance failure" → run protocol → identity agent rejects → consensus fails → transaction blocked
3. **Agent Council tab**: See each agent's checks, capabilities, and verdicts
4. **Cleanverse Stack tab**: View A-Pass, A-Token, and CCP Protocol details + API connectivity status

## Hackathon Submission

- **Track**: Trusted AI Agent Transactions
- **Team**: Cubiczan
- **Chain**: Monad Testnet
- **Cleanverse Stack**: A-Pass + A-Token + CCP Protocol

## License

MIT

---

Built for the [Cleanverse Build: Verified Finance Hackathon](https://cleanverse.com/hackathon) supported by Monad Foundation.