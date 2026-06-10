import { useState } from 'react'
import type { AppSettings } from '../../../shared/types'
import { LANGS } from '../../../shared/types'

interface Props {
  initial: AppSettings
  onClose: () => void
  onSaved: (s: AppSettings) => void
  onToast: (msg: string) => void
  onDataChanged: () => void
}

export function SettingsModal({ initial, onClose, onSaved, onToast, onDataChanged }: Props): JSX.Element {
  const [s, setS] = useState<AppSettings>(initial)

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void =>
    setS((prev) => ({ ...prev, [key]: value }))

  const save = async (): Promise<void> => {
    const saved = await window.vigie.saveSettings(s)
    onSaved(saved)
  }

  const exportData = async (): Promise<void> => {
    const res = await window.vigie.exportData()
    if (res.saved) onToast('Sauvegarde enregistrée')
  }

  const importData = async (): Promise<void> => {
    const res = await window.vigie.importData()
    if (res.cancelled) return
    onDataChanged()
    onToast(`Restauré : ${res.sources} source(s), ${res.articles} article(s)`)
  }

  const addRecommended = async (): Promise<void> => {
    const n = await window.vigie.addRecommendedSources(s.feedLanguage)
    onDataChanged()
    onToast(n > 0 ? `${n} source(s) recommandée(s) ajoutée(s)` : 'Toutes déjà présentes')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Réglages</h2>

        <div className="field">
          <label>Langue du flux</label>
          <select value={s.feedLanguage} onChange={(e) => set('feedLanguage', e.target.value as AppSettings['feedLanguage'])}>
            <option value="all">🌐 Toutes langues</option>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
          <div className="hint">
            Filtre les articles affichés et oriente la langue des résumés IA.
          </div>
          <div className="checkbox" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              id="autodetect"
              checked={s.autoDetectLang}
              onChange={(e) => set('autoDetectLang', e.target.checked)}
            />
            <label htmlFor="autodetect" style={{ margin: 0 }}>
              Détecter automatiquement la langue de chaque article (sources multilingues)
            </label>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={addRecommended}>
              ➕ Ajouter les sources recommandées
              {s.feedLanguage !== 'all' ? ` (${s.feedLanguage.toUpperCase()})` : ''}
            </button>
          </div>
        </div>

        <div className="field">
          <label>Moteur de résumé IA (gratuit, sans clé)</label>
          <select value={s.aiProvider} onChange={(e) => set('aiProvider', e.target.value as AppSettings['aiProvider'])}>
            <option value="local">IA locale intégrée (hors-ligne, instantanée)</option>
            <option value="ollama">Ollama (modèles avancés, en local)</option>
          </select>
          <div className="hint">
            {s.aiProvider === 'local'
              ? 'Résumé extractif calculé sur votre machine — aucune connexion ni clé requise.'
              : 'Nécessite Ollama installé et lancé localement. 100 % gratuit et privé.'}
          </div>
        </div>

        {s.aiProvider === 'ollama' && (
          <div className="row">
            <div className="field">
              <label>URL Ollama</label>
              <input
                placeholder="http://localhost:11434"
                value={s.ollamaUrl}
                onChange={(e) => set('ollamaUrl', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Modèle</label>
              <input
                placeholder="llama3.2"
                value={s.ollamaModel}
                onChange={(e) => set('ollamaModel', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="field">
          <div className="checkbox">
            <input
              type="checkbox"
              id="auto"
              checked={s.autoSummarize}
              onChange={(e) => set('autoSummarize', e.target.checked)}
            />
            <label htmlFor="auto" style={{ margin: 0 }}>
              Résumer automatiquement les nouveaux articles
            </label>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label>Actualisation auto (minutes, 0 = off)</label>
            <input
              type="number"
              min={0}
              value={s.refreshIntervalMin}
              onChange={(e) => set('refreshIntervalMin', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Digest quotidien (HH:mm, vide = off)</label>
            <input
              type="time"
              value={s.digestTime}
              onChange={(e) => set('digestTime', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <div className="checkbox">
            <input
              type="checkbox"
              id="notif"
              checked={s.notificationsEnabled}
              onChange={(e) => set('notificationsEnabled', e.target.checked)}
            />
            <label htmlFor="notif" style={{ margin: 0 }}>
              Notifications système pour les nouveaux articles
            </label>
          </div>
        </div>

        <div className="field">
          <div className="checkbox">
            <input
              type="checkbox"
              id="scrollread"
              checked={s.markReadOnScroll}
              onChange={(e) => set('markReadOnScroll', e.target.checked)}
            />
            <label htmlFor="scrollread" style={{ margin: 0 }}>
              Marquer comme lus les articles dépassés au défilement
            </label>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label>Thème</label>
            <select value={s.theme} onChange={(e) => set('theme', e.target.value as 'light' | 'dark')}>
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </div>
          <div className="field">
            <label>Couleur d'accent</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                style={{ width: 48, padding: 2, height: 38 }}
                value={s.accentColor || '#6e8bff'}
                onChange={(e) => set('accentColor', e.target.value)}
              />
              <button className="btn" onClick={() => set('accentColor', '')} title="Réinitialiser">
                Défaut
              </button>
            </div>
          </div>
        </div>

        <div className="field">
          <label>Taille du texte : {Math.round(s.fontScale * 100)} %</label>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.05}
            value={s.fontScale}
            onChange={(e) => set('fontScale', Number(e.target.value))}
          />
        </div>

        <div className="row">
          <div className="field">
            <label>Masquer les articles contenant…</label>
            <input
              placeholder="mots-clés, séparés par des virgules"
              value={s.muteKeywords}
              onChange={(e) => set('muteKeywords', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Mettre en avant…</label>
            <input
              placeholder="mots-clés, séparés par des virgules"
              value={s.highlightKeywords}
              onChange={(e) => set('highlightKeywords', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <div className="checkbox">
            <input
              type="checkbox"
              id="tray"
              checked={s.closeToTray}
              onChange={(e) => set('closeToTray', e.target.checked)}
            />
            <label htmlFor="tray" style={{ margin: 0 }}>
              Réduire dans la zone de notification au lieu de quitter (actualisation en arrière-plan)
            </label>
          </div>
        </div>

        <div className="field">
          <label>Sauvegarde des données</label>
          <div className="row">
            <button className="btn" onClick={exportData}>
              ⬇ Exporter une sauvegarde
            </button>
            <button className="btn" onClick={importData}>
              ⬆ Restaurer une sauvegarde
            </button>
          </div>
          <div className="hint">Exporte/restaure sources, articles et réglages dans un fichier JSON.</div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" onClick={save}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
