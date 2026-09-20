"use client";

import { useEffect, useState } from "react";

function remaining(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, ended: diff === 0 };
}

export function Countdown({ target }: { target: string }) {
  const [time, setTime] = useState(() => remaining(target));

  useEffect(() => {
    const timer = window.setInterval(() => setTime(remaining(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (time.ended) return <span className="countdown-ended">C’est maintenant</span>;
  return (
    <span className="countdown" aria-label={`${time.days} jours, ${time.hours} heures, ${time.minutes} minutes`}>
      <b>{time.days}<small>j</small></b>
      <b>{String(time.hours).padStart(2, "0")}<small>h</small></b>
      <b>{String(time.minutes).padStart(2, "0")}<small>m</small></b>
      <b>{String(time.seconds).padStart(2, "0")}<small>s</small></b>
    </span>
  );
}
