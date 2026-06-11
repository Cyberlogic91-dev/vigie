import { useEffect, useState } from 'react'
import type { Article } from '../../../shared/types'
import { toParagraphs, decodeEntities, readingTimeMin } from '../../../shared/text'

interface Props {
  article: Article
  onChanged: () => Promise<void> | void
  onToast: (msg: string) => void
  onRead: () => void
  onBack?: () => void
}

export function ArticleDetail({ article, onChanged, onToast, onRead, onBack }: Props): JSX.Element {
  const [summarizing, setSummarizing] = useState(false)
  const [loadingText, setLoadingText] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')

  // Réinitialise la traduction quand on change d'article
  useEffect(() => {
    setTranslation(null)
  }, [article.id])

  const exportMarkdown = async (): Promise<void> => {
    const res = await window.vigie.exportArticleMarkdown(article.id)
    if (res.saved) onToast('Article exporté en Markdown')
  }

  const translateTo = async (): Promise<void> => {
    setTranslating(true)
    try {
      const text = await window.vigie.translateArticle(article.id, article.lang === 'fr' ? 'en' : 'fr')
      setTranslation(text)
    } catch (err) {
      onToast('Traduction : ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setTranslating(false)
    }
  }

  const fetchFullText = async (): Promise<void> => {
    setLoadingText(true)
    try {
      await window.vigie.fetchFullText(article.id)
      await onChanged()
      onToast('Texte complet récupéré')
    } catch (err) {
      onToast('Texte complet : ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoadingText(false)
    }
  }

  const summarize = async (): Promise<void> => {
    setSummarizing(true)
    try {
      await window.vigie.summarizeArticle(article.id)
      await onChanged()
      onToast('Résumé généré')
    } catch (err) {
      onToast('Erreur IA : ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSummarizing(false)
    }
  }

  const toggleStar = async (): Promise<void> => {
    await window.vigie.toggleStar(article.id)
    await onChanged()
  }

  const markUnread = async (): Promise<void> => {
    await window.vigie.markRead(article.id, false)
    await onChanged()
  }

  const addTag = async (): Promise<void> => {
    const t = newTag.trim().toLowerCase()
    if (!t || article.tags.includes(t)) return
    await window.vigie.setArticleTags(article.id, [...article.tags, t])
    setNewTag('')
    await onChanged()
  }

  const removeTag = async (tag: string): Promise<void> => {
    await window.vigie.setArticleTags(
      article.id,
      article.tags.filter((t) => t !== tag)
    )
    await onChanged()
  }

  return (
    <div className="detail">
      {onBack && (
        <button className="detail-back" onClick={onBack}>
          ← Retour
        </button>
      )}
      <h1>{article.title}</h1>
      {article.image && (
        <img
          className="detail-hero"
          src={article.image}
          alt=""
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}
      <div className="detail-meta">
        <span className={`badge type-${article.sourceType}`}>{article.sourceType}</span>
        <span>{article.sourceName}</span>
        {article.author && <span>· par {article.author}</span>}
        <span>· {new Date(article.publishedAt).toLocaleString('fr-FR')}</span>
        <span>· 🏷️ {article.category}</span>
        {article.content && <span>· ⏱️ {readingTimeMin(article.content)} min</span>}
      </div>

      <div className="detail-actions">
        <a className="btn primary" href={article.link} target="_blank" rel="noreferrer">
          🔗 Ouvrir l'article
        </a>
        <button className="btn" onClick={onRead} title="Mode lecture plein écran">
          📖 Lecture
        </button>
        {!article.hasFullText && (
          <button className="btn" onClick={fetchFullText} disabled={loadingText} title="Récupérer le texte intégral de la page">
            {loadingText ? <span className="spinner" /> : '📄'} Texte complet
          </button>
        )}
        <button className="btn" onClick={summarize} disabled={summarizing}>
          {summarizing ? <span className="spinner" /> : '🤖'} Résumer (IA)
        </button>
        <button className="btn" onClick={toggleStar}>
          <span className={`star ${article.starred ? 'on' : ''}`}>★</span>
          {article.starred ? ' Favori' : ' Ajouter aux favoris'}
        </button>
        <button className="btn" onClick={translateTo} disabled={translating} title="Traduire (via Ollama)">
          {translating ? <span className="spinner" /> : '🌐'} Traduire
        </button>
        <button className="btn" onClick={exportMarkdown} title="Exporter en Markdown">
          ⬇ Markdown
        </button>
        <button className="btn" onClick={markUnread}>
          ● Marquer non lu
        </button>
      </div>

      {article.summary && (
        <div className="summary-box">
          <h5>🤖 Résumé IA</h5>
          <p>{decodeEntities(article.summary)}</p>
        </div>
      )}

      <div className="tag-editor">
        {article.tags.map((t) => (
          <span key={t} className="tag" title="Cliquer pour retirer" onClick={() => removeTag(t)}>
            {t} ✕
          </span>
        ))}
        <input
          style={{ width: 130, padding: '4px 8px' }}
          placeholder="+ tag"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
        />
      </div>

      {translation && (
        <div className="summary-box" style={{ borderLeftColor: 'var(--green)' }}>
          <h5 style={{ color: 'var(--green)' }}>🌐 Traduction</h5>
          {toParagraphs(translation).map((p, i) => (
            <p key={i} style={{ marginBottom: 8 }}>
              {p}
            </p>
          ))}
        </div>
      )}

      {article.hasFullText && (
        <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 8 }}>📄 Texte intégral récupéré</div>
      )}
      <div className="detail-content">
        {article.content ? (
          toParagraphs(article.content).map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p>Aucun contenu récupéré. Ouvrez l’article original.</p>
        )}
      </div>
    </div>
  )
}
