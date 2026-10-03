/-
  CouncilPay — Lean 4 model of the multi-agent payment approval flow.

  Modelled from the CODE (not the README) of:
    * src/lib/agents/types.ts        — session/message types
    * src/lib/agents/deliberation.ts — vote generation + consensus tally
    * src/app/api/council/deliberate/route.ts — session lifecycle (create/advance/run_all)

  Faithfulness notes:
  * `calculateConsensus` (deliberation.ts:96-110) compares a float score
    `approvals / total` against `0.75`. For the message counts this system
    can produce, the float comparison coincides exactly with the Nat
    comparison `4 * approvals ≥ 3 * total`: at the boundary the true
    quotient is exactly 3/4 (representable in binary floating point, and
    IEEE division is correctly rounded), and off the boundary the gap is
    at least 1/(4*total), dwarfing any rounding error. The display-only
    rounding of `score` (l. 107) does not affect the verdict.
  * Every generated vote's verdict is `externalData?.valid !== false`
    (deliberation.ts:17-19) — one caller-supplied boolean. `phaseMsgs`
    below reproduces the exact message multiset each phase produces
    (deliberation.ts:61-94): one message from the phase's primary agent,
    and in phase 5 additionally one from each remaining agent.
  * There is NO payout/transfer code path anywhere in the repo (the
    Cleanverse client in src/lib/cleanverse/api.ts exposes no transfer
    endpoint). The only "execution" artefact is the `txHash` string that
    `run_all` fabricates (route.ts:77). The model therefore counts
    txHash issuances (`txCount`) as executions.
  * Error returns of the route (400/404) leave the stored session
    unmutated in the code, so the model leaves the session unchanged.
-/

namespace CouncilPay

/-- Agent roles, src/lib/agents/types.ts:3. -/
inductive Role where
  | identity | compliance | treasury | audit
  deriving DecidableEq, BEq, Repr

/-- Vote values, src/lib/agents/types.ts:9. -/
inductive Verdict where
  | approve | reject | abstain | pending
  deriving DecidableEq, BEq, Repr

/-- AgentMessage (types.ts:5-12), restricted to the two fields that
    `calculateConsensus` reads. Content/confidence/timestamp never
    influence the tally. -/
structure Msg where
  agent : Role
  verdict : Verdict
  deriving DecidableEq, Repr

/-- The verdict type of `calculateConsensus` (deliberation.ts:97). -/
inductive Outcome where
  | approved | rejected
  deriving DecidableEq, Repr

/-! ## Consensus tally — deliberation.ts:96-110 -/

/-- Votes that count: verdict ∉ {abstain, pending} (deliberation.ts:100).
    Counted as a list of verdicts: the tally reads nothing else. -/
def countedV (vs : List Verdict) : List Verdict :=
  vs.filter (fun v => decide (v ≠ Verdict.abstain ∧ v ≠ Verdict.pending))

/-- Approvals among the counted votes (deliberation.ts:101). -/
def approvalsV (vs : List Verdict) : Nat :=
  (countedV vs).filter (fun v => decide (v = Verdict.approve)) |>.length

/-- The consensus function on verdict lists: approved iff the counted
    list is nonempty and approvals/total ≥ 3/4 (deliberation.ts:103-106).
    Note what is absent: no grouping or deduplication by agent, no
    minimum number of distinct voters, no per-role weights. -/
def consensusV (vs : List Verdict) : Outcome :=
  if (countedV vs).length > 0 ∧ 4 * approvalsV vs ≥ 3 * (countedV vs).length
  then Outcome.approved
  else Outcome.rejected

/-- `calculateConsensus` as exported: a function of the messages'
    verdicts only. -/
def consensus (msgs : List Msg) : Outcome :=
  consensusV (msgs.map (·.verdict))

/-- The tally is exactly the stated Nat condition — nothing more
    (in particular, no distinct-agent quorum hides inside it). -/
theorem consensusV_iff (vs : List Verdict) :
    consensusV vs = Outcome.approved ↔
      (countedV vs).length > 0 ∧ 4 * approvalsV vs ≥ 3 * (countedV vs).length := by
  unfold consensusV
  by_cases h : (countedV vs).length > 0 ∧ 4 * approvalsV vs ≥ 3 * (countedV vs).length
  · rw [if_pos h]
    exact ⟨fun _ => h, fun _ => rfl⟩
  · rw [if_neg h]
    constructor
    · intro hcontra
      cases hcontra
    · intro hconj
      exact (h hconj).elim

/-- Consensus is blind to who cast the votes: equal verdict sequences
    give equal outcomes, whatever agents/phases produced them. -/
theorem consensus_eq_of_verdicts_eq {ms₁ ms₂ : List Msg}
    (h : ms₁.map (·.verdict) = ms₂.map (·.verdict)) :
    consensus ms₁ = consensus ms₂ := by
  unfold consensus
  rw [h]

/-- COUNTEREXAMPLE to a distinct-agent supermajority: a single approving
    message authorizes. The tally has no quorum floor at all. -/
theorem single_approve_authorizes :
    consensus [⟨Role.audit, Verdict.approve⟩] = Outcome.approved := by decide

/-- COUNTEREXAMPLE: three votes, all from the SAME agent (audit), with
    the other three council members never voting, still authorize —
    approvers are never deduplicated. -/
theorem one_agent_three_votes :
    consensus [⟨Role.audit, Verdict.approve⟩,
               ⟨Role.audit, Verdict.approve⟩,
               ⟨Role.audit, Verdict.approve⟩] = Outcome.approved := by decide

/-- The 3/4 boundary is inclusive: exactly 3 of 4 counted votes pass. -/
theorem three_of_four_boundary :
    consensusV [Verdict.approve, Verdict.approve, Verdict.approve, Verdict.reject]
      = Outcome.approved := by decide

/-- 2 of 3 counted votes (2/3 < 3/4) fail. -/
theorem two_of_three_fails :
    consensusV [Verdict.approve, Verdict.approve, Verdict.reject]
      = Outcome.rejected := by decide

/-- Abstentions and pending votes shrink the denominator (they are
    filtered out before the fraction is taken): 3 approvals plus one
    abstention is 3/3 counted, not 3/4 of the council. -/
theorem abstention_shrinks_denominator :
    consensusV [Verdict.approve, Verdict.approve, Verdict.approve, Verdict.abstain]
      = Outcome.approved := by decide

/-- The empty tally rejects (the `total > 0 ? … : 0` branch). This is
    the one fail-closed corner of the tally. -/
theorem empty_consensus_rejected :
    consensus ([] : List Msg) = Outcome.rejected := by decide

/-- An all-abstain tally also rejects. -/
theorem all_abstain_rejected :
    consensusV [Verdict.abstain, Verdict.pending] = Outcome.rejected := by decide

/-! ## Vote generation — deliberation.ts:7-94 -/

/-- Every generated message carries this verdict (deliberation.ts:17-19):
    `approve` if the caller-supplied `externalData.valid` is not `false`,
    else `reject`. One boolean decides every agent's vote. -/
def flagVerdict (valid : Bool) : Verdict :=
  if valid then Verdict.approve else Verdict.reject

/-- The exact messages `runDeliberationPhase` appends per phase index
    (deliberation.ts:61-94; DELIBERATION_PHASES in types.ts): one message
    from the phase's primary agent; phase 5 (index 4) adds one message
    from each of the other three agents. -/
def phaseMsgs (valid : Bool) : Nat → List Msg
  | 0 => [⟨Role.identity, flagVerdict valid⟩]
  | 1 => [⟨Role.compliance, flagVerdict valid⟩]
  | 2 => [⟨Role.treasury, flagVerdict valid⟩]
  | 3 => [⟨Role.audit, flagVerdict valid⟩]
  | 4 => [⟨Role.audit, flagVerdict valid⟩,
          ⟨Role.identity, flagVerdict valid⟩,
          ⟨Role.compliance, flagVerdict valid⟩,
          ⟨Role.treasury, flagVerdict valid⟩]
  | _ => []

/-- All messages one `run_all` pass appends (route.ts:66-71). -/
def runAllMsgs (valid : Bool) : List Msg :=
  phaseMsgs valid 0 ++ phaseMsgs valid 1 ++ phaseMsgs valid 2 ++
  phaseMsgs valid 3 ++ phaseMsgs valid 4

/-- In the single-flag flow the flag alone decides the outcome:
    `valid = true` gives 8/8 approvals… -/
theorem runall_flag_true_approves :
    consensus (runAllMsgs true) = Outcome.approved := by decide

/-- …and `valid = false` gives 0/8. No agent contributes any independent
    judgement: the deliberation is a function of the caller's boolean. -/
theorem runall_flag_false_rejects :
    consensus (runAllMsgs false) = Outcome.rejected := by decide

/-- Even inside the standard flow the "one agent, one vote" picture is
    false: the audit agent's verdict is counted TWICE (phase 4 primary
    and phase 5 primary), every other agent's once per phase-5 plus
    their own phase — audit appears in 2 of the 8 counted messages. -/
theorem audit_double_vote_in_standard_flow :
    List.length (List.filter (fun m => decide (m.agent = Role.audit)) (runAllMsgs true))
      = 2 := by decide

/-- COUNTEREXAMPLE to the documented rejection flow (README "Demo" and
    page.tsx "No identity, no transaction"): on the `advance` path each
    phase takes its OWN caller-supplied flag. If phase 1 runs with
    `valid = false` the Identity Sentinel rejects — yet if phases 2-5
    run with `valid = true`, the tally is 7 approvals / 1 rejection and
    the transaction is APPROVED. A rejection by the identity agent is
    just one counted message among eight; it is not a veto. -/
theorem identity_reject_overridden :
    consensus [⟨Role.identity, Verdict.reject⟩,
               ⟨Role.compliance, Verdict.approve⟩,
               ⟨Role.treasury, Verdict.approve⟩,
               ⟨Role.audit, Verdict.approve⟩,
               ⟨Role.audit, Verdict.approve⟩,
               ⟨Role.identity, Verdict.approve⟩,
               ⟨Role.compliance, Verdict.approve⟩,
               ⟨Role.treasury, Verdict.approve⟩] = Outcome.approved := by decide

/-! ## Session lifecycle — route.ts:14-82 -/

/-- Session statuses that the code actually assigns. The type
    (types.ts:22) also lists `approved`, `executing` and `failed`;
    no code path ever assigns them. -/
inductive Status where
  | deliberating | completed | rejected
  deriving DecidableEq, Repr

/-- DeliberationSession (types.ts:14-30), restricted to the fields the
    lifecycle reads or writes. `amount`/`initiator` are carried verbatim
    from the create request (route.ts:17-18) and never read again.
    `txCount` counts fabricated txHash assignments (route.ts:77) — the
    model's stand-in for "payout executed", there being no transfer
    code path in the repo. -/
structure Session where
  status : Status
  msgs : List Msg
  phases : Nat
  txCount : Nat
  amount : String
  initiator : String
  deriving Repr

/-- `create` (route.ts:14-30). -/
def fresh (amount initiator : String) : Session :=
  { status := Status.deliberating, msgs := [], phases := 0, txCount := 0,
    amount := amount, initiator := initiator }

/-- Shared completion logic of `advance` (route.ts:49-56) and `run_all`
    (route.ts:73-79): tally ALL accumulated messages, set the terminal
    status, and — only on the `run_all` path (`issueTx = true`) — mint
    a txHash when approved. -/
def finish (s : Session) (issueTx : Bool) : Session :=
  { s with
    status := if consensus s.msgs = Outcome.approved
              then Status.completed else Status.rejected,
    txCount := s.txCount +
      (if issueTx = true ∧ consensus s.msgs = Outcome.approved then 1 else 0) }

/-- `advance` (route.ts:32-59): refuses (state unchanged) unless the
    session is deliberating and a phase remains; otherwise appends the
    next phase's messages — generated with THIS call's `externalData`
    flag — and finishes when the last phase completes. It never sets
    a txHash (route.ts:49-56, contrast l. 77). -/
def advance (s : Session) (valid : Bool) : Session :=
  if s.status ≠ Status.deliberating ∨ s.phases ≥ 5 then s
  else if s.phases + 1 ≥ 5 then
    finish { s with msgs := s.msgs ++ phaseMsgs valid s.phases,
                    phases := s.phases + 1 } false
  else
    { s with msgs := s.msgs ++ phaseMsgs valid s.phases, phases := s.phases + 1 }

/-- `run_all` (route.ts:61-82): NO status guard — it re-runs all five
    phases on any existing session, appending a fresh set of messages
    to whatever is already accumulated, re-tallies everything, and
    mints a new txHash if the result is approved. -/
def runAll (s : Session) (valid : Bool) : Session :=
  finish { s with msgs := s.msgs ++ runAllMsgs valid, phases := 5 } true

/-- Positive: the `advance` guard works — a terminal session cannot be
    advanced further. (The flaw is that `run_all` has no such guard.) -/
theorem advance_terminal_fixed {s : Session} (h : s.status ≠ Status.deliberating) :
    advance s valid = s := by
  unfold advance
  rw [if_pos (Or.inl h)]

/-- `advance` never issues an execution artefact, on any path. -/
theorem advance_never_issues_tx (s : Session) (valid : Bool) :
    (advance s valid).txCount = s.txCount := by
  unfold advance
  by_cases h1 : s.status ≠ Status.deliberating ∨ s.phases ≥ 5
  · rw [if_pos h1]
  · rw [if_neg h1]
    by_cases h2 : s.phases + 1 ≥ 5
    · rw [if_pos h2]
      simp [finish]
    · rw [if_neg h2]

/-- Mid-deliberation advances keep the session deliberating and move
    exactly one phase forward. -/
theorem advance_mid_stays_deliberating {s : Session}
    (hstat : s.status = Status.deliberating) (hph : s.phases < 4) (valid : Bool) :
    (advance s valid).status = Status.deliberating ∧
    (advance s valid).phases = s.phases + 1 := by
  have hguard : ¬ (s.status ≠ Status.deliberating ∨ s.phases ≥ 5) := by
    simp [hstat]; omega
  have hlt : ¬ (s.phases + 1 ≥ 5) := by omega
  unfold advance
  rw [if_neg hguard, if_neg hlt]
  exact ⟨hstat, rfl⟩

/-- The fifth advance terminates the session (one way or the other). -/
theorem advance_last_completes {s : Session}
    (hstat : s.status = Status.deliberating) (hph : s.phases = 4) (valid : Bool) :
    (advance s valid).phases = 5 ∧
    ((advance s valid).status = Status.completed ∨
     (advance s valid).status = Status.rejected) := by
  have hguard : ¬ (s.status ≠ Status.deliberating ∨ s.phases ≥ 5) := by
    simp [hstat, hph]
  unfold advance
  rw [if_neg hguard, if_pos (by omega : s.phases + 1 ≥ 5)]
  constructor
  · show s.phases + 1 = 5
    omega
  · show (if consensus (s.msgs ++ phaseMsgs valid s.phases) = Outcome.approved
            then Status.completed else Status.rejected) = Status.completed ∨
         (if consensus (s.msgs ++ phaseMsgs valid s.phases) = Outcome.approved
            then Status.completed else Status.rejected) = Status.rejected
    by_cases h : consensus (s.msgs ++ phaseMsgs valid s.phases) = Outcome.approved
    · rw [if_pos h]; exact Or.inl rfl
    · rw [if_neg h]; exact Or.inr rfl

/-- COUNTEREXAMPLE — exactly-once payout FAILS: `run_all` on an
    already-completed session runs the whole council again and mints a
    SECOND txHash for the same proposal. Nothing in the route prevents
    re-execution; the proposal pays out twice. -/
theorem double_execution :
    (runAll (runAll (fresh "100" "0xInitiator") true) true).txCount = 2 ∧
    (runAll (runAll (fresh "100" "0xInitiator") true) true).status
      = Status.completed := by decide

/-- The concrete `advance` trace with per-phase flags [true, true, true,
    true, false]: four approvals (phases 1-4), four rejections (phase 5),
    tally 4/8 < 3/4 — the session is rejected. -/
def advanceTrace : Session :=
  advance (advance (advance (advance (advance (fresh "100" "0xInitiator")
    true) true) true) true) false

theorem advance_trace_rejected :
    advanceTrace.status = Status.rejected ∧ advanceTrace.txCount = 0 := by decide

/-- COUNTEREXAMPLE — rejected is NOT terminal: the rejected session
    above is resurrected by one `run_all` call. The 8 fresh approvals
    swamp the accumulated tally (12 approvals / 16 counted = exactly
    3/4), the session flips to completed, and a txHash is minted for a
    proposal the council had rejected. -/
theorem rejected_resurrected :
    (runAll advanceTrace true).status = Status.completed ∧
    (runAll advanceTrace true).txCount = 1 := by decide

/-- The accumulation cuts the other way too: a session rejected by a
    full `run_all` (8 rejections on record) can NOT be approved by a
    later `run_all` — 8 approvals against 8 rejections is 1/2 < 3/4.
    History is never cleared, so verdicts depend on the entire call
    history of the session, not on any single council round. -/
theorem runall_false_then_true_stays_rejected :
    (runAll (runAll (fresh "100" "0xInitiator") false) true).status
      = Status.rejected ∧
    (runAll (runAll (fresh "100" "0xInitiator") false) true).txCount = 0 := by
  decide

/-- The outcome never depends on the amount or the initiator: both are
    stored verbatim at `create` and never read by generation, tally, or
    completion. Approval therefore binds neither the payee nor the sum —
    and there is no check anywhere that the initiator differs from any
    "approver" (approvers are simulated functions of the caller's own
    flag, and the route performs no authentication at all). -/
theorem outcome_ignores_amount_and_initiator
    (a₁ a₂ i₁ i₂ : String) (v : Bool) :
    (runAll (fresh a₁ i₁) v).status = (runAll (fresh a₂ i₂) v).status ∧
    (runAll (fresh a₁ i₁) v).txCount = (runAll (fresh a₂ i₂) v).txCount := by
  constructor <;> rfl

end CouncilPay
