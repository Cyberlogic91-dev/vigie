import { useEffect } from 'react'
import type { Article } from '../../../shared/types'
import { toParagraphs, decodeEntities, readingTimeMin } from '../../../shared/text'

interface Props {
  article: Article
  onClose: () => void
}

export function ReadingMode({ article, onClose }: Props): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="reading-overlay">
      <div className="reading-bar">
        <span className="reading-source">
          <span className={`badge type-${article.sourceType}`}>{article.sourceType}</span>
          {article.sourceName}
        </span>
        <div style={{ flex: 1 }} />
        <a className="btn" href={article.link} target="_blank" rel="noreferrer">
          🔗 Article original
        </a>
        <button className="btn" onClick={onClose} title="Quitter (Échap)">
          ✕ Fermer
        </button>
      </div>
      <article className="reading-content">
        <h1>{article.title}</h1>
        <div className="reading-meta">
          {article.author && <span>par {article.author}</span>}
          <span>{new Date(article.publishedAt).toLocaleString('fr-FR')}</span>
          <span>🏷️ {article.category}</span>
          {article.content && <span>⏱️ {readingTimeMin(article.content)} min de lecture</span>}
        </div>
        {article.image && (
          <img
            className="reading-hero"
            src={article.image}
            alt=""
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        {article.summary && (
          <div className="summary-box">
            <h5>🤖 Résumé IA</h5>
            <p>{decodeEntities(article.summary)}</p>
          </div>
        )}
        <div className="reading-body">
          {article.content ? (
            toParagraphs(article.content).map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>Aucun contenu récupéré pour cet article. Ouvrez l’article original.</p>
          )}
        </div>
        {article.tags.length > 0 && (
          <div className="reading-tags">
            {article.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}
