import type {
  Holding,
  LivePrice,
  NewsItem,
  ResearchSummary,
  RiskLevel,
  Verdict,
} from "./types";

/**
 * Proxy contract:
 *   POST <VITE_CLAUDE_PROXY_URL>
 *   body: { system: string; user: string; max_tokens?: number }
 *   response: { text: string }
 *
 * The proxy is responsible for holding the Anthropic API key and forwarding to
 * the Messages API using model "claude-sonnet-4-6". A reference implementation
 * (Supabase edge function, Cloudflare Worker, Vercel Function) takes ~30 LOC.
 *
 * If no proxy URL is configured, callClaude() returns a structured fallback so
 * the UI never breaks. The app degrades gracefully — Research and Learn still
 * render useful (if generic) content.
 */

const MODEL = "claude-sonnet-4-6";

function proxyUrl(): string | null {
  const url = import.meta.env.VITE_CLAUDE_PROXY_URL;
  return url && url.length > 0 ? url : null;
}

export const claudeAvailable = (): boolean => proxyUrl() !== null;

export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const url = proxyUrl();
  if (!url) {
    throw new Error("CLAUDE_PROXY_NOT_CONFIGURED");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      system: opts.system,
      user: opts.user,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude proxy error: ${res.status}`);
  }
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error("Claude proxy returned no text");
  return data.text;
}

const RESEARCH_SYSTEM = `You are a friendly, sharp investing explainer for a teenager just starting out with $1,000. You write like a smart older friend — direct, concrete, never condescending. Avoid jargon when possible; when you must use a term, define it inline in 4 words or fewer. No emojis. No disclaimers like "this is not financial advice". No hedging language ("could potentially perhaps maybe"). Be specific.`;

const RESEARCH_PROMPT = (symbol: string, name: string) => `Write a research summary for ${name} (${symbol}). Respond with strict JSON, no markdown, no code fences, in this exact shape:
{
  "whatTheyDo": "2 short sentences about what the company actually does and how it makes money",
  "performance": "2 short sentences about how the stock has been performing recently and what's driving it",
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "beginnerFriendly": { "verdict": "Yes" | "No" | "Maybe", "reason": "one short sentence explaining why" },
  "verdict": "BUY" | "HOLD" | "WATCH",
  "verdictReason": "one short sentence explaining the verdict in plain language for a teenager"
}`;

export async function fetchResearchSummary(
  symbol: string,
  name: string
): Promise<ResearchSummary> {
  if (!claudeAvailable()) {
    return fallbackResearch(symbol, name);
  }
  try {
    const text = await callClaude({
      system: RESEARCH_SYSTEM,
      user: RESEARCH_PROMPT(symbol, name),
      maxTokens: 800,
    });
    const parsed = extractJson(text) as Partial<{
      whatTheyDo: string;
      performance: string;
      risk: RiskLevel;
      beginnerFriendly: { verdict: "Yes" | "No" | "Maybe"; reason: string };
      verdict: Verdict;
      verdictReason: string;
    }>;
    return {
      symbol,
      whatTheyDo: parsed.whatTheyDo ?? "—",
      performance: parsed.performance ?? "—",
      risk: parsed.risk ?? "MEDIUM",
      beginnerFriendly: parsed.beginnerFriendly ?? { verdict: "Maybe", reason: "—" },
      verdict: parsed.verdict ?? "WATCH",
      verdictReason: parsed.verdictReason ?? "—",
    };
  } catch {
    return fallbackResearch(symbol, name);
  }
}

const BRIEFING_SYSTEM = `You are writing a short morning briefing for a teenager investing $1,000. Plain spoken, direct, no jargon. No emojis, no disclaimers, no "as an AI". 3 to 4 sentences total. Lead with how their portfolio is doing, then mention 1-2 stock-specific notes if any are notable.`;

export async function fetchDailyBriefing(
  holdings: Holding[],
  prices: Record<string, LivePrice>,
  totalGainPct: number
): Promise<string> {
  if (!claudeAvailable()) {
    return "Connect a Claude proxy in your environment to see a daily AI briefing here. It will summarize how your holdings did yesterday and flag what to watch today.";
  }
  if (holdings.length === 0) {
    return "Add a holding to start seeing a daily briefing on how your portfolio is performing.";
  }
  const lines = holdings
    .map((h) => {
      const lp = prices[h.symbol];
      if (!lp) return `${h.symbol}: ${h.shares} shares (no live price)`;
      return `${h.symbol}: ${h.shares} sh, last $${lp.price.toFixed(2)} (${lp.dayChangePct >= 0 ? "+" : ""}${lp.dayChangePct.toFixed(2)}% today)`;
    })
    .join("\n");
  const totalLine = `Portfolio is ${totalGainPct >= 0 ? "up" : "down"} ${Math.abs(totalGainPct).toFixed(2)}% overall.`;
  try {
    return (
      await callClaude({
        system: BRIEFING_SYSTEM,
        user: `Holdings:\n${lines}\n\n${totalLine}\n\nWrite the briefing.`,
        maxTokens: 280,
      })
    ).trim();
  } catch {
    return "Couldn't reach the AI service right now. Your prices and chart are still up to date below.";
  }
}

const WHY_SYSTEM = `You explain stock moves to a teenager in plain English. 2-3 sentences. Cite the most likely cause from the news context. No jargon. No emojis. No "as an AI".`;

export async function fetchWhyItMoved(
  symbol: string,
  name: string,
  dayChangePct: number,
  news: NewsItem[]
): Promise<string> {
  if (!claudeAvailable()) {
    return "Configure a Claude proxy to get an AI explanation of moves like this.";
  }
  const headlines = news
    .slice(0, 6)
    .map((n) => `- ${n.headline} (${n.source})`)
    .join("\n");
  const direction = dayChangePct >= 0 ? "up" : "down";
  try {
    return (
      await callClaude({
        system: WHY_SYSTEM,
        user: `${name} (${symbol}) is ${direction} ${Math.abs(dayChangePct).toFixed(2)}% today.\n\nRecent headlines:\n${headlines || "(none)"}\n\nWhy is it moving?`,
        maxTokens: 220,
      })
    ).trim();
  } catch {
    return "Couldn't load an explanation right now.";
  }
}

const LEARN_SYSTEM = `You are an investing teacher for a teenager. Write like a smart article — direct, clear, paragraphs not bullets. No emojis. No "in conclusion". No disclaimers. About 150–220 words. Use plain language. Define a term the first time you use it.`;

export async function fetchLearnExplanation(topic: string): Promise<string> {
  if (!claudeAvailable()) {
    return fallbackLearn(topic);
  }
  try {
    const text = await callClaude({
      system: LEARN_SYSTEM,
      user: `Explain: ${topic}`,
      maxTokens: 500,
    });
    return text.trim();
  } catch {
    return fallbackLearn(topic);
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // strip markdown code fences if present
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(stripped);
  } catch {
    // try to find the first {...} block
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse JSON from Claude response");
  }
}

function fallbackResearch(symbol: string, name: string): ResearchSummary {
  return {
    symbol,
    whatTheyDo: `${name} is a publicly traded company. Connect a Claude proxy to get a real AI-generated breakdown of what they do and how they make money.`,
    performance: "Live AI commentary requires a Claude proxy to be configured. The price and chart below are pulled live from Finnhub.",
    risk: "MEDIUM",
    beginnerFriendly: {
      verdict: "Maybe",
      reason: "Set VITE_CLAUDE_PROXY_URL to enable real AI risk assessment.",
    },
    verdict: "WATCH",
    verdictReason: "Verdict requires a Claude proxy.",
  };
}

function fallbackLearn(topic: string): string {
  return `An AI-generated explanation of "${topic}" will appear here once a Claude proxy is configured. The proxy holds your Anthropic API key safely on the server side, so it never ships in the browser bundle.\n\nSet VITE_CLAUDE_PROXY_URL in your .env file to a small backend endpoint that forwards { system, user, max_tokens } to the Anthropic Messages API using model claude-sonnet-4-6 and returns { text }. A Supabase edge function or Vercel function works perfectly.`;
}
