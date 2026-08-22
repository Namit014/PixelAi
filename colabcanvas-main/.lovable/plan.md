## What's actually wrong (verified against Live DB + code)

I queried Live and found the previous fixes never reached production:

1. **Live `subscription_plans` is still the OLD 4-tier data** (Starter $18/500, Pro $30/1200, Business $60/4000, Enterprise $140/15000). No Creator. The May 6 migration that fixes this exists but has **not been published to Live yet** — that's why nothing changed.
2. **Live `supabase_realtime` publication does NOT include any admin table** (`payments`, `credits`, `subscriptions`, `discount_codes`, etc.). Only canvas/messages/notifications tables are published. Same reason — not published.
3. **Coupons fail in Live** because `discount_codes.applicable_plan_ids` reference real DB plan ids, but the Pricing page is rendering UI "fallback" plans whose ids (`fallback-creator`, etc.) don't match. Validation legitimately rejects them with "not valid for selected plan".
4. **Talent promo codes table (`promo_codes`) is EMPTY in Live** — that's why every talent coupon "doesn't work". The admin TalentCouponsTab writes there, but no codes have been published / no rows exist on Live.
5. **"Credits used" on a brand-new account** is a real bug. In `AppHeader.tsx`: `tierCredits=0`, `maxCredits=0`, then `Math.round(used/max*100)` = `NaN`, which feeds `strokeDashoffset` (you can see the React warning in console). The ring renders broken — that's why it looks like credits are "used" on a new account.
6. **Payment verification** — code path is correct (PayU server-to-server `curl` is wired, hash math is right). The user-visible "not verifying" symptom is downstream of the broken plan rows: `verify-payment` calls `record_payment_completion` which loads the plan by `payment.plan_id`. With Live's stale plans + checkout against bad ids, completion can fail or not credit the right tier.

## Fix plan

### 1. New-account credit ring (`src/components/layout/AppHeader.tsx`)
Guard the divide-by-zero so a free account renders cleanly: when `maxCredits <= 0`, force `percentageUsed = 0`, `percentageRemaining = 100`, label as `"0 / 0 Credits"`. Removes the `NaN` warning and the "credits used" illusion.

### 2. Re-publish to apply Live migrations
The May 6 + May 7 migrations are required for: 5-tier plans on Live, `Creator` row, realtime publication on `payments`, `credits`, `subscriptions`, `discount_codes`, `profiles`, `feedback`, `support_tickets`, `user_subscriptions`, `design_generations`, etc. **You must hit Publish** after this turn. I'll re-run them as fresh migrations so publishing definitely flips Live.

### 3. Coupon flow (Pricing + UpgradePlanModal)
- Already block checkout against `fallback-` ids — confirm and add the same guard to coupon "Apply" so users don't try to validate a coupon against a fake plan id.
- Pass the real DB `plan_id` (not the fallback) into `validate-discount-code` and `create-payment`.
- Re-validate the coupon on plan switch (different plan can have different `applicable_plan_ids`).
- Surface backend error string in the toast instead of a generic "Failed".

### 4. Talent promo codes
- Verify the admin TalentCouponsTab writes to `promo_codes` with correct columns (`code`, `discount_type`, `discount_value`, `active=true`, `scope='talent'|'all'`).
- Add a one-row seed fallback in the Test DB only so QA can prove the flow works (`COLAB10` 10% talent code).
- In `talent-apply-promo`, return the backend `error` field to the toast (currently shown), and case-normalize the lookup (already does `.toUpperCase().trim()` — good).

### 5. Payment verify hardening (`verify-payment/index.ts`)
- Don't depend on plan name from `subscription_plans` for the reverse hash — read `productinfo` straight from PayU's POST (already done; verify).
- When `record_payment_completion` throws because `pay.plan_id` doesn't exist (stale Live), update payment row to `failed` with the SQL error in `metadata.failure_reason` so the new PaymentCallback can show a meaningful message instead of "stuck verifying".
- Add a defensive log + 200 response when PayU re-posts an already-completed txn (already partially handled).

### 6. AI upgrade gate (NEW component)
- New hook `useRequireAiAccess()` that resolves `{ allowed, reason }` from the user's `credits` row: `false` if `subscription_tier === 'free'` AND `balance <= 0` AND no active subscription.
- New modal `<NoCreditsUpgradeModal />` (white, minimal, Bagoss, 2 CTAs: "Upgrade plan" → `/pricing`, "Buy credits" → opens TopUpCreditsDialog). Reused everywhere.
- Wire the gate at the entry point of every AI tool trigger:
  - Canvas AI generation (`canvas-ai-chat` / `analyze-design-canvas` callers in `src/components/canvas/*`)
  - Cosmo agent (`src/components/cosmo/*`)
  - Think pipeline + RUMi (`src/components/think/*`, `useAgentActionExecutor.ts`)
  - Cogent autonomous jobs (`useAutonomousJobs.ts`)
  - Image/edit tools, video gen, sketch-to-image, motion studio
- One central wrapper: `runAiAction(fn)` that checks credits first, opens the modal if blocked, otherwise runs `fn`. Replaces direct invocations in the listed components.

### 7. Admin realtime (already wired, verify after publish)
`useRealtimeSubscription` is already used in `Admin.tsx`. Once migration #2 lands on Live, dashboards will live-update. No code change needed beyond publish.

## Files

- **Migrations** (idempotent re-runs so publish actually fires):
  - `realtime publication + REPLICA IDENTITY FULL` for the 11 admin tables
  - `subscription_plans` upsert to the 5-tier canonical model
- **Edited**:
  - `src/components/layout/AppHeader.tsx` — NaN guard
  - `src/pages/Pricing.tsx` — pass real `plan_id`, re-validate on selection
  - `src/components/pricing/UpgradePlanModal.tsx` — same coupon guard
  - `supabase/functions/verify-payment/index.ts` — write `failure_reason` on RPC error
- **New**:
  - `src/hooks/useRequireAiAccess.ts`
  - `src/components/pricing/NoCreditsUpgradeModal.tsx`
  - `src/lib/runAiAction.ts` (central wrapper)
  - Wire-ups in: Canvas AI panels, Cosmo agent triggers, Think tool runners, Cogent job starter, image edit, video generation entry points (≈8 files)

### After this turn
**You MUST hit Publish.** Without publishing, the Live database keeps the old plans + missing realtime + missing `Creator`, and the symptoms persist no matter how much code I change.
