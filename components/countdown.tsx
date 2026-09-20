"use client";

import { useEffect, useState } from "react";
import { countdownUnits } from "@/lib/countdown";

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const start = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, [target]);

  const units = now === null ? null : countdownUnits(target, now);
  if (units?.length === 0) return <span className="countdown-ended">C’est maintenant</span>;
  return (
    <span className="countdown" aria-label={units ? units.map((u) => `${u.value} ${u.label}`).join(', ') : 'Chargement du décompte'}>
      {(units ?? [{ value: null, label: '…' }, { value: null, label: '…' }]).map((unit, index) => <span className="countdown-unit" key={index}><b>{unit.value === null ? '—' : String(unit.value).padStart(2, '0')}</b><small>{unit.label}</small></span>)}
    </span>
  );
}
