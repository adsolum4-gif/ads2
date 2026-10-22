import { useEffect, useState } from "react";

export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

export function splitRemaining(ms) {
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function formatDailyResetCountdown({ hours, minutes, seconds }) {
  return `${hours} hrs, ${minutes} min, and ${seconds} sec`;
}

export function useDailyResetCountdown() {
  const [remaining, setRemaining] = useState(() => splitRemaining(msUntilNextMidnight()));

  useEffect(() => {
    const tick = () => setRemaining(splitRemaining(msUntilNextMidnight()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return {
    remaining,
    label: formatDailyResetCountdown(remaining),
  };
}
