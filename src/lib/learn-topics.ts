import type { LearnTopic } from "./types";

export const SEED_TOPICS: LearnTopic[] = [
  {
    id: "what-is-stock",
    category: "BASICS",
    title: "What is a stock, really?",
    preview: "When you buy one, you own a tiny piece of a company.",
  },
  {
    id: "what-is-etf",
    category: "BASICS",
    title: "What is an ETF?",
    preview: "A bundle of stocks you can buy in a single trade.",
  },
  {
    id: "dca",
    category: "STRATEGY",
    title: "Dollar cost averaging",
    preview: "Buy a fixed amount on a fixed schedule. Stop guessing the bottom.",
  },
  {
    id: "compounding",
    category: "BASICS",
    title: "Why compounding is the whole game",
    preview: "Returns earning returns. The math is wild over a decade.",
  },
  {
    id: "read-chart",
    category: "TERMS",
    title: "How to read a stock chart",
    preview: "Candles, time frames, and what the squiggly line actually means.",
  },
  {
    id: "diversification",
    category: "STRATEGY",
    title: "Diversification in one sentence",
    preview: "Don't put your whole life in one ticker.",
  },
  {
    id: "market-cap",
    category: "TERMS",
    title: "Market cap, P/E, and other labels",
    preview: "The numbers people throw around to size up a company.",
  },
  {
    id: "bull-bear",
    category: "TERMS",
    title: "Bull markets and bear markets",
    preview: "What the names mean and why they matter to your plan.",
  },
  {
    id: "risk-tolerance",
    category: "STRATEGY",
    title: "Figuring out your risk tolerance",
    preview: "If a 30% drop makes you sell, your portfolio is too aggressive.",
  },
  {
    id: "fees",
    category: "BASICS",
    title: "Fees quietly eat your returns",
    preview: "1% a year doesn't sound like much. Compounded, it's huge.",
  },
];

export function topicOfTheDay(topics: LearnTopic[]): LearnTopic {
  // Stable rotation based on the current calendar day
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return topics[day % topics.length];
}
