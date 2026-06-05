// ===== ElevenLabs Agents pricing — verified June 2026 =====
// Source: https://elevenlabs.io/pricing/agents
//
// Billing model: the platform charges a flat $0.080 per conversation minute.
// Each plan's included-minute allotment prepays that platform fee up to the
// allotment; minutes beyond it bill at the same $0.080/min overage rate.
// The LLM is billed SEPARATELY "at cost" — the per-minute rates in LLM_CATALOG
// below (taken from the ElevenLabs Agents model picker). So the all-in cost of
// one conversation minute = PLATFORM_PER_MIN + the chosen model's per-minute rate.
//
// If vendor pricing changes, this file is the single source of truth.

export const PLATFORM_PER_MIN = 0.08;

export const ELEVENLABS_PLANS = {
  Free:     { fee: 0,   minutes: 15 },
  Starter:  { fee: 6,   minutes: 75 },
  Creator:  { fee: 22,  minutes: 275 },
  Pro:      { fee: 99,  minutes: 1238 },
  Scale:    { fee: 299, minutes: 3738 },
  Business: { fee: 990, minutes: 12375 },
};

// LLM cost per conversation-minute, billed at cost on top of the platform fee.
export const LLM_CATALOG = {
  Anthropic: {
    "Claude Opus 4.7":   { rate: 0.1369, note: "Top reasoning quality" },
    "Claude Sonnet 4.6": { rate: 0.0822, note: "Best quality/cost balance" },
    "Claude Haiku 4.5":  { rate: 0.0274, note: "Fast, low cost" },
  },
  OpenAI: {
    "GPT-5.5":      { rate: 0.1384, note: "Premium tier" },
    "GPT-5.4":      { rate: 0.0692, note: "Mid tier" },
    "GPT-5.4 Mini": { rate: 0.0208, note: "Budget tier" },
    "GPT-5.4 Nano": { rate: 0.0056, note: "Ultra-budget" },
    "GPT-4o Mini":  { rate: 0.0041, note: "Legacy budget" },
  },
  Google: {
    "Gemini 3.1 Pro":   { rate: 0.0554, note: "Premium tier" },
    "Gemini 3.5 Flash": { rate: 0.0415, note: "Mid tier" },
    "Gemini 3 Flash":   { rate: 0.0138, note: "Budget tier" },
    "Gemini 2.5 Flash": { rate: 0.0041, note: "Ultra-budget" },
  },
  ElevenLabs: {
    "Qwen3.5-397B": { rate: 0.0208, note: "Great for agentic use" },
    "Qwen3.6-35B":  { rate: 0.0049, note: "Ultra-low latency" },
  },
};

// Flat lookup of every model's per-minute LLM rate, keyed by display name.
export const LLM_RATES = Object.values(LLM_CATALOG).reduce((acc, models) => {
  for (const [name, info] of Object.entries(models)) acc[name] = info.rate;
  return acc;
}, {});

export const PLAN_ORDER = ["Free", "Starter", "Creator", "Pro", "Scale", "Business"];
export const PROVIDER_ORDER = ["Anthropic", "OpenAI", "Google", "ElevenLabs"];

export const RECOMMENDED = {
  plan: "Pro",
  provider: "Anthropic",
  model: "Claude Sonnet 4.6",
};

export function fmtUSD(n) {
  return "$" + Math.round(n).toLocaleString();
}
export function fmtUSD2(n) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Annual platform cost for a given plan at a monthly-minute volume.
export function platformAnnual(planKey, monthlyMinutes) {
  const plan = ELEVENLABS_PLANS[planKey];
  const overageMin = Math.max(0, monthlyMinutes - plan.minutes);
  const monthly = plan.fee + overageMin * PLATFORM_PER_MIN;
  return monthly * 12;
}

// Annual LLM cost at a per-minute rate.
export function llmAnnual(rate, monthlyMinutes) {
  return rate * monthlyMinutes * 12;
}
