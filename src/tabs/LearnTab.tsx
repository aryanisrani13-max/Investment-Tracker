import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLearnExplanation } from "../lib/claude";
import { SEED_TOPICS, topicOfTheDay } from "../lib/learn-topics";
import { storage } from "../lib/storage";
import type { LearnTopic } from "../lib/types";

export function LearnTab() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>(() => storage.getLearnCache());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<LearnTopic | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const tod = useMemo(() => topicOfTheDay(SEED_TOPICS), []);
  const ordered = useMemo(() => {
    const others = SEED_TOPICS.filter((t) => t.id !== tod.id);
    return [tod, ...others];
  }, [tod]);

  function persistBody(id: string, body: string) {
    setBodies((curr) => {
      const next = { ...curr, [id]: body };
      storage.setLearnCache(next);
      return next;
    });
  }

  async function expand(topic: LearnTopic) {
    if (expanded === topic.id) {
      setExpanded(null);
      return;
    }
    setExpanded(topic.id);
    if (bodies[topic.id]) return;
    setLoadingId(topic.id);
    try {
      const body = await fetchLearnExplanation(topic.title);
      persistBody(topic.id, body);
    } finally {
      setLoadingId(null);
    }
  }

  // Debounced search → generate explanation on demand
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResult(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      const term = query.trim();
      const id = `search:${term.toLowerCase()}`;
      const topic: LearnTopic = {
        id,
        category: "TERMS",
        title: term,
        preview: "AI-generated explanation",
      };
      setSearchResult(topic);
      if (!bodies[id]) {
        const body = await fetchLearnExplanation(term);
        persistBody(id, body);
      }
      setSearching(false);
    }, 600);
  }, [query, bodies]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28">
      <header className="px-6 pt-12 pb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any investing term"
          className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base"
        />
      </header>

      {searchResult && (
        <div className="px-6 mb-6 border-l border-ink pl-4">
          <div className="text-muted text-xs uppercase tracking-wide mb-1">
            {searchResult.category}
          </div>
          <div className="text-ink text-base mb-2">{searchResult.title}</div>
          <div className="text-ink text-sm leading-relaxed whitespace-pre-line">
            {searching && !bodies[searchResult.id] ? (
              <span className="text-muted">Generating…</span>
            ) : (
              bodies[searchResult.id]
            )}
          </div>
        </div>
      )}

      {!searchResult && (
        <ul>
          {ordered.map((topic) => {
            const isOpen = expanded === topic.id;
            const isToD = topic.id === tod.id;
            return (
              <li
                key={topic.id}
                className={`border-b border-border ${isToD ? "border-l-2 border-l-ink" : ""}`}
              >
                <button
                  onClick={() => expand(topic)}
                  className="w-full text-left px-6 py-5 hover:bg-[#0f0f0f] transition"
                >
                  <div className="text-muted text-xs uppercase tracking-wide mb-1">
                    {topic.category}
                    {isToD && <span className="ml-2 text-ink">Today</span>}
                  </div>
                  <div className="text-ink text-base">{topic.title}</div>
                  {!isOpen && <div className="text-muted text-sm mt-1">{topic.preview}</div>}
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 -mt-1 text-ink text-sm leading-relaxed whitespace-pre-line animate-fade-in">
                    {loadingId === topic.id && !bodies[topic.id] ? (
                      <span className="text-muted">Generating…</span>
                    ) : (
                      bodies[topic.id]
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
