import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Article,
  ArticleQuery,
  AppSettings,
  SourceType,
  Lang,
  FeedLanguage,
  Source,
  UnreadCounts,
  SavedSearch
} from '../../shared/types'
import { LANGS } from '../../shared/types'
import { decodeEntities } from '../../shared/text'
import { SourcesModal } from './components/SourcesModal'
import { SettingsModal } from './components/SettingsModal'
import { ArticleDetail } from './components/ArticleDetail'
import { Dashboard } from './components/Dashboard'
import { ReadingMode } from './components/ReadingMode'
import { BriefModal } from './components/BriefModal'
import { OnboardingModal } from './components/OnboardingModal'
import { Digest } from './components/Digest'
import { RefreshGauge } from './components/RefreshGauge'
import type { RefreshState } from '../../shared/types'

/** Domaine d'un article/source pour le favicon. */
function faviconUrl(u: string): string | null {
  try {
    const host = new URL(u).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  } catch {
    return null
  }
}

const PAGE = 40

const SOURCE_TYPES: { type: SourceType; label: string }[] = [
  { type: 'rss', label: 'RSS / Atom' },
  { type: 'hackernews', label: 'Hacker News' },
  { type: 'github', label: 'GitHub' },
  { type: 'reddit', label: 'Reddit' },
  { type: 'mastodon', label: 'Mastodon' }
]

export default function App(): JSX.Element {
  const [articles, setArticles] = useState<Article[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [query, setQuery] = useState<ArticleQuery>({})
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [view, setView] = useState<'feed' | 'dashboard' | 'digest'>('feed')
  const [reading, setReading] = useState<Article | null>(null)
  const [groupBySource, setGroupBySource] = useState(false)
  const [counts, setCounts] = useState<UnreadCounts | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [brief, setBrief] = useState<{ loading: boolean; text: string } | null>(null)
  const [savingSearch, setSavingSearch] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [refreshState, setRefreshState] = useState<RefreshState | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filtre de langue dérivé du réglage « langue du flux »
  const langFilter: Lang | undefined =
    settings && settings.feedLanguage !== 'all' ? settings.feedLanguage : undefined

  // Requête effective : combine les filtres courants et la langue
  const effectiveQuery = useCallback(
    (extra?: Partial<ArticleQuery>): ArticleQuery => ({ ...query, lang: langFilter, ...extra }),
    [query, langFilter]
  )

  const loadArticles = useCallback(async () => {
    const list = await window.vigie.getArticles({ ...query, lang: langFilter })
    setArticles(list)
    setLimit(PAGE)
    if (listRef.current) listRef.current.scrollTop = 0
    setSelected((prev) => (prev ? list.find((a) => a.id === prev.id) ?? prev : null))
  }, [query, langFilter])

  const loadMeta = useCallback(async () => {
    setCategories(await window.vigie.getCategories())
    setSources(await window.vigie.getSources())
    setCounts(await window.vigie.getUnreadCounts())
  }, [])

  useEffect(() => {
    void loadArticles()
  }, [loadArticles])

  // Applique l'apparence (thème, police, accent) à chaque changement de réglages
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    root.setAttribute('data-theme', settings.theme)
    root.style.fontSize = `${Math.round((settings.fontScale || 1) * 100)}%`
    if (settings.accentColor) {
      root.style.setProperty('--accent', settings.accentColor)
      root.style.setProperty('--accent-grad', `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor})`)
    } else {
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-grad')
    }
  }, [settings])

  useEffect(() => {
    void loadMeta()
    window.vigie.getSettings().then((s) => {
      setSettings(s)
    })
    const off = window.vigie.onRefreshProgress((msg) => {
      if (msg === '__articles_updated__') {
        void loadArticles()
        void loadMeta()
      } else {
        setToast(msg)
      }
    })
    const offStatus = window.vigie.onUpdateStatus((msg) => setToast(msg))
    const offReady = window.vigie.onUpdateReady((v) => setUpdateVersion(v))
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    const offState = window.vigie.onRefreshState((st) => {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      setRefreshState(st)
      if (!st.active) hideTimer = setTimeout(() => setRefreshState(null), 1200)
    })
    return () => {
      off()
      offStatus()
      offReady()
      offState()
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [loadArticles, loadMeta])

  // Debounce de la recherche
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => ({ ...q, search: search || undefined })), 300)
    return () => clearTimeout(t)
  }, [search])

  // Masque le toast après un délai
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const refreshAll = async (): Promise<void> => {
    setRefreshing(true)
    try {
      const results = await window.vigie.refreshAll()
      await loadArticles()
      await loadMeta()
      const total = results.reduce((n, r) => n + r.added, 0)
      const errors = results.filter((r) => r.error)
      setToast(
        `${total} nouvel(s) article(s)` + (errors.length ? ` — ${errors.length} source(s) en erreur` : '')
      )
    } finally {
      setRefreshing(false)
    }
  }

  const markAllRead = async (): Promise<void> => {
    const n = await window.vigie.markAllRead(effectiveQuery())
    await loadArticles()
    refreshCounts()
    setToast(n > 0 ? `${n} article(s) marqué(s) comme lu(s)` : 'Aucun article non lu')
  }

  const changeFeedLanguage = async (feedLanguage: FeedLanguage): Promise<void> => {
    if (!settings) return
    const saved = await window.vigie.saveSettings({ ...settings, feedLanguage })
    setSettings(saved)
  }

  const toggleLayout = async (): Promise<void> => {
    if (!settings) return
    const cardLayout = settings.cardLayout === 'magazine' ? 'compact' : 'magazine'
    const saved = await window.vigie.saveSettings({ ...settings, cardLayout })
    setSettings(saved)
  }

  // ---- Recherches enregistrées (dossiers intelligents) ----
  const hasActiveFilter = Boolean(
    search.trim() || query.unreadOnly || query.starredOnly || query.category || query.sourceType || query.tag
  )

  const describeQuery = (): string => {
    const parts: string[] = []
    if (search.trim()) parts.push(`« ${search.trim()} »`)
    if (query.unreadOnly) parts.push('non lus')
    if (query.starredOnly) parts.push('favoris')
    if (query.category) parts.push(query.category)
    if (query.sourceType) parts.push(query.sourceType)
    return parts.join(' · ') || 'Recherche'
  }

  const saveCurrentSearch = async (): Promise<void> => {
    if (!settings) return
    const name = searchName.trim() || describeQuery()
    const entry: SavedSearch = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      query: { ...query, search: search.trim() || undefined }
    }
    const saved = await window.vigie.saveSettings({
      ...settings,
      savedSearches: [...(settings.savedSearches ?? []), entry]
    })
    setSettings(saved)
    setSavingSearch(false)
    setSearchName('')
    setToast(`Recherche « ${name} » enregistrée`)
  }

  const applySavedSearch = (s: SavedSearch): void => {
    setView('feed')
    setSearch(s.query.search ?? '')
    setQuery(s.query)
  }

  const removeSavedSearch = async (id: string): Promise<void> => {
    if (!settings) return
    const saved = await window.vigie.saveSettings({
      ...settings,
      savedSearches: (settings.savedSearches ?? []).filter((x) => x.id !== id)
    })
    setSettings(saved)
  }

  // L'utilisateur a-t-il au moins une source active dans la langue filtrée ?
  const hasSourcesForLang =
    !langFilter || sources.some((s) => s.enabled && s.lang === langFilter)

  const addSourcesForCurrentLang = async (): Promise<void> => {
    if (!settings) return
    setRefreshing(true)
    try {
      const n = await window.vigie.addRecommendedSources(settings.feedLanguage)
      await loadMeta()
      await window.vigie.refreshAll()
      await loadArticles()
      setToast(`${n} source(s) ajoutée(s) et actualisées`)
    } finally {
      setRefreshing(false)
    }
  }

  const [summarizingBatch, setSummarizingBatch] = useState(false)
  const summarizeUnread = async (): Promise<void> => {
    setSummarizingBatch(true)
    try {
      const { done, failed } = await window.vigie.summarizeUnread(effectiveQuery())
      await loadArticles()
      setToast(`${done} résumé(s) généré(s)` + (failed ? ` — ${failed} échec(s)` : ''))
    } finally {
      setSummarizingBatch(false)
    }
  }

  const refreshCounts = (): void => {
    void window.vigie.getUnreadCounts().then(setCounts)
  }

  const openArticle = async (art: Article): Promise<void> => {
    setSelected(art)
    if (!art.read) {
      await window.vigie.markRead(art.id, true)
      setArticles((list) => list.map((a) => (a.id === art.id ? { ...a, read: true } : a)))
      refreshCounts()
    }
  }

  const generateBrief = async (): Promise<void> => {
    setBrief({ loading: true, text: '' })
    try {
      const text = await window.vigie.generateBrief(effectiveQuery())
      setBrief({ loading: false, text })
    } catch (err) {
      setBrief({ loading: false, text: 'Erreur : ' + (err instanceof Error ? err.message : String(err)) })
    }
  }

  // Filtrage par mots-clés (masquer) + mise en avant (surligner)
  const muteList = useMemo(
    () => (settings?.muteKeywords ?? '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    [settings?.muteKeywords]
  )
  const highlightList = useMemo(
    () => (settings?.highlightKeywords ?? '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    [settings?.highlightKeywords]
  )
  const matchesAny = (art: Article, list: string[]): boolean => {
    if (list.length === 0) return false
    const hay = (art.title + ' ' + art.content).toLowerCase()
    return list.some((k) => hay.includes(k))
  }
  const filteredArticles = useMemo(
    () => (muteList.length ? articles.filter((a) => !matchesAny(a, muteList)) : articles),
    [articles, muteList]
  )

  // Pagination (scroll infini)
  const visibleArticles = useMemo(() => filteredArticles.slice(0, limit), [filteredArticles, limit])
  const onListScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400 && limit < filteredArticles.length) {
      setLimit((l) => l + PAGE)
    }
  }

  // Regroupement par source pour l'affichage en sections
  const grouped = useMemo(() => {
    if (!groupBySource) return null
    const map = new Map<string, Article[]>()
    for (const a of filteredArticles) {
      const arr = map.get(a.sourceName) ?? []
      arr.push(a)
      map.set(a.sourceName, arr)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [filteredArticles, groupBySource])

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || reading || showSettings || showSources) return
      const list = filteredArticles
      const idx = selected ? list.findIndex((a) => a.id === selected.id) : -1
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = list[Math.min(idx + 1, list.length - 1)]
        if (next) void openArticle(next)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = list[Math.max(idx - 1, 0)]
        if (prev) void openArticle(prev)
      } else if (e.key === 'o' && selected) {
        window.open(selected.link, '_blank')
      } else if (e.key === 'm' && selected) {
        void window.vigie.markRead(selected.id, !selected.read).then(() => {
          void loadArticles()
          refreshCounts()
        })
      } else if (e.key === 's' && selected) {
        void window.vigie.toggleStar(selected.id).then(loadArticles)
      } else if (e.key === 'r') {
        void refreshAll()
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredArticles, selected, reading, showSettings, showSources])

  // Marquer lu au défilement : un article dont la carte sort par le haut est marqué lu
  useEffect(() => {
    if (!settings?.markReadOnScroll || view !== 'feed') return
    const container = listRef.current
    if (!container) return
    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = (): void => {
      timer = null
      const ids = [...pending]
      pending.clear()
      if (ids.length === 0) return
      void Promise.all(ids.map((id) => window.vigie.markRead(id, true))).then(() => {
        setArticles((list) => list.map((a) => (ids.includes(a.id) ? { ...a, read: true } : a)))
        refreshCounts()
      })
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // La carte est sortie par le haut du conteneur
          if (!e.isIntersecting && e.boundingClientRect.bottom < (e.rootBounds?.top ?? 0) + 1) {
            const id = (e.target as HTMLElement).dataset.id
            if (id) pending.add(id)
          }
        }
        if (pending.size > 0 && !timer) timer = setTimeout(flush, 400)
      },
      { root: container, threshold: 0 }
    )
    container.querySelectorAll('.article-card[data-unread]').forEach((el) => observer.observe(el))
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [settings?.markReadOnScroll, view, visibleArticles])

  const activeKey = useMemo(() => {
    if (query.starredOnly) return 'starred'
    if (query.unreadOnly) return 'unread'
    if (query.sourceType) return `type:${query.sourceType}`
    if (query.category) return `cat:${query.category}`
    return 'all'
  }, [query])

  const unreadCount = articles.filter((a) => !a.read).length
  // Types de source réellement présents dans les sources de l'utilisateur
  const presentTypes = useMemo(() => new Set(sources.map((s) => s.type)), [sources])

  const layout = settings?.cardLayout ?? 'magazine'

  const onImgError = (e: { currentTarget: HTMLImageElement }): void => {
    e.currentTarget.style.display = 'none'
  }

  const cardInner = (art: Article): JSX.Element => {
    const fav = faviconUrl(art.link)
    const meta = (
      <div className="article-meta">
        {fav ? (
          <img className="favicon" src={fav} alt="" loading="lazy" onError={onImgError} />
        ) : (
          <span className={`badge type-${art.sourceType}`}>{art.sourceType}</span>
        )}
        <span>{art.sourceName}</span>
        <span>·</span>
        <span>{new Date(art.publishedAt).toLocaleDateString('fr-FR')}</span>
        {art.starred && <span className="star on">★</span>}
        {art.summary && <span title="Résumé IA disponible">🤖</span>}
        {(art.dupCount ?? 1) > 1 && (
          <span className="dup-badge" title="Sujet couvert par plusieurs sources">
            🔁 {art.dupCount} sources
          </span>
        )}
      </div>
    )
    const tags = art.tags.length > 0 && (
      <div className="article-meta">
        {art.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
    )

    if (layout === 'magazine') {
      return (
        <>
          {art.image && (
            <img className="article-cover" src={art.image} alt="" loading="lazy" onError={onImgError} />
          )}
          {meta}
          <div className="article-title">{art.title}</div>
          {tags}
          <div className="article-snippet">{decodeEntities(art.summary || art.content)}</div>
        </>
      )
    }
    // compact : vignette latérale
    return (
      <div className="article-card-body">
        <div className="article-card-text">
          {meta}
          <div className="article-title">{art.title}</div>
          {tags}
          <div className="article-snippet">{decodeEntities(art.summary || art.content)}</div>
        </div>
        {art.image && (
          <img className="article-thumb" src={art.image} alt="" loading="lazy" onError={onImgError} />
        )}
      </div>
    )
  }

  const renderCard = (art: Article): JSX.Element => (
    <div
      key={art.id}
      data-id={art.id}
      data-unread={art.read ? undefined : ''}
      className={`article-card ${art.read ? '' : 'unread'} ${selected?.id === art.id ? 'selected' : ''} ${
        matchesAny(art, highlightList) ? 'highlight' : ''
      }`}
      onClick={() => openArticle(art)}
    >
      {cardInner(art)}
    </div>
  )

  return (
    <div className={`app ${navOpen ? 'nav-open' : ''}`}>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
      {/* ---------- Barre latérale ---------- */}
      <aside
        className={`sidebar ${navOpen ? 'open' : ''}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.nav-item, .saved-search-apply')) setNavOpen(false)
        }}
      >
        <div className="brand">
          <span className="brand-logo" aria-hidden="true" />
          Vigie
        </div>

        <div className="nav-section">
          <h4>Vue</h4>
          <button
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <span>📊 Tableau de bord</span>
          </button>
          <button
            className={`nav-item ${view === 'digest' ? 'active' : ''}`}
            onClick={() => setView('digest')}
          >
            <span>🗞️ Condensés</span>
          </button>
        </div>

        <div className="nav-section">
          <h4>Flux</h4>
          <button
            className={`nav-item ${view === 'feed' && activeKey === 'all' ? 'active' : ''}`}
            onClick={() => {
              setView('feed')
              setQuery({ search: search || undefined })
            }}
          >
            <span>📰 Tout</span>
            <span className="count">{counts?.allTotal ?? articles.length}</span>
          </button>
          <button
            className={`nav-item ${view === 'feed' && activeKey === 'unread' ? 'active' : ''}`}
            onClick={() => {
              setView('feed')
              setQuery({ unreadOnly: true, search: search || undefined })
            }}
          >
            <span>● Non lus</span>
            <span className="count">{counts?.total ?? unreadCount}</span>
          </button>
          <button
            className={`nav-item ${view === 'feed' && activeKey === 'starred' ? 'active' : ''}`}
            onClick={() => {
              setView('feed')
              setQuery({ starredOnly: true, search: search || undefined })
            }}
          >
            <span>★ Favoris</span>
            {counts && counts.starred > 0 && <span className="count">{counts.starred}</span>}
          </button>
        </div>

        {settings && (settings.savedSearches ?? []).length > 0 && (
          <div className="nav-section">
            <h4>Recherches</h4>
            {settings.savedSearches.map((s) => (
              <div key={s.id} className="nav-item saved-search">
                <button className="saved-search-apply" onClick={() => applySavedSearch(s)} title={s.name}>
                  🔖 {s.name}
                </button>
                <button className="saved-search-del" title="Supprimer" onClick={() => removeSavedSearch(s.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="nav-section">
          <h4>Types de source</h4>
          {SOURCE_TYPES.filter(({ type }) => presentTypes.has(type)).map(({ type, label }) => (
            <button
              key={type}
              className={`nav-item ${view === 'feed' && activeKey === `type:${type}` ? 'active' : ''}`}
              onClick={() => {
                setView('feed')
                setQuery({ sourceType: type, search: search || undefined })
              }}
            >
              <span>{label}</span>
              {counts && counts.byType[type] > 0 && <span className="count">{counts.byType[type]}</span>}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="nav-section">
            <h4>Catégories</h4>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`nav-item ${view === 'feed' && activeKey === `cat:${cat}` ? 'active' : ''}`}
                onClick={() => {
                  setView('feed')
                  setQuery({ category: cat, search: search || undefined })
                }}
              >
                <span>🏷️ {cat}</span>
                {counts && counts.byCategory[cat] > 0 && <span className="count">{counts.byCategory[cat]}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setShowSources(true)}>
            ⚙️ Gérer les sources
          </button>
          <button className="nav-item" onClick={() => setShowSettings(true)}>
            🔧 Réglages
          </button>
          <a className="site-link" href="https://www.cyberlogic.fr" target="_blank" rel="noreferrer">
            🌐 www.cyberlogic.fr
          </a>
        </div>
      </aside>

      {/* ---------- Zone principale ---------- */}
      <main className="main">
        {updateVersion && (
          <div className="update-banner">
            <span>✨ Vigie v{updateVersion} est prête à être installée.</span>
            <button className="btn primary" onClick={() => void window.vigie.installUpdate()}>
              Redémarrer pour installer
            </button>
            <button className="btn" onClick={() => setUpdateVersion(null)}>
              Plus tard
            </button>
          </div>
        )}
        <div className="toolbar">
          <button className="hamburger" onClick={() => setNavOpen((o) => !o)} title="Menu" aria-label="Menu">
            ☰
          </button>
          <input
            ref={searchRef}
            className="search"
            placeholder="Rechercher…  (/ pour cibler · j/k naviguer)"
            value={search}
            onChange={(e) => {
              setView('feed')
              setSearch(e.target.value)
            }}
          />
          {view !== 'dashboard' && (
            <select
              className="lang-select"
              title="Langue du flux"
              value={settings?.feedLanguage ?? 'all'}
              onChange={(e) => changeFeedLanguage(e.target.value as FeedLanguage)}
            >
              <option value="all">🌐 Toutes langues</option>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          )}
          {view !== 'dashboard' &&
            hasActiveFilter &&
            (savingSearch ? (
              <input
                className="save-search-input"
                autoFocus
                placeholder="Nom de la recherche…"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveCurrentSearch()
                  if (e.key === 'Escape') {
                    setSavingSearch(false)
                    setSearchName('')
                  }
                }}
              />
            ) : (
              <button
                className="btn"
                onClick={() => setSavingSearch(true)}
                title="Enregistrer la recherche et les filtres courants"
              >
                🔖
              </button>
            ))}
          {view === 'feed' && (
            <>
              <button
                className="btn"
                onClick={toggleLayout}
                title="Basculer entre disposition magazine et compacte"
              >
                {layout === 'magazine' ? '▤ Compact' : '▦ Magazine'}
              </button>
              <button
                className={`btn ${groupBySource ? 'primary' : ''}`}
                onClick={() => setGroupBySource((g) => !g)}
                title="Regrouper les articles par source"
              >
                ⊞ Grouper
              </button>
              <button className="btn" onClick={markAllRead} title="Marquer comme lus les articles affichés">
                ✓ Tout lu
              </button>
              <button
                className="btn"
                onClick={summarizeUnread}
                disabled={summarizingBatch}
                title="Générer un résumé IA pour les articles non résumés affichés (max 25)"
              >
                {summarizingBatch ? <span className="spinner" /> : '🤖'} Résumer
              </button>
              <button className="btn" onClick={generateBrief} title="Brief de synthèse du jour">
                📋 Brief
              </button>
            </>
          )}
          <button className="btn primary" onClick={refreshAll} disabled={refreshing}>
            {refreshing ? <span className="spinner" /> : '↻'} Actualiser
          </button>
        </div>

        {view === 'dashboard' ? (
          <Dashboard />
        ) : view === 'digest' ? (
          <Digest
            articles={filteredArticles}
            busy={summarizingBatch}
            onCondense={summarizeUnread}
            onOpen={(a) => {
              if (!a.read) {
                void window.vigie.markRead(a.id, true).then(() => {
                  void loadArticles()
                  refreshCounts()
                })
              }
              setReading(a)
            }}
          />
        ) : (
          <div className={`content ${selected ? '' : 'single'}`}>
            <div className="article-list" ref={listRef} onScroll={onListScroll}>
              {articles.length === 0 ? (
                <div className="empty">
                  <div style={{ fontSize: 40 }}>🛰️</div>
                  {langFilter && !hasSourcesForLang ? (
                    <>
                      <p>
                        Aucune source en{' '}
                        <b>{LANGS.find((l) => l.code === langFilter)?.label}</b> n'est configurée.
                      </p>
                      <button className="btn primary" onClick={addSourcesForCurrentLang} disabled={refreshing}>
                        {refreshing ? <span className="spinner" /> : '➕'} Ajouter les sources{' '}
                        {langFilter.toUpperCase()} recommandées
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Aucun article pour ce filtre.</p>
                      <button className="btn" onClick={refreshAll} disabled={refreshing}>
                        Lancer une actualisation
                      </button>
                    </>
                  )}
                </div>
              ) : grouped ? (
                grouped.map(([sourceName, items]) => (
                  <div key={sourceName} className="group">
                    <div className="group-header">
                      <span className={`badge type-${items[0].sourceType}`}>{items[0].sourceType}</span>
                      {sourceName}
                      <span className="count">{items.length}</span>
                    </div>
                    {items.map(renderCard)}
                  </div>
                ))
              ) : (
                <>
                  {visibleArticles.map(renderCard)}
                  {limit < filteredArticles.length && (
                    <button className="load-more" onClick={() => setLimit((l) => l + PAGE)}>
                      Afficher plus ({filteredArticles.length - limit})
                    </button>
                  )}
                </>
              )}
            </div>

            {selected && (
              <ArticleDetail
                article={selected}
                onChanged={loadArticles}
                onToast={setToast}
                onRead={() => setReading(selected)}
                onBack={() => setSelected(null)}
              />
            )}
          </div>
        )}
      </main>

      {showSources && (
        <SourcesModal
          onToast={setToast}
          onClose={() => {
            setShowSources(false)
            void loadMeta()
            void loadArticles()
          }}
        />
      )}
      {showSettings && settings && (
        <SettingsModal
          initial={settings}
          onToast={setToast}
          onDataChanged={() => {
            void loadArticles()
            void loadMeta()
          }}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s)
            document.documentElement.setAttribute('data-theme', s.theme)
            setShowSettings(false)
            setToast('Réglages enregistrés')
          }}
        />
      )}

      {reading && <ReadingMode article={reading} onClose={() => setReading(null)} />}

      {brief && (
        <BriefModal loading={brief.loading} text={brief.text} onClose={() => setBrief(null)} />
      )}

      {settings && !settings.onboarded && (
        <OnboardingModal
          initial={settings}
          onDone={async (s) => {
            const saved = await window.vigie.saveSettings({ ...s, onboarded: true })
            setSettings(saved)
            await loadMeta()
            await loadArticles()
          }}
        />
      )}

      {refreshState && <RefreshGauge state={refreshState} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
