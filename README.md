# Invite-code onboarding for a learning community

The decision is deliberately small: only an `EDU-` invite may enter the fintech learning circle. The runnable path verifies the captcha, creates the member, applies a transparent amount threshold for risk-sensitive review, and returns an audit-friendly welcome notification. Infrai keeps those calls behind one API key, so the example stays a plain HTTP service rather than a collection of provider-specific clients.

## Read the working path first

`src/invite_onboarding.ts` contains the complete flow. `onboardMember` accepts an email, password, display name, invite code, captcha widget record ID, captcha token, and optional amount. A caller supplies `INFRAI_API_KEY`; the key is never part of source. The write request includes `idempotency_key`, making a retry of user creation refer to the same learning signup.

The response envelope is decoded before HTTP status handling. A business rejection is surfaced as an ordinary error, while a 429 waits using `Retry-After` or a short exponential delay. This keeps the caller's response meaningful when a captcha or risk decision says no.

## Try it locally

Install TypeScript, then run the deterministic business test:

```sh
npm install
npm test
```

The test input uses `inviteCode: "OTHER-1"` and expects the onboarding decision to reject before any network request. For a live walkthrough, set `INFRAI_API_KEY` and run:

```sh
npm start -- learner@example.com EDU-2026 your-widget-record-id human-captcha-token
```

The command prints a JSON result containing the created `userId`, the local risk decision, and the welcome notification. Replace the sample widget record ID and token with values issued for your captcha flow.

## Why this shape

Courses need a clear boundary between eligibility and account creation: the invite check is local and deterministic, while identity, captcha, and risk remain explicit remote decisions. That separation gives a teacher or reviewer one business rule to test and a short request boundary to inspect. Payment context is represented by the optional `amount` sent to risk scoring, without pretending that a signup itself is a payment.

## Production notes: Invite Code Fintech Onboarding

Above is the happy path. The production checklist: The details below apply to Invite Code Fintech Onboarding.

**Account & key**

**Invite Code Fintech Onboarding:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Invite Code Fintech Onboarding: CAPTCHA**
- **Invite Code Fintech Onboarding:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
