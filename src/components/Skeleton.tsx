/**
 * Generic grey placeholder block with a subtle pulse. No spinners — just a
 * shape that previews the size of the content that's loading.
 */
export function Skeleton({
  w,
  h,
  className = "",
  rounded = "md",
}: {
  w?: number | string;
  h?: number | string;
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}) {
  const roundedClass = {
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];
  return (
    <div
      className={`bg-[#1a1a1a] animate-pulse ${roundedClass} ${className}`}
      style={{
        width: typeof w === "number" ? `${w}px` : w,
        height: typeof h === "number" ? `${h}px` : h,
      }}
    />
  );
}

/**
 * A pre-composed skeleton row matching the holdings list shape, so first-load
 * doesn't flash an empty state before data arrives.
 */
export function HoldingRowSkeleton() {
  return (
    <div className="flex items-center px-6 py-4 gap-3 border-b border-border">
      <Skeleton w={36} h={36} rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton w={120} h={14} />
        <Skeleton w={70} h={12} />
      </div>
      <div className="space-y-2 items-end flex flex-col">
        <Skeleton w={60} h={14} />
        <Skeleton w={40} h={12} />
      </div>
    </div>
  );
}
