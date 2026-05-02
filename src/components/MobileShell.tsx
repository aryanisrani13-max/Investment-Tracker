import type { ReactNode } from "react";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full bg-bg flex justify-center" style={{ height: "100dvh" }}>
      <div
        className="relative w-full max-w-[440px] bg-bg flex flex-col overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {children}
      </div>
    </div>
  );
}
