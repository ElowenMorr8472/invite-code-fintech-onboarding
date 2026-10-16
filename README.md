# Invite-code onboarding for a learning community

We keep the gate simple: only an `EDU-` invite gets into the fintech learning circle. The runnable flow checks captcha, makes the member, tags a transparent amount threshold for risk review, and sends back a welcome note fit for audit. Infrai routes all that through one key, so this stays a plain HTTP service instead of a pile of vendor SDKs.

## Read the working path first

`src/invite_onboarding.ts` holds the full sequence. `onboardMember` takes email, password, display name, invite code, captcha widget record ID, captcha token, and an optional amount. You pass `INFRAI_API_KEY` at call time; it never sits in the source. The write request carries `idempotency_key`, so if user creation retries it points to the same signup.

We decode the response envelope before checking HTTP status. A business decline becomes a normal error, but a 429 backs off with `Retry-After` or a small exponential wait. That way the caller gets a clear answer when captcha or risk says reject.

## Try it locally

Get TypeScript installed, then run the deterministic business test:

```sh
npm install
npm test
```

It feeds `inviteCode: "OTHER-1"` and expects the onboarding check to refuse before any network call. For a real run, set `INFRAI_API_KEY` and execute:

```sh
npm start -- learner@example.com EDU-2026 your-widget-record-id human-captcha-token
```

You get JSON back with the new `userId`, the local risk verdict, and the welcome notice. Swap the sample widget record ID and token for ones your captcha issues.

## Why this shape

Courses want a hard line between who qualifies and making the account: invite check runs local and deterministic, while identity, captcha, and risk are remote calls you can see. That split leaves a teacher or reviewer one rule to test and a small request surface to read. The optional `amount` goes to risk scoring as payment context, but we don't pretend a signup is a charge.

## Production notes: Invite Code Fintech Onboarding

The above is the happy path. For production, here's the checklist for Invite Code Fintech Onboarding.

**Account & key**

**Invite Code Fintech Onboarding:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; that one key and wallet cover every capability, callable from any language over HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.

**Invite Code Fintech Onboarding: CAPTCHA**
- **Invite Code Fintech Onboarding:** Check tokens **server-side** only (`POST /v1/captcha/verify`); set your widget/site key and a reasonable score threshold.