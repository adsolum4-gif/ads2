import { useEffect, useRef } from "react";
import { formatDailyResetCountdown, useDailyResetCountdown } from "../utils/dailyResetTimer";

export default function DailyResetBanner({ onReset }) {
  const { remaining } = useDailyResetCountdown();
  const dayRef = useRef(new Date().toDateString());

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const day = now.toDateString();
      if (day !== dayRef.current) {
        dayRef.current = day;
        onReset?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onReset]);

  return (
    <div className="w-full mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-gray-800">
        This activity will reset in {formatDailyResetCountdown(remaining)}
      </p>
      <p className="text-xs text-amber-900 mt-1">
        Mission count and today&apos;s profit reset at 12:00 AM. Wallet balance and salary keep accumulating.
      </p>
    </div>
  );
}
