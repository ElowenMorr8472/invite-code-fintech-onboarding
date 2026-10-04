import test from "node:test";
import assert from "node:assert/strict";
import { onboardMember } from "./invite_onboarding.ts";

test("rejects an invite outside the education cohort before network calls", async () => {
  await assert.rejects(
    () => onboardMember({ email: "learner@example.com", password: "secret", name: "Learner", inviteCode: "OTHER-1", widgetRecordId: "widget", captchaToken: "token" }),
    /not valid/
  );
});

test("sends the widget record ID with the captcha token", async () => {
  const originalFetch = globalThis.fetch;
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(String(options?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ ok: false, error: { code: "INVALID_CAPTCHA" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  };
  try {
    await assert.rejects(
      () => onboardMember({ email: "learner@example.com", password: "secret", name: "Learner", inviteCode: "EDU-1", widgetRecordId: "widget-1", captchaToken: "token" }),
      /INVALID_CAPTCHA/
    );
    assert.deepEqual(payload, { widget_record_id: "widget-1", token: "token", action: "signup" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
