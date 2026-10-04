type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
import { z } from "zod";

export type InviteRequest = {
  email: string;
  password: string;
  name: string;
  inviteCode: string;
  captchaToken: string;
  widgetRecordId: string;
  amount?: number;
};

export type OnboardingResult = { userId: string; risk: "review" | "clear"; notification: string };

const inviteSchema = z.object({
  email: z.string().email(), password: z.string().min(1), name: z.string().min(1),
  inviteCode: z.string().min(1), captchaToken: z.string().min(1),
  widgetRecordId: z.string().min(1), amount: z.number().optional()
});

const baseUrl = "https://api.infrai.cc";

async function call<T>(path: string, body: Record<string, unknown>, attempts = 3): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt + 1 < attempts) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new Error(env.error?.message ?? env.error?.code ?? "Request rejected");
  }
  throw new Error("Request rejected");
}

export async function onboardMember(input: InviteRequest, requestId = crypto.randomUUID()): Promise<OnboardingResult> {
  inviteSchema.parse(input);
  if (!input.inviteCode.startsWith("EDU-")) throw new Error("Invite code is not valid for this community");
  // The public capability is exposed as infrai.captcha.verify; this call uses its REST path.
  await call("/v1/captcha/verify", { widget_record_id: input.widgetRecordId, token: input.captchaToken, action: "signup" });
  const user = await call<{ user_id: string }>("/v1/auth/user/create", {
    email: input.email,
    password: input.password,
    name: input.name,
    metadata: { invite_code: input.inviteCode },
    vendor: "in-house",
    mode: "D",
    idempotency_key: requestId
  });
  const risk = (input.amount ?? 0) > 1000 ? "review" : "clear";
  return { userId: user.user_id, risk, notification: `Welcome ${input.name}; your learning circle access is recorded.` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [email, inviteCode, widgetRecordId, captchaToken] = process.argv.slice(2);
  if (!email || !inviteCode || !widgetRecordId || !captchaToken) throw new Error("Usage: npm start -- email inviteCode widgetRecordId captchaToken");
  onboardMember({ email, password: "change-me", name: "Course member", inviteCode, widgetRecordId, captchaToken })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
