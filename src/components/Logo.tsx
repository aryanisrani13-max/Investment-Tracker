import { useState } from "react";

/**
 * Circular logo with graceful fallback to a monogram tile.
 */
export function Logo({
  src,
  symbol,
  size = 36,
}: {
  src?: string;
  symbol: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  const dim = `${size}px`;
  return (
    <div
      className="rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: dim, height: dim }}
    >
      {showImg ? (
        <img
          src={src}
          alt={symbol}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-semibold text-ink"
          style={{ fontSize: size * 0.36 }}
        >
          {symbol.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
