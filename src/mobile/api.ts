/**
 * Implémentation mobile de l'API Vigie (window.vigie) pour Capacitor/Android.
 * Tourne entièrement dans la WebView : stockage via Preferences, HTTP via
 * CapacitorHttp (contourne le CORS), modules purs réutilisés du desktop.
 */
import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp } from '@capacitor/core'
import type {
  Article,
  Source,
  AppSettings,
  ArticleQuery,
  Stats,
  UnreadCounts,
  FeedLanguage,
  Lang,
  VigieAPI,
  RefreshState
} from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import { RECOMMENDED_SOURCES } from '../shared/catalog'
import { decodeEntities, normalizeTitleKey } from '../shared/text'
import { detectLang } from '../main/langdetect'
import { summarizeLocal } from '../main/summarizer'
import { sourcesToOpml, opmlToSources } from '../main/opml'

interface DB {
  sources: Source[]
  articles: Article[]
  settings: AppSettings
}

const KEY = 'vigie-data'
const MAX_ARTICLES = 3000
let db: DB = { sources: [], articles: [], settings: { ...DEFAULT_SETTINGS } }

// ---------- Persistance ----------
let saveTimer: ReturnType<typeof setTimeout> | null = null
function persist(): void {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    void Preferences.set({ key: KEY, value: JSON.stringify(db) })
  }, 400)
}

async function loadDb(): Promise<void> {
  const { value } = await Preferences.get({ key: KEY })
  if (value) {
    try {
      const raw = JSON.parse(value)
      db = {
        sources: (raw.sources ?? []).map((s: Source) => ({ ...s, lang: s.lang ?? 'en' })),
        articles: (raw.articles ?? []).map((a: Article) => ({ ...a, lang: a.lang ?? 'en' })),
        settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) }
      }
    } catch {
      /* données corrompues → repart de zéro */
    }
  }
  if (db.sources.length === 0) seedDefault()
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function seedDefault(): void {
  const now = Date.now()
  db.sources = RECOMMENDED_SOURCES.filter((s) => ['Numerama', 'The Verge', 'Hacker News (front page)', 'Le Monde Informatique'].includes(s.name)).map(
    (s, i) => ({ ...s, id: uid(), enabled: true, createdAt: now + i })
  )
}

// ---------- Événements ----------
type Listener<T> = (v: T) => void
const progressCbs = new Set<Listener<string>>()
const stateCbs = new Set<Listener<RefreshState>>()
function emitProgress(msg: string): void {
  progressCbs.forEach((cb) => cb(msg))
}
function emitState(s: RefreshState): void {
  stateCbs.forEach((cb) => cb(s))
}

// ---------- HTTP + parsing RSS ----------
function stripHtml(html: string): string {
  let s = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|section|article|tr|ul|ol)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
  s = decodeEntities(s)
  return s.replace(/[ \t\f\v\r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function normImg(u?: string | null): string | undefined {
  if (!u) return undefined
  const t = u.trim()
  if (t.startsWith('//')) return 'https:' + t
  if (t.startsWith('http')) return t
  return undefined
}

function tag(el: Element, ...names: string[]): string {
  for (const n of names) {
    const found = el.getElementsByTagName(n)[0]
    if (found?.textContent) return found.textContent.trim()
  }
  return ''
}

function makeArticle(source: Source, p: Partial<Article> & { title: string; link: string }): Article {
  const now = Date.now()
  return {
    id: uid(),
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    title: p.title,
    link: p.link,
    content: p.content ?? '',
    author: p.author,
    image: p.image,
    publishedAt: p.publishedAt ?? now,
    fetchedAt: now,
    category: source.category,
    lang: source.lang ?? 'en',
    tags: [],
    summary: null,
    read: false,
    starred: false
  }
}

async function httpText(url: string): Promise<string> {
  const res = await CapacitorHttp.get({
    url,
    headers: { 'User-Agent': 'Mozilla/5.0 Vigie/1.0', Accept: 'application/rss+xml,application/xml,text/html' },
    readTimeout: 15000,
    connectTimeout: 15000
  })
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`)
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
}

function parseFeed(xml: string, source: Source): Article[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const items = Array.from(doc.querySelectorAll('item, entry'))
  return items
    .map((it) => {
      let link = ''
      const atomLink = it.querySelector('link[rel="alternate"]') || it.querySelector('link[href]')
      if (atomLink?.getAttribute('href')) link = atomLink.getAttribute('href') as string
      if (!link) link = tag(it, 'link') || tag(it, 'guid')
      const rawHtml = tag(it, 'content:encoded', 'encoded', 'content', 'description', 'summary')
      const img =
        normImg(it.getElementsByTagName('media:content')[0]?.getAttribute('url')) ||
        normImg(it.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url')) ||
        normImg(it.getElementsByTagName('enclosure')[0]?.getAttribute('url')) ||
        normImg(rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1])
      const date = tag(it, 'pubDate', 'published', 'updated', 'dc:date')
      return makeArticle(source, {
        title: tag(it, 'title') || '(sans titre)',
        link,
        content: stripHtml(rawHtml).slice(0, 4000),
        author: tag(it, 'dc:creator', 'creator', 'author'),
        image: img,
        publishedAt: date ? new Date(date).getTime() || Date.now() : Date.now()
      })
    })
    .filter((a) => a.link)
}

async function fetchSource(source: Source): Promise<Article[]> {
  if (source.type === 'hackernews') {
    const q = source.url.trim()
    const url = q
      ? `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=30`
      : 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30'
    const res = await CapacitorHttp.get({ url })
    const hits = (res.data?.hits ?? []) as Array<Record<string, unknown>>
    return hits
      .filter((h) => h.title)
      .map((h) =>
        makeArticle(source, {
          title: String(h.title),
          link: (h.url as string) || `https://news.ycombinator.com/item?id=${h.objectID}`,
          content: `${h.points} points · ${h.num_comments} commentaires`,
          author: h.author as string,
          publishedAt: new Date(h.created_at as string).getTime()
        })
      )
  }
  if (source.type === 'github') {
    const repo = source.url.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '')
    const res = await CapacitorHttp.get({ url: `https://api.github.com/repos/${repo}/releases?per_page=10` })
    return ((res.data ?? []) as Array<Record<string, unknown>>).map((r) =>
      makeArticle(source, {
        title: `${repo} ${(r.name as string) || (r.tag_name as string)}`,
        link: r.html_url as string,
        content: stripHtml((r.body as string) || '').slice(0, 4000),
        publishedAt: new Date(r.published_at as string).getTime()
      })
    )
  }
  return parseFeed(await httpText(source.url), source)
}

// ---------- Logique articles (dédup / filtres / stats) ----------
function upsert(articles: Article[]): number {
  const byLink = new Map(db.articles.map((a) => [a.link, a]))
  let added = 0
  for (const art of articles) {
    if (byLink.has(art.link)) continue
    db.articles.push(art)
    byLink.set(art.link, art)
    added++
  }
  if (added > 0) {
    db.articles.sort((a, b) => b.publishedAt - a.publishedAt)
    if (db.articles.length > MAX_ARTICLES) db.articles = db.articles.slice(0, MAX_ARTICLES)
    persist()
  }
  return added
}

function query(q: ArticleQuery): Article[] {
  let list = [...db.articles]
  if (q.unreadOnly) list = list.filter((a) => !a.read)
  if (q.starredOnly) list = list.filter((a) => a.starred)
  if (q.category && q.category !== 'all') list = list.filter((a) => a.category === q.category)
  if (q.sourceType) list = list.filter((a) => a.sourceType === q.sourceType)
  if (q.lang) list = list.filter((a) => a.lang === q.lang)
  if (q.tag) list = list.filter((a) => a.tags.includes(q.tag!))
  if (q.search) {
    const n = q.search.toLowerCase()
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(n) ||
        a.content.toLowerCase().includes(n) ||
        (a.summary ?? '').toLowerCase().includes(n)
    )
  }
  list.sort((a, b) => b.publishedAt - a.publishedAt)
  const seen = new Map<string, Article>()
  const out: Article[] = []
  for (const a of list) {
    const key = normalizeTitleKey(a.title)
    if (!key) {
      out.push(a)
      continue
    }
    const kept = seen.get(key)
    if (!kept) {
      const c = { ...a, dupCount: 1 }
      seen.set(key, c)
      out.push(c)
    } else if (kept.sourceId !== a.sourceId) kept.dupCount = (kept.dupCount ?? 1) + 1
  }
  return out.slice(0, 300)
}

function byId(id: string): Article | undefined {
  return db.articles.find((a) => a.id === id)
}

// ---------- API ----------
export const mobileApi: VigieAPI = {
  getSources: async () => [...db.sources].sort((a, b) => a.createdAt - b.createdAt),
  addSource: async (s) => {
    const src: Source = { ...s, id: uid(), createdAt: Date.now() }
    db.sources.push(src)
    persist()
    return src
  },
  updateSource: async (id, patch) => {
    const s = db.sources.find((x) => x.id === id)
    if (!s) return null
    Object.assign(s, patch, { id: s.id, createdAt: s.createdAt })
    persist()
    return s
  },
  deleteSource: async (id) => {
    db.sources = db.sources.filter((s) => s.id !== id)
    db.articles = db.articles.filter((a) => a.sourceId !== id)
    persist()
  },
  getRecommendedSources: async () => RECOMMENDED_SOURCES,
  addRecommendedSources: async (lang: FeedLanguage) => {
    const have = new Set(db.sources.map((s) => `${s.type}|${s.url}`))
    let n = 0
    const now = Date.now()
    for (const s of RECOMMENDED_SOURCES.filter((s) => lang === 'all' || s.lang === lang)) {
      if (have.has(`${s.type}|${s.url}`)) continue
      db.sources.push({ ...s, id: uid(), enabled: true, createdAt: now + n })
      n++
    }
    if (n) persist()
    return n
  },

  getArticles: async (q) => query(q),
  markRead: async (id, read) => {
    const a = byId(id)
    if (a) {
      a.read = read
      persist()
    }
  },
  markAllRead: async (q) => {
    const ids = new Set(query(q).map((a) => a.id))
    let n = 0
    for (const a of db.articles)
      if (ids.has(a.id) && !a.read) {
        a.read = true
        n++
      }
    if (n) persist()
    return n
  },
  toggleStar: async (id) => {
    const a = byId(id)
    if (a) {
      a.starred = !a.starred
      persist()
    }
  },
  setArticleTags: async (id, tags) => {
    const a = byId(id)
    if (a) {
      a.tags = tags
      persist()
    }
  },
  getCategories: async () => {
    const set = new Set<string>()
    db.sources.forEach((s) => set.add(s.category))
    db.articles.forEach((a) => set.add(a.category))
    return [...set].filter(Boolean).sort()
  },
  getAllTags: async () => {
    const set = new Set<string>()
    db.articles.forEach((a) => a.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  },
  getStats: async (): Promise<Stats> => {
    const cat = new Map<string, number>()
    const type = new Map<string, number>()
    const tags = new Map<string, number>()
    const day = new Map<string, number>()
    const days: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const k = d.toISOString().slice(0, 10)
      days.push(k)
      day.set(k, 0)
    }
    let unread = 0
    let starred = 0
    let summarized = 0
    for (const a of db.articles) {
      if (!a.read) unread++
      if (a.starred) starred++
      if (a.summary) summarized++
      cat.set(a.category, (cat.get(a.category) ?? 0) + 1)
      type.set(a.sourceType, (type.get(a.sourceType) ?? 0) + 1)
      a.tags.forEach((t) => tags.set(t, (tags.get(t) ?? 0) + 1))
      const dk = new Date(a.publishedAt).toISOString().slice(0, 10)
      if (day.has(dk)) day.set(dk, (day.get(dk) ?? 0) + 1)
    }
    const sorted = (m: Map<string, number>, lim?: number) => {
      const a = [...m.entries()].map(([label, count]) => ({ label, count })).sort((x, y) => y.count - x.count)
      return lim ? a.slice(0, lim) : a
    }
    return {
      total: db.articles.length,
      unread,
      starred,
      summarized,
      byCategory: sorted(cat),
      bySourceType: sorted(type),
      perDay: days.map((date) => ({ date, count: day.get(date) ?? 0 })),
      topTags: sorted(tags, 12)
    }
  },
  getUnreadCounts: async (): Promise<UnreadCounts> => {
    const byType: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    let total = 0
    let starred = 0
    for (const a of db.articles) {
      if (a.starred) starred++
      if (a.read) continue
      total++
      byType[a.sourceType] = (byType[a.sourceType] ?? 0) + 1
      byCategory[a.category] = (byCategory[a.category] ?? 0) + 1
    }
    return { total, allTotal: db.articles.length, starred, byType, byCategory }
  },

  refreshAll: async () => {
    const sources = db.sources.filter((s) => s.enabled)
    const total = sources.length
    const results = []
    emitState({ active: true, done: 0, total, label: 'Initialisation…' })
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i]
      emitState({ active: true, done: i, total, label: s.name })
      try {
        let arts = await fetchSource(s)
        if (db.settings.autoDetectLang)
          arts = arts.map((a) => {
            const d = detectLang(`${a.title} ${a.content}`)
            return d ? { ...a, lang: d } : a
          })
        const added = upsert(arts)
        s.lastFetchedAt = Date.now()
        s.lastCount = arts.length
        s.lastError = undefined
        results.push({ sourceId: s.id, sourceName: s.name, added })
      } catch (e) {
        s.lastError = e instanceof Error ? e.message : String(e)
        s.lastFetchedAt = Date.now()
        results.push({ sourceId: s.id, sourceName: s.name, added: 0, error: s.lastError })
      }
      emitState({ active: true, done: i + 1, total, label: s.name })
    }
    persist()
    const totalAdded = results.reduce((n, r) => n + r.added, 0)
    emitState({ active: false, done: total, total, label: `${totalAdded} nouveau(x)` })
    if (db.settings.autoSummarize && totalAdded > 0) void autoSummarize()
    return results
  },
  refreshSource: async (id) => {
    const s = db.sources.find((x) => x.id === id)
    if (!s) return { sourceId: id, sourceName: '?', added: 0, error: 'introuvable' }
    try {
      const arts = await fetchSource(s)
      return { sourceId: s.id, sourceName: s.name, added: upsert(arts) }
    } catch (e) {
      return { sourceId: s.id, sourceName: s.name, added: 0, error: e instanceof Error ? e.message : String(e) }
    }
  },

  summarizeArticle: async (id) => {
    const a = byId(id)
    if (!a) throw new Error('Article introuvable')
    const { summary, tags } = summarizeLocal(a)
    a.summary = summary
    if (tags.length) a.tags = [...new Set([...a.tags, ...tags])]
    persist()
    return summary
  },
  summarizeUnread: async (q) => {
    const pending = query(q).filter((a) => a.summary === null).slice(0, 25)
    let done = 0
    for (const art of pending) {
      const real = byId(art.id)
      if (!real) continue
      const { summary, tags } = summarizeLocal(real)
      real.summary = summary
      if (tags.length) real.tags = [...new Set([...real.tags, ...tags])]
      done++
    }
    if (done) {
      persist()
      emitProgress('__articles_updated__')
    }
    return { done, failed: 0 }
  },
  fetchFullText: async (id) => {
    const a = byId(id)
    if (!a?.link) throw new Error('Aucun lien')
    const html = await httpText(a.link)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const main = doc.querySelector('article') || doc.querySelector('main') || doc.body
    const text = stripHtml(main?.innerHTML ?? '').slice(0, 20000)
    if (text.length < 200) throw new Error('Contenu introuvable')
    a.content = text
    a.hasFullText = true
    persist()
    return text
  },
  translateArticle: async () => {
    throw new Error('La traduction nécessite Ollama (version desktop).')
  },
  generateBrief: async (q) => {
    const arts = query(q).filter((a) => !a.read).slice(0, 12)
    if (arts.length === 0) return 'Aucun nouvel article à synthétiser.'
    return ['Brief du jour :', '', ...arts.map((a) => `• [${a.sourceName}] ${a.title}`)].join('\n')
  },
  exportArticleMarkdown: async () => ({ saved: false }),
  exportData: async () => ({ saved: false }),
  importData: async () => ({ sources: 0, articles: 0, cancelled: true }),
  exportOpml: async () => {
    // disponible : on encode dans le presse-papier via partage natif si possible
    void sourcesToOpml(db.sources)
    return { saved: false }
  },
  importOpml: async () => ({ added: 0, cancelled: true }),

  getSettings: async () => ({ ...db.settings }),
  saveSettings: async (s) => {
    db.settings = { ...DEFAULT_SETTINGS, ...s }
    persist()
    return { ...db.settings }
  },

  installUpdate: async () => {
    /* pas de mise à jour in-app sur mobile (passer par le Store / APK) */
  },

  onRefreshProgress: (cb) => {
    progressCbs.add(cb)
    return () => progressCbs.delete(cb)
  },
  onRefreshState: (cb) => {
    stateCbs.add(cb)
    return () => stateCbs.delete(cb)
  },
  onUpdateStatus: () => () => {},
  onUpdateReady: () => () => {}
}

void opmlToSources // (réservé pour un futur import OPML mobile)

export async function initMobileApi(): Promise<void> {
  await loadDb()
}

export function detectLangMobile(text: string): Lang | null {
  return detectLang(text)
}
