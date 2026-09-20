"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Point = { label: string; value: number };
type Analytics = { total: number; period: number; lastClickAt: string | null; timeline: Point[]; devices: Point[]; countries: Point[]; referrers: Point[] };
const deviceNames: Record<string, string> = { mobile: 'Mobile', desktop: 'Ordinateur', tablet: 'Tablette', unknown: 'Inconnu' };

export function AdminAnalytics({ id, kind }: { id: string; kind: 'item' | 'short' }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/analytics?id=${id}&kind=${kind}&days=${days}`, { signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; })
      .then(result => { setData(result); setError(''); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message || 'Statistiques indisponibles'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, kind, days, refresh]);
  const max = Math.max(1, ...data?.timeline.map(point => point.value) ?? []);
  return <section className="analytics-panel" aria-label="Statistiques de ce lien" aria-busy={loading}>
    <header><h2>Statistiques</h2><div className="inline-actions"><select aria-label="Période des statistiques" value={days} onChange={e => { setLoading(true); setDays(Number(e.target.value)); }}><option value={7}>7 derniers jours</option><option value={30}>30 derniers jours</option><option value={90}>90 derniers jours</option></select><button className="secondary-button" type="button" aria-label="Actualiser les statistiques" onClick={() => { setLoading(true); setRefresh(refresh + 1); }}><RefreshCw size={16} /></button></div></header>
    {loading ? <p role="status">Chargement des clics…</p> : error ? <p role="alert" className="form-error">{error}</p> : data && <>
      <div className="metric-row"><div><span>Clics au total</span><strong>{data.total.toLocaleString('fr-FR')}</strong></div><div><span>Sur la période</span><strong>{data.period.toLocaleString('fr-FR')}</strong></div><div><span>Dernier clic</span><strong className="metric-date">{data.lastClickAt ? new Date(data.lastClickAt).toLocaleString('fr-FR') : 'Aucun'}</strong></div></div>
      <div className="click-chart" role="img" aria-label={`${data.period} clics sur ${days} jours. Détail disponible dans le tableau ci-dessous.`}>{data.timeline.map(point => <div key={point.label} title={`${point.label} : ${point.value} clics`}><span style={{ height: `${point.value / max * 100}%` }} /></div>)}</div>
      <div className="chart-dates"><span>{data.timeline[0]?.label}</span><span>{data.timeline.at(-1)?.label}</span></div>
      {!data.period && <p className="empty-stats">Aucun clic enregistré sur cette période.</p>}
      <div className="analytics-breakdowns">{[['Appareils', data.devices], ['Pays', data.countries], ['Provenance', data.referrers]].map(([title, values]) => <div key={String(title)}><h3>{String(title)}</h3>{(values as Point[]).length ? <dl>{(values as Point[]).slice(0, 8).map(point => <div key={point.label}><dt>{title === 'Appareils' ? deviceNames[point.label] ?? point.label : point.label}</dt><dd>{point.value}</dd></div>)}</dl> : <p>Pas encore de données.</p>}</div>)}</div>
      <details className="analytics-table"><summary>Détail journalier</summary><table><thead><tr><th>Date (Paris)</th><th>Clics</th></tr></thead><tbody>{data.timeline.map(point => <tr key={point.label}><td>{point.label}</td><td>{point.value}</td></tr>)}</tbody></table></details>
      <p className="stats-note">Clics enregistrés, pas visiteurs uniques. Les robots identifiés sont exclus des nouveaux événements. La provenance et le pays peuvent être inconnus.</p>
    </>}
  </section>;
}
