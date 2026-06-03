import { useEffect, useState } from 'react'
import type { Source, SourceType, Lang } from '../../../shared/types'
import { LANGS } from '../../../shared/types'

const flagOf = (lang: Lang): string => LANGS.find((l) => l.code === lang)?.flag ?? '🏳️'

interface Props {
  onClose: () => void
  onToast?: (msg: string) => void
}

const TYPE_LABELS: Record<SourceType, string> = {
  rss: 'RSS / Atom',
  github: 'GitHub (releases)',
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  mastodon: 'Mastodon'
}

const URL_HINTS: Record<SourceType, string> = {
  rss: 'URL du flux, ex : https://www.theverge.com/rss/index.xml',
  github: 'Dépôt au format owner/repo, ex : facebook/react',
  hackernews: 'Terme de recherche (laisser vide pour la front page)',
  reddit: 'URL du flux .rss, ex : https://www.reddit.com/r/programming/.rss',
  mastodon: 'URL du flux .rss d’un compte ou tag Mastodon'
}

export function SourcesModal({ onClose, onToast }: Props): JSX.Element {
  const [sources, setSources] = useState<Source[]>([])
  const [type, setType] = useState<SourceType>('rss')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('Général')
  const [lang, setLang] = useState<Lang>('fr')

  const load = async (): Promise<void> => setSources(await window.vigie.getSources())

  useEffect(() => {
    void load()
  }, [])

  const add = async (): Promise<void> => {
    if (!name.trim()) return
    if (type !== 'hackernews' && !url.trim()) return
    await window.vigie.addSource({ type, name: name.trim(), url: url.trim(), category: category.trim() || 'Général', lang, enabled: true })
    setName('')
    setUrl('')
    await load()
  }

  const toggle = async (s: Source): Promise<void> => {
    await window.vigie.updateSource(s.id, { enabled: !s.enabled })
    await load()
  }

  const remove = async (id: string): Promise<void> => {
    await window.vigie.deleteSource(id)
    await load()
  }

  const refreshOne = async (id: string): Promise<void> => {
    await window.vigie.refreshSource(id)
  }

  const exportOpml = async (): Promise<void> => {
    const res = await window.vigie.exportOpml()
    if (res.saved) onToast?.('Sources exportées')
  }

  const importOpml = async (): Promise<void> => {
    const res = await window.vigie.importOpml()
    if (res.cancelled) return
    await load()
    onToast?.(res.added > 0 ? `${res.added} source(s) importée(s)` : 'Aucune nouvelle source')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Gérer les sources</h2>

        <div className="field">
          <label>Ajouter une source</label>
          <div className="row" style={{ marginBottom: 10 }}>
            <select value={type} onChange={(e) => setType(e.target.value as SourceType)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input placeholder="Nom affiché" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <input
            style={{ width: '100%', marginBottom: 6 }}
            placeholder={type === 'hackernews' ? 'Terme de recherche (optionnel)' : 'URL / identifiant'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="hint">{URL_HINTS[type]}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <input placeholder="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} />
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
            <button className="btn primary" onClick={add}>
              + Ajouter
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Sources configurées ({sources.length})
          </label>
          <div style={{ marginTop: 8 }}>
            {sources.map((s) => (
              <div className="source-row" key={s.id}>
                <input type="checkbox" checked={s.enabled} onChange={() => toggle(s)} title="Activer/désactiver" />
                <span
                  className={`health ${s.lastError ? 'err' : s.lastFetchedAt ? 'ok' : 'idle'}`}
                  title={
                    s.lastError
                      ? `Erreur : ${s.lastError}`
                      : s.lastFetchedAt
                        ? `OK · ${s.lastCount ?? 0} article(s) · ${new Date(s.lastFetchedAt).toLocaleString('fr-FR')}`
                        : 'Jamais récupérée'
                  }
                />
                <div className="info">
                  <div className="nm">
                    {s.name} <span className={`badge type-${s.type}`}>{s.type}</span>
                  </div>
                  <div className="sub">
                    {s.url || '(front page)'} · {s.category} · {flagOf(s.lang)} {s.lang.toUpperCase()}
                    {s.lastError && <span style={{ color: 'var(--danger)' }}> · ⚠ erreur</span>}
                  </div>
                </div>
                <button className="btn" onClick={() => refreshOne(s.id)} title="Actualiser cette source">
                  ↻
                </button>
                <button className="btn danger" onClick={() => remove(s.id)} title="Supprimer">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={importOpml} title="Importer un fichier OPML">
            ⬆ Importer OPML
          </button>
          <button className="btn" onClick={exportOpml} title="Exporter vers un fichier OPML">
            ⬇ Exporter OPML
          </button>
          <button className="btn primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
