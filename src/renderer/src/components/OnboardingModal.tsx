import { useState } from 'react'
import type { AppSettings, FeedLanguage } from '../../../shared/types'
import { LANGS } from '../../../shared/types'

interface Props {
  initial: AppSettings
  onDone: (settings: AppSettings) => void | Promise<void>
}

export function OnboardingModal({ initial, onDone }: Props): JSX.Element {
  const [feedLanguage, setFeedLanguage] = useState<FeedLanguage>(initial.feedLanguage)
  const [addSources, setAddSources] = useState(true)
  const [busy, setBusy] = useState(false)

  const finish = async (): Promise<void> => {
    setBusy(true)
    if (addSources) {
      await window.vigie.addRecommendedSources(feedLanguage)
    }
    await onDone({ ...initial, feedLanguage })
  }

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>👋 Bienvenue dans Vigie</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 18 }}>
          Votre sentinelle de veille technologique. Configurons l'essentiel en deux clics — les résumés IA
          fonctionnent déjà gratuitement et hors-ligne.
        </p>

        <div className="field">
          <label>Langue de votre veille</label>
          <select value={feedLanguage} onChange={(e) => setFeedLanguage(e.target.value as FeedLanguage)}>
            <option value="all">🌐 Toutes langues</option>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <div className="checkbox">
            <input
              type="checkbox"
              id="ob-sources"
              checked={addSources}
              onChange={(e) => setAddSources(e.target.checked)}
            />
            <label htmlFor="ob-sources" style={{ margin: 0 }}>
              Ajouter automatiquement des sources recommandées pour cette langue
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={finish} disabled={busy}>
            {busy ? <span className="spinner" /> : '🚀'} Commencer
          </button>
        </div>
      </div>
    </div>
  )
}
