import { useEffect, useState } from 'react'
import type { Stats, StatBucket } from '../../../shared/types'

const TYPE_COLORS: Record<string, string> = {
  hackernews: '#ff7733',
  github: '#b18cff',
  rss: '#5b8cff',
  reddit: '#ff4500',
  mastodon: '#6364ff'
}

function BarRow({ bucket, max, color }: { bucket: StatBucket; max: number; color?: string }): JSX.Element {
  const pct = max > 0 ? Math.round((bucket.count / max) * 100) : 0
  return (
    <div className="bar-row">
      <span className="bar-label" title={bucket.label}>
        {bucket.label}
      </span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }} />
      </div>
      <span className="bar-count">{bucket.count}</span>
    </div>
  )
}

export function Dashboard(): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    window.vigie.getStats().then(setStats)
  }, [])

  if (!stats) return <div className="empty">Chargement des statistiques…</div>

  const maxDay = Math.max(1, ...stats.perDay.map((d) => d.count))
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count))
  const maxType = Math.max(1, ...stats.bySourceType.map((t) => t.count))

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-lbl">Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--accent)' }}>
            {stats.unread}
          </div>
          <div className="stat-lbl">Non lus</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--star)' }}>
            {stats.starred}
          </div>
          <div className="stat-lbl">Favoris</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>
            {stats.summarized}
          </div>
          <div className="stat-lbl">Résumés IA</div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h3>Activité sur 14 jours</h3>
          <div className="spark">
            {stats.perDay.map((d) => (
              <div className="spark-col" key={d.date} title={`${d.date} : ${d.count}`}>
                <div
                  className="spark-bar"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                />
                <span className="spark-x">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Par type de source</h3>
          {stats.bySourceType.length === 0 ? (
            <p className="muted">Aucune donnée</p>
          ) : (
            stats.bySourceType.map((b) => (
              <BarRow key={b.label} bucket={b} max={maxType} color={TYPE_COLORS[b.label]} />
            ))
          )}
        </section>

        <section className="panel">
          <h3>Par catégorie</h3>
          {stats.byCategory.length === 0 ? (
            <p className="muted">Aucune donnée</p>
          ) : (
            stats.byCategory.map((b) => <BarRow key={b.label} bucket={b} max={maxCat} />)
          )}
        </section>

        <section className="panel">
          <h3>Tags les plus fréquents</h3>
          {stats.topTags.length === 0 ? (
            <p className="muted">Aucun tag — générez des résumés IA pour en obtenir</p>
          ) : (
            <div className="tag-cloud">
              {stats.topTags.map((t) => (
                <span key={t.label} className="tag" style={{ fontSize: 11 + Math.min(8, t.count) }}>
                  {t.label} <b>{t.count}</b>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
