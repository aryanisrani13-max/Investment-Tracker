import { useEffect, useState } from "react";
import { fmtMoney, fmtPct } from "../lib/format";
import { haptics } from "../lib/haptics";
import type { Holding } from "../lib/types";
import { BottomSheet } from "./BottomSheet";
import { Logo } from "./Logo";

export function SellSheet({
  open,
  onClose,
  holding,
  currentPrice,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  holding: Holding | null;
  currentPrice: number | null;
  onConfirm: (shares: number, salePrice: number) => void;
}) {
  const [sharesStr, setSharesStr] = useState("");
  const [priceStr, setPriceStr] = useState("");

  useEffect(() => {
    if (!open || !holding) return;
    setSharesStr(String(holding.shares));
    setPriceStr((currentPrice ?? holding.costBasis).toFixed(2));
  }, [open, holding, currentPrice]);

  if (!holding) return null;

  const sharesNum = parseFloat(sharesStr);
  const priceNum = parseFloat(priceStr);
  const valid =
    Number.isFinite(sharesNum) &&
    sharesNum > 0 &&
    sharesNum <= holding.shares &&
    Number.isFinite(priceNum) &&
    priceNum > 0;

  const proceeds = valid ? sharesNum * priceNum : 0;
  const cost = valid ? sharesNum * holding.costBasis : 0;
  const realized = proceeds - cost;
  const realizedPct = cost > 0 ? (realized / cost) * 100 : 0;
  const realizedColor =
    realized > 0 ? "text-gain" : realized < 0 ? "text-loss" : "text-muted";

  function commit() {
    if (!valid) return;
    haptics.success();
    onConfirm(sharesNum, priceNum);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Sell">
      <div className="flex items-center gap-3 mb-5">
        <Logo src={holding.logo} symbol={holding.symbol} size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-ink text-base truncate">{holding.name}</div>
          <div className="text-muted text-xs tnum">
            {holding.symbol} · holding {holding.shares} sh
          </div>
        </div>
      </div>

      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Shares to sell</label>
      <input
        autoFocus
        value={sharesStr}
        onChange={(e) => setSharesStr(e.target.value)}
        inputMode="decimal"
        className="w-full bg-[#1a1a1a] text-ink px-4 py-3 rounded-xl text-base mb-4 tnum"
      />

      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Price per share</label>
      <input
        value={priceStr}
        onChange={(e) => setPriceStr(e.target.value)}
        inputMode="decimal"
        className="w-full bg-[#1a1a1a] text-ink px-4 py-3 rounded-xl text-base mb-5 tnum"
      />

      {valid && (
        <div className="border-t border-border pt-4 mb-5 space-y-2">
          <Row label="Proceeds" value={fmtMoney(proceeds)} />
          <Row label="Cost basis" value={fmtMoney(cost)} muted />
          <Row
            label="Realized gain"
            value={`${fmtMoney(realized, { showSign: true })} (${fmtPct(realizedPct)})`}
            color={realizedColor}
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-full text-ink/70 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={commit}
          disabled={!valid}
          className="flex-1 py-3 rounded-full bg-ink text-bg text-sm font-semibold disabled:opacity-40"
        >
          Sell
        </button>
      </div>
    </BottomSheet>
  );
}

function Row({
  label,
  value,
  color = "text-ink",
  muted = false,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tnum ${muted ? "text-muted" : color}`}>{value}</span>
    </div>
  );
}
