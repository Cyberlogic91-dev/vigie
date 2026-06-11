import type { RefreshState } from '../../../shared/types'

interface Props {
  state: RefreshState
}

/** Jauge de progression « futuriste » affichée pendant l'actualisation des sources. */
export function RefreshGauge({ state }: Props): JSX.Element {
  const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0

  return (
    <div className="gauge-overlay">
      <div className="gauge-card">
        <div className="gauge-radar">
          <span className="gauge-sweep" />
          <span className="gauge-ring r1" />
          <span className="gauge-ring r2" />
          <span className="gauge-core" />
        </div>

        <div className="gauge-title">Analyse des sources</div>
        <div className="gauge-sub" title={state.label}>
          {state.active ? state.label : 'Terminé'}
        </div>

        <div className="gauge-track">
          <div className="gauge-fill" style={{ width: `${pct}%` }}>
            <span className="gauge-scan" />
          </div>
          <div className="gauge-ticks" />
        </div>

        <div className="gauge-meta">
          <span className="gauge-count">
            {Math.min(state.done, state.total)} / {state.total} sources
          </span>
          <span className="gauge-pct">{pct}%</span>
        </div>
      </div>
    </div>
  )
}
