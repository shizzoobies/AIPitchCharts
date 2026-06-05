import React, { useState, useEffect, useMemo } from "react";
import { Users, Mic, RotateCcw, Info, Clock } from "lucide-react";
import { storage } from "../lib/storage";
import {
  PLATFORM_PER_MIN,
  ELEVENLABS_PLANS,
  LLM_CATALOG,
  LLM_RATES,
  PLAN_ORDER,
  PROVIDER_ORDER,
  RECOMMENDED,
  fmtUSD,
  fmtUSD2,
  platformAnnual,
  llmAnnual,
} from "../lib/pricing";

const STORE_KEY = "uhaul:cost-calc:v2";

const DEFAULT = {
  eligible: 1150,
  activePct: 40,
  conversationsPerUser: 1,
  avgMinutes: 4,
  plan: RECOMMENDED.plan,
  model: RECOMMENDED.model,
};

export default function CostCalculator() {
  const [state, setState] = useState(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const result = storage.get(STORE_KEY);
      if (result && result.value) {
        const parsed = JSON.parse(result.value);
        setState({ ...DEFAULT, ...parsed });
      }
    } catch (e) { /* no prior state */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { storage.set(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state, loaded]);

  const activeUsers = Math.round(state.eligible * (state.activePct / 100));
  const monthlyMinutes = Math.round(activeUsers * state.conversationsPerUser * state.avgMinutes);
  const annualMinutes = monthlyMinutes * 12;

  const plan = ELEVENLABS_PLANS[state.plan];
  const includedMin = plan.minutes;
  const overageMin = Math.max(0, monthlyMinutes - includedMin);

  // Cost breakdown for the selected plan + selected model.
  const breakdown = useMemo(() => {
    const subscriptionAnnual = plan.fee * 12;
    const overageAnnual = overageMin * PLATFORM_PER_MIN * 12;
    const platformAnnualCost = subscriptionAnnual + overageAnnual;
    const rate = LLM_RATES[state.model] ?? 0;
    const llmAnnualCost = llmAnnual(rate, monthlyMinutes);
    const totalAnnual = platformAnnualCost + llmAnnualCost;
    return { subscriptionAnnual, overageAnnual, platformAnnualCost, llmAnnualCost, totalAnnual, rate };
  }, [state.plan, state.model, monthlyMinutes, overageMin, plan.fee]);

  const perUserMonthly = activeUsers > 0 ? breakdown.totalAnnual / 12 / activeUsers : 0;
  const perMinuteAllIn = monthlyMinutes > 0 ? breakdown.totalAnnual / annualMinutes : 0;

  // All-in annual cost per model at the selected plan (platform is identical across models).
  const platformAnnualSelected = breakdown.platformAnnualCost;
  function modelAnnualAllIn(rate) {
    return platformAnnualSelected + llmAnnual(rate, monthlyMinutes);
  }

  function reset() {
    setState(DEFAULT);
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF8F3", color: "#1A2332", fontFamily: "'Geist', -apple-system, system-ui, sans-serif" }}>
      <style>{`
        .display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.02em; }
        .mono { font-family: 'Geist Mono', 'SF Mono', monospace; font-variant-numeric: tabular-nums; }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; height: 24px; }
        input[type="range"]::-webkit-slider-runnable-track { background: #E5E0D5; height: 2px; border-radius: 1px; }
        input[type="range"]::-moz-range-track { background: #E5E0D5; height: 2px; border-radius: 1px; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #1A2332; border-radius: 50%; margin-top: -7px; cursor: grab; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; background: #1A2332; border-radius: 50%; cursor: grab; border: none; }
        input[type="range"]:active::-webkit-slider-thumb { cursor: grabbing; background: #B8865B; }
      `}</style>

      <div className="max-w-6xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="mb-12 pb-8 border-b" style={{ borderColor: "#E5E0D5" }}>
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <div>
              <div className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#B8865B" }}>
                Creative Services / Training Platform
              </div>
              <h1 className="display text-5xl font-medium mb-2" style={{ color: "#1A2332" }}>
                AI Cost Calculator
              </h1>
              <p className="text-sm" style={{ color: "#6B6256" }}>
                Voice agents run on ElevenLabs Agents. Cost per conversation minute = ${PLATFORM_PER_MIN.toFixed(2)} platform + the LLM rate, billed at cost.
              </p>
            </div>
            <button
              onClick={reset}
              className="mono text-xs uppercase tracking-wider px-4 py-2 border flex items-center gap-2 hover:bg-white transition-colors"
              style={{ borderColor: "#E5E0D5", color: "#6B6256" }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Levers */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">

          <div className="bg-white p-7 border" style={{ borderColor: "#E5E0D5" }}>
            <div className="flex items-center gap-2 mb-6">
              <Users size={16} style={{ color: "#B8865B" }} />
              <h2 className="mono text-xs tracking-widest uppercase" style={{ color: "#1A2332" }}>Population</h2>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm" style={{ color: "#6B6256" }}>Eligible population</label>
                <span className="mono text-2xl font-medium">{state.eligible.toLocaleString()}</span>
              </div>
              <input
                type="range" min="100" max="5000" step="50"
                value={state.eligible}
                onChange={(e) => setState({ ...state, eligible: +e.target.value })}
                className="w-full"
              />
            </div>

            <div className="mb-2">
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm" style={{ color: "#6B6256" }}>Active monthly</label>
                <span className="mono text-2xl font-medium">{state.activePct}%</span>
              </div>
              <input
                type="range" min="10" max="100" step="5"
                value={state.activePct}
                onChange={(e) => setState({ ...state, activePct: +e.target.value })}
                className="w-full"
              />
              <div className="mono text-xs mt-2" style={{ color: "#B8865B" }}>
                = {activeUsers.toLocaleString()} active users
              </div>
            </div>
          </div>

          <div className="bg-white p-7 border" style={{ borderColor: "#E5E0D5" }}>
            <div className="flex items-center gap-2 mb-6">
              <Mic size={16} style={{ color: "#B8865B" }} />
              <h2 className="mono text-xs tracking-widest uppercase" style={{ color: "#1A2332" }}>Conversation usage</h2>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm" style={{ color: "#6B6256" }}>Conversations per user / month</label>
                <span className="mono text-2xl font-medium">{state.conversationsPerUser}</span>
              </div>
              <input
                type="range" min="1" max="30" step="1"
                value={state.conversationsPerUser}
                onChange={(e) => setState({ ...state, conversationsPerUser: +e.target.value })}
                className="w-full"
              />
            </div>

            <div className="mb-2">
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm" style={{ color: "#6B6256" }}>Avg minutes per conversation</label>
                <span className="mono text-2xl font-medium">{state.avgMinutes}</span>
              </div>
              <input
                type="range" min="1" max="20" step="1"
                value={state.avgMinutes}
                onChange={(e) => setState({ ...state, avgMinutes: +e.target.value })}
                className="w-full"
              />
              <div className="mono text-xs mt-2" style={{ color: "#B8865B" }}>
                = {monthlyMinutes.toLocaleString()} conversation minutes / month
              </div>
            </div>
          </div>
        </div>

        {/* Plan selector */}
        <div className="mb-10">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#6B6256" }}>ElevenLabs Agents plan</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {PLAN_ORDER.map((key) => {
              const p = ELEVENLABS_PLANS[key];
              const sel = state.plan === key;
              return (
                <button
                  key={key}
                  onClick={() => setState({ ...state, plan: key })}
                  className="text-left p-4 border transition-colors"
                  style={{
                    borderColor: sel ? "#1A2332" : "#E5E0D5",
                    background: sel ? "#FAF6EE" : "white",
                  }}
                >
                  <div className="text-sm font-medium mb-1">{key}</div>
                  <div className="mono text-xs" style={{ color: "#B8865B" }}>{p.fee === 0 ? "Free" : "$" + p.fee + "/mo"}</div>
                  <div className="mono text-xs mt-1" style={{ color: "#6B6256" }}>{p.minutes.toLocaleString()} min</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mono text-xs mt-3" style={{ color: monthlyMinutes > includedMin ? "#9B2D2D" : "#1E7A46" }}>
            <Clock size={12} />
            {monthlyMinutes.toLocaleString()} / {includedMin.toLocaleString()} included min used
            {overageMin > 0
              ? ` · ${overageMin.toLocaleString()} min overage @ $${PLATFORM_PER_MIN.toFixed(2)}/min`
              : " · within plan"}
          </div>
        </div>

        {/* Recommended / selected combo */}
        <div className="mb-10 p-8 border-2" style={{ borderColor: "#1A2332", background: "#FFFFFF" }}>
          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-2">
            <div className="mono text-xs tracking-widest uppercase" style={{ color: "#B8865B" }}>
              {state.plan === RECOMMENDED.plan && state.model === RECOMMENDED.model ? "Recommended configuration" : "Selected configuration"}
            </div>
            <div className="text-sm" style={{ color: "#6B6256" }}>ElevenLabs {state.plan} + {state.model}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-4">
            <div>
              <div className="text-xs mb-2" style={{ color: "#6B6256" }}>Annual all-in cost</div>
              <div className="display text-4xl font-medium mono">{fmtUSD(breakdown.totalAnnual)}</div>
            </div>
            <div>
              <div className="text-xs mb-2" style={{ color: "#6B6256" }}>Per active user / month</div>
              <div className="display text-4xl font-medium mono">{fmtUSD2(perUserMonthly)}</div>
            </div>
            <div>
              <div className="text-xs mb-2" style={{ color: "#6B6256" }}>Per conversation minute</div>
              <div className="display text-4xl font-medium mono">{fmtUSD2(perMinuteAllIn)}</div>
            </div>
            <div>
              <div className="text-xs mb-2" style={{ color: "#6B6256" }}>Per active user / year</div>
              <div className="display text-4xl font-medium mono">{activeUsers > 0 ? fmtUSD(breakdown.totalAnnual / activeUsers) : "$0"}</div>
            </div>
          </div>

          {/* Breakdown bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px mt-8" style={{ background: "#E5E0D5", border: "1px solid #E5E0D5" }}>
            <div className="bg-white p-4">
              <div className="text-xs mb-1" style={{ color: "#6B6256" }}>Platform subscription</div>
              <div className="mono text-xl font-medium">{fmtUSD(breakdown.subscriptionAnnual)}</div>
              <div className="mono text-xs mt-1" style={{ color: "#6B6256" }}>${plan.fee}/mo × 12</div>
            </div>
            <div className="bg-white p-4">
              <div className="text-xs mb-1" style={{ color: "#6B6256" }}>Platform overage</div>
              <div className="mono text-xl font-medium">{fmtUSD(breakdown.overageAnnual)}</div>
              <div className="mono text-xs mt-1" style={{ color: "#6B6256" }}>{overageMin.toLocaleString()} min/mo × ${PLATFORM_PER_MIN.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4">
              <div className="text-xs mb-1" style={{ color: "#6B6256" }}>LLM at cost</div>
              <div className="mono text-xl font-medium">{fmtUSD(breakdown.llmAnnualCost)}</div>
              <div className="mono text-xs mt-1" style={{ color: "#6B6256" }}>{annualMinutes.toLocaleString()} min/yr × ${breakdown.rate.toFixed(4)}</div>
            </div>
          </div>
        </div>

        {/* LLM comparison */}
        <h2 className="display text-2xl font-medium mb-2 mt-12" style={{ color: "#1A2332" }}>
          LLM choice · annual all-in cost
        </h2>
        <p className="text-sm mb-5" style={{ color: "#6B6256" }}>
          On the ElevenLabs <strong>{state.plan}</strong> plan at {monthlyMinutes.toLocaleString()} min/month. Click any model to make it the selected configuration. Platform cost ({fmtUSD(platformAnnualSelected)}/yr) is identical across models — only the LLM portion changes.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {PROVIDER_ORDER.map((provider) => (
            <div key={provider} className="bg-white border" style={{ borderColor: "#E5E0D5" }}>
              <div className="px-6 py-4 border-b mono text-xs tracking-widest uppercase" style={{ borderColor: "#E5E0D5", color: "#6B6256" }}>
                {provider}
              </div>
              <div>
                {Object.entries(LLM_CATALOG[provider]).map(([model, info]) => {
                  const sel = state.model === model;
                  return (
                    <button
                      key={model}
                      onClick={() => setState({ ...state, model })}
                      className="w-full text-left flex justify-between items-baseline px-6 py-4 border-b last:border-b-0 transition-colors hover:bg-[#FAF6EE]"
                      style={{
                        borderColor: "#E5E0D5",
                        background: sel ? "#FAF6EE" : "transparent",
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2" style={{ color: "#1A2332" }}>
                          {model}
                          {sel && <span className="mono text-xs px-2 py-0.5" style={{ background: "#1A2332", color: "#FAF8F3", borderRadius: 2 }}>Selected</span>}
                        </div>
                        <div className="mono text-xs mt-1" style={{ color: "#6B6256" }}>
                          ${info.rate.toFixed(4)}/min LLM · {info.note}
                        </div>
                      </div>
                      <div className="mono text-2xl font-medium">{fmtUSD(modelAnnualAllIn(info.rate))}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Assumptions footer */}
        <div className="mt-12 pt-6 border-t text-xs leading-relaxed" style={{ borderColor: "#E5E0D5", color: "#6B6256" }}>
          <div className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#1A2332" }}>Modeling assumptions</div>
          <p className="mb-2">
            All voice and text guidance runs through ElevenLabs Agents. The platform fee is a flat ${PLATFORM_PER_MIN.toFixed(2)} per conversation minute; each plan's included minutes prepay that fee, and minutes beyond the allotment bill at the same ${PLATFORM_PER_MIN.toFixed(2)}/min. The LLM is billed separately at cost using the per-minute rates shown above.
          </p>
          <p>
            Monthly minutes = active users × conversations per user × average minutes per conversation = {activeUsers.toLocaleString()} × {state.conversationsPerUser} × {state.avgMinutes} = {monthlyMinutes.toLocaleString()} min. LLM and platform pricing verified June 2026 from official ElevenLabs sources.
          </p>
        </div>

      </div>
    </div>
  );
}
