import type { ReactNode } from "react";

/**
 * Centers the app inside a phone-shaped column on desktop.
 * On mobile, takes full screen.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-bg flex justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen bg-bg flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
