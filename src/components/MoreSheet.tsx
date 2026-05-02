import { BookOpen, ChevronRight, Target } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import type { TabId } from "../lib/types";

const ITEMS: { id: TabId; label: string; subtitle: string; Icon: typeof Target }[] = [
  { id: "goals", label: "Goals", subtitle: "Set and track your investing target", Icon: Target },
  { id: "learn", label: "Learn", subtitle: "Plain-English investing concepts", Icon: BookOpen },
];

export function MoreSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: TabId) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="More">
      <ul className="-mx-1">
        {ITEMS.map(({ id, label, subtitle, Icon }) => (
          <li key={id}>
            <button
              onClick={() => {
                onPick(id);
                onClose();
              }}
              className="w-full flex items-center gap-4 px-1 py-3 hover:bg-[#1a1a1a] rounded-lg text-left"
            >
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-ink" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-ink text-sm">{label}</div>
                <div className="text-muted text-xs">{subtitle}</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
