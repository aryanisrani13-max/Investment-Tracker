import { Eye, Home, LineChart, NotebookPen, Search } from "lucide-react";
import type { TabId } from "../lib/types";

type Item = { id: TabId; Icon: typeof Home };

const items: Item[] = [
  { id: "portfolio", Icon: Home },
  { id: "progress", Icon: LineChart },
  { id: "research", Icon: Search },
  { id: "watchlist", Icon: Eye },
  { id: "journal", Icon: NotebookPen },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <nav
      className="absolute bottom-0 inset-x-0 z-30 bg-bg/90 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(({ id, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex items-center justify-center h-full transition-colors"
              aria-label={id}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.75}
                className={isActive ? "text-ink" : "text-muted"}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
