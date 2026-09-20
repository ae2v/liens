export function countdownUnits(target: string, now: number) {
  const end = new Date(target);
  const diff = end.getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return [];
  const start = new Date(now);
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  const addMonths = (n: number) => {
    const result = new Date(start); result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + n);
    const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(start.getUTCDate(), last)); return result.getTime();
  };
  if (addMonths(months) > end.getTime()) months--;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  const pair = months > 0 ? [[months, 'mois'], [Math.floor((end.getTime() - addMonths(months)) / 86400000), 'jour']] :
    days > 0 ? [[days, 'jour'], [hours % 24, 'heure']] :
    hours > 0 ? [[hours, 'heure'], [minutes % 60, 'minute']] : [[minutes, 'minute'], [Math.floor(diff / 1000) % 60, 'seconde']];
  return pair.map(([value, label]) => ({ value: Number(value), label: `${label}${Number(value) > 1 && label !== 'mois' ? 's' : ''}` }));
}
