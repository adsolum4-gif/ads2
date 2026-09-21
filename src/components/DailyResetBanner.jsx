import { useEffect, useRef, useState } from "react";

function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function splitRemaining(ms) {
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function DailyResetBanner({ onReset }) {
  const [remaining, setRemaining] = useState(() => splitRemaining(msUntilNextMidnight()));
  const dayRef = useRef(new Date().toDateString());

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setRemaining(splitRemaining(msUntilNextMidnight(now)));
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
        This activity will reset in {remaining.hours} hrs, {remaining.minutes} min, and {remaining.seconds} sec
      </p>
      <p className="text-xs text-amber-900 mt-1">
        Mission count and today&apos;s profit reset at 12:00 AM. Wallet balance and salary keep accumulating.
      </p>
    </div>
  );
}
