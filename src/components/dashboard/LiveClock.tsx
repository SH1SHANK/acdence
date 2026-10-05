import React, { useState, useEffect } from "react";
import { getLiveISTParts } from "@/lib/datetime";

interface LiveClockProps {
  className?: string;
}

/**
 * Isolated live continuous clock in Asia/Kolkata (IST).
 * Ticks every 1,000ms using local state so the rest of the application
 * and parent header do NOT re-render.
 */
export const LiveClock: React.FC<LiveClockProps> = ({ className = "" }) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const parts = getLiveISTParts(currentTime);

  return (
    <div
      className={`font-mono select-none ${className}`}
      title="Continuous local clock in Asia/Kolkata (IST)"
      aria-label={`Current IST Time: ${parts.dayName}, ${parts.dayNum} ${parts.monthName} ${parts.year}, ${parts.timeWithSeconds} IST`}
      data-testid="header-live-clock"
    >
      {/* Desktop view (>= 1024px / lg): Two stacked rows aligned right with tabular numbers */}
      <div className="hidden lg:flex flex-col items-end text-right leading-tight">
        <div className="text-[11px] text-foreground-lighter tabular-nums">
          {parts.dayName} · {parts.dayNum} {parts.monthName} {parts.year}
        </div>
        <div className="text-xs text-foreground/90 font-medium tabular-nums mt-0.5 flex items-center gap-1">
          <span>{parts.timeWithSeconds}</span>
          <span className="text-[10px] text-foreground-lighter font-normal">IST</span>
        </div>
      </div>

      {/* Medium view (sm to lg): Single line condensed */}
      <div className="hidden sm:flex lg:hidden flex-col items-end text-right leading-tight">
        <div className="text-[10px] text-foreground-lighter tabular-nums">
          {parts.dayName} {parts.dayNum} {parts.monthName}
        </div>
        <div className="text-[11px] text-foreground/90 font-medium tabular-nums">
          {parts.timeString} <span className="text-[9px] text-foreground-lighter">IST</span>
        </div>
      </div>

      {/* Mobile view (< 640px): Ultra-compact time only */}
      <div className="flex sm:hidden items-center text-[11px] text-foreground-lighter font-mono tabular-nums">
        <span>{parts.timeString}</span>
      </div>
    </div>
  );
};
