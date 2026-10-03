# CouncilPay — Lean verification notes

Model: `verification/CouncilPay.lean` (Lean 4.34.1, core library only).
Compiles with `~/.elan/bin/lean CouncilPay.lean`, exit 0 (only harmless
`if_pos`/`if_neg` deprecation warnings). No `sorry`/`admit`/`native_decide`;
`#print axioms` on the headline theorems shows **no axioms at all**
(`advance_never_issues_tx` uses only `propext`). No source files were
modified — `git status` shows only the new `verification/` directory.

## The headline fact about this repo

**There is no payout.** No code path in the repository moves money: the
Cleanverse client (`src/lib/cleanverse/api.ts`, ll. 36–152) exposes
A-Pass/A-Token/faucet/query/Travel-Rule endpoints but no transfer call,
and nothing else submits a transaction. The only "execution" artefact is
the `txHash` string that `run_all` **fabricates** from
`Date.now()` + `Math.random()` (`route.ts:77`). The Lean model therefore
counts txHash issuances (`Session.txCount`) as executions — every
"payout" property below is about that artefact and about the verdict
that gates it. The README's claims ("before any on-chain aUSDC transfer
is executed", "transaction cleared for execution") describe behaviour
that does not exist in the code.

## Definition → source mapping

| Lean definition | Source |
|---|---|
| `Role`, `Verdict`, `Msg` | `src/lib/agents/types.ts:3, 9, 5–12` |
| `countedV` | `src/lib/agents/deliberation.ts:100` (verdict ∉ {abstain, pending}) |
| `approvalsV` | `deliberation.ts:101` |
| `consensusV` / `consensus` | `deliberation.ts:96–110` (score l. 103, `>= 0.75` l. 106) |
| `flagVerdict` | `deliberation.ts:17–19` (`externalData?.valid !== false`) |
| `phaseMsgs` | `deliberation.ts:61–94` + `types.ts:102–108` (phase table); one primary message per phase, phase 5 adds the other three agents |
| `runAllMsgs` | `route.ts:66–71` |
| `Status`, `Session`, `fresh` | `types.ts:14–30`; `route.ts:14–30` |
| `finish` | `route.ts:49–56` (advance) and `route.ts:73–79` (run_all) |
| `advance` | `route.ts:32–59` (guards ll. 35–43; per-call `externalData` l. 44) |
| `runAll` | `route.ts:61–82` (txHash l. 77) |

Modelling choices: messages are reduced to (agent, verdict) because the
tally reads nothing else; the float score comparison is modelled as the
equivalent Nat comparison `4·approvals ≥ 3·counted` (exact at these
magnitudes — boundary quotients are exactly 3/4, off-boundary gaps are
≥ 1/(4·total)); route error returns (400/404) leave the stored session
unmutated in the code, so the model leaves the session unchanged;
`advance`'s completion shares `run_all`'s tally/status logic via
`finish`, differing only in txHash issuance, exactly as in the code.

## Theorem → property mapping

| Theorem | Property | Verdict |
|---|---|---|
| `consensusV_iff` | Tally = "nonempty counted ∧ approvals/counted ≥ 3/4" — and nothing else | Holds (by construction; exposes that no other check exists) |
| `consensus_eq_of_verdicts_eq` | Tally depends only on the verdict sequence, never on who voted | Holds — root of F2/F3 |
| `single_approve_authorizes` | "Payout only after approval threshold met by distinct approvers" | **FAILS** — one approving message from one agent authorizes |
| `one_agent_three_votes` | Approver deduplication | **FAILS** — 3 votes from audit alone, other 3 members silent, authorizes |
| `three_of_four_boundary` | 75% threshold is inclusive at exactly 3/4 | Holds |
| `two_of_three_fails` | 2/3 < 3/4 rejects | Holds |
| `abstention_shrinks_denominator` | Abstain/pending excluded before the fraction | Holds — quorum is over *counted messages*, so abstention lowers the bar |
| `empty_consensus_rejected`, `all_abstain_rejected` | Empty tally rejects (score-0 branch) | Holds — the tally's one fail-closed corner |
| `runall_flag_true_approves`, `runall_flag_false_rejects` | Single-flag `run_all` outcome | Holds — and shows the flag alone decides (F3) |
| `audit_double_vote_in_standard_flow` | One agent, one vote | **FAILS** in the standard flow itself — audit is counted twice (phases 4 and 5) |
| `identity_reject_overridden` | README: identity rejection blocks the transaction | **FAILS** on the `advance` path — 7 approvals / 1 rejection ⇒ approved |
| `advance_terminal_fixed` | Terminal sessions can't be advanced | Holds (advance only) |
| `advance_never_issues_tx` | `advance` never mints a txHash | Holds — see F6 |
| `advance_mid_stays_deliberating`, `advance_last_completes` | Phase progression is 1-per-call, termination exactly at phase 5 | Holds |
| `double_execution` | Payout exactly-once per proposal | **FAILS** — two `run_all` calls mint two txHashes for one proposal |
| `advance_trace_rejected` | Trace [t,t,t,t,f] rejects (4/8) | Holds |
| `rejected_resurrected` | Rejected proposals can never pay out | **FAILS** — one `run_all` flips the rejected trace to completed + txHash (12/16 = exactly 3/4) |
| `runall_false_then_true_stays_rejected` | Symmetric resurrection after a full rejecting `run_all` | Holds — accumulated rejections veto (8/16 = 1/2); verdicts depend on whole call history |
| `outcome_ignores_amount_and_initiator` | Paid amount ≤ approved amount; approval bound to proposer/payee | **Vacuous/FAILS** — amount and initiator are never read after `create`; the outcome is provably independent of both |

There is no expiry mechanism to model: no status, field, or check in
the repo expires a session (`createdAt` is written at `route.ts:27` and
never read for gating), so "expired proposals can never pay out" is
not false but *absent* — see F7.

## Findings

**F1 — No payout exists; the txHash is fabricated.** `route.ts:77`
builds `txHash` from the current time and a random suffix whenever
`run_all` approves; it is displayed in the UI (`src/app/page.tsx:233`)
as a transaction hash. README lines about executing on-chain aUSDC
transfers are aspirational. Any property of the form "payout happens
only if …" is currently a property of this string assignment.

**F2 — Consensus counts messages, not agents; approvers are never
deduplicated.** `calculateConsensus` (`deliberation.ts:96–110`) filters
and counts the raw message list. Proved counterexamples:
`single_approve_authorizes`, `one_agent_three_votes`. Within the
routes the attainable distortion is double-counting: audit casts 2 of
the 8 counted votes in every standard run
(`audit_double_vote_in_standard_flow`), because it is primary in both
phase 4 and phase 5. If vote generation ever becomes per-agent real
(the README's stated production direction), F2 becomes directly
exploitable, especially combined with F10.

**F3 — Every "agent" verdict is one caller-supplied boolean; the
proposer effectively self-approves.** `generateAgentResponse` sets
`verdict = externalData?.valid !== false ? 'approve' : 'reject'`
(`deliberation.ts:17–19`) for all four agents and all five phases.
`externalData` comes verbatim from the API request body (`route.ts:44`,
`route.ts:67`; the UI sends `valid: !simulateRejection`,
`page.tsx:368–372`). The route performs **no authentication or
authorization of any kind**, and `initiator` is an unchecked string
defaulting to `'0xUnknown'` (`route.ts:17`). There is therefore no
proposer/approver separation to verify: the same unauthenticated
caller creates the proposal and supplies the flag that "approves" it
(`runall_flag_true_approves`). A-Pass/KYC checks exist only as prose
strings inside generated messages (and unused imports of
`verifyAPass`/`queryAPass` at `deliberation.ts:2`, never called).

**F4 — An identity rejection is not a veto (advance path).**
`advance` accepts fresh `externalData` per phase, so phases can
disagree: identity rejecting in phase 1 while phases 2–5 approve
yields 7/8 ⇒ approved (`identity_reject_overridden`). This contradicts
the README demo description and `page.tsx`'s "No identity, no
transaction" copy. In the UI's single-flag `run_all` flow all votes
share one flag, so the documented behaviour appears to hold there —
it is an artefact of the demo driver, not of the protocol.

**F5 — `run_all` has no status guard: double execution and
resurrection.** `advance` refuses non-deliberating sessions
(`route.ts:35–37`); `run_all` checks only existence (`route.ts:62–64`)
and re-runs all phases, appending to the accumulated messages.
Consequences, both proved: re-running on a completed session mints a
second txHash (`double_execution` — exactly-once fails), and a
session rejected via `advance` can be flipped to completed with a
txHash by one `run_all` (`rejected_resurrected` — rejected is not
terminal). The mirror image also holds
(`runall_false_then_true_stays_rejected`): because messages are never
cleared, a session's verdict is a function of its entire call history,
not of any single council round.

**F6 — The `advance` path never issues a txHash.** Approval via five
`advance` calls sets `finalVerdict`/`status`/`completedAt`
(`route.ts:51–54`) but leaves `txHash` undefined — two different
"approved" end states depending on which driver was used.

**F7 — No expiry, no session lifecycle management.** Sessions live in
a module-level in-memory `Map` (`route.ts:6`) forever: no TTL, no
deletion, no persistence (a restart wipes all state; multiple server
instances would diverge). Session ids are
`CP-${Date.now().toString(36)}` (`route.ts:16`) — two creates within
the same millisecond collide and the second silently overwrites the
first in the Map.

**F8 — Amount and recipient are never validated or bound.**
`amount` is an optional free-form string (`types.ts:19`), copied from
the request and thereafter only interpolated into prose; it is never
parsed, compared to a balance/limit, or tied to the verdict
(`outcome_ignores_amount_and_initiator`). The Treasury Warden's
"sufficient balance / within limits" checks (`types.ts:63–69`) are
display text. So "amounts paid never exceed the approved amount" is
unprovable in principle — the system approves an uninterpreted string.

**F9 — The status type lies about the lifecycle.** `types.ts:22`
declares `'approved' | 'executing' | 'failed'` statuses that no code
assigns; the real machine is `deliberating → completed | rejected`
(`route.ts:23, 53, 75`), with `completed` doing double duty for
"approved and (on one path) executed". Also `finalVerdict` uses
`'approved'` while `status` uses `'completed'` for the same event.

**F10 — Abstentions shrink the quorum denominator.**
`calculateConsensus` drops abstain/pending before dividing
(`abstention_shrinks_denominator`). Generated votes never abstain
today, but the tally is written as a general function and the agent
configs anticipate real agents; with abstention, "75% supermajority"
can be met by a minority of the council.

**F11 — Cosmetic randomness presented as analysis.** Vote confidence
is `Math.random()`-based (`deliberation.ts:18`) and ignored by the
tally; phase-5 confirmation timestamps are jittered
(`deliberation.ts:88`). The displayed `consensusScore` is the rounded
message fraction, labelled as council consensus in the UI.

**F12 — Zero tests, and the risky parts are exactly the untested
parts.** No test files, no test script (`package.json` has only
dev/build/start/lint). Uncovered, at minimum: consensus boundary and
denominator behaviour (`calculateConsensus` is a pure function — the
cheapest possible test target), the missing `run_all` status guard,
per-phase flag mixing on `advance`, session-id collision, and the
amount/initiator non-binding. Until F1 is addressed there is also no
execution layer whose failure modes (partial transfer, retries) could
be tested at all.
