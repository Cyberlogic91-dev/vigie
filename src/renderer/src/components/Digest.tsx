import type { Article } from '../../../shared/types'
import { decodeEntities } from '../../../shared/text'

interface Props {
  articles: Article[]
  busy: boolean
  onCondense: () => void
  onOpen: (a: Article) => void
}

/**
 * Vue « Condensé » : chaque nouvelle réduite à son résumé IA, en lecture rapide.
 * Le bouton « Condenser » génère les résumés manquants (IA locale ou Ollama).
 */
export function Digest({ articles, busy, onCondense, onOpen }: Props): JSX.Element {
  const items = articles.slice(0, 80)
  const pending = items.filter((a) => !a.summary).length

  return (
    <div className="digest">
      <div className="digest-head">
        <div>
          <h2>🗞️ Condensé des nouvelles</h2>
          <p className="muted">
            {items.length} actualité{items.length > 1 ? 's' : ''}
            {pending > 0 ? ` · ${pending} sans résumé` : ' · toutes résumées'}
          </p>
        </div>
        {pending > 0 && (
          <button className="btn primary" onClick={onCondense} disabled={busy}>
            {busy ? <span className="spinner" /> : '🤖'} Condenser ({Math.min(pending, 25)})
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 40 }}>🗞️</div>
          <p>Aucune actualité pour ce filtre. Lancez une actualisation.</p>
        </div>
      ) : (
        <div className="digest-list">
          {items.map((a) => (
            <article key={a.id} className="digest-item" onClick={() => onOpen(a)}>
              <div className="article-meta">
                <span className={`badge type-${a.sourceType}`}>{a.sourceType}</span>
                <span>{a.sourceName}</span>
                <span>·</span>
                <span>{new Date(a.publishedAt).toLocaleDateString('fr-FR')}</span>
                {a.summary && <span title="Résumé par IA">🤖</span>}
                {!a.read && <span className="dot-unread" />}
              </div>
              <h3 className="digest-title">{a.title}</h3>
              <p className="digest-summary">
                {a.summary ? (
                  decodeEntities(a.summary)
                ) : (
                  <span className="muted">Résumé non encore généré — cliquez « Condenser ».</span>
                )}
              </p>
              {a.tags.length > 0 && (
                <div className="article-meta">
                  {a.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
