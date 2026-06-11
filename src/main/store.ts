import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Article, Source, AppSettings, ArticleQuery, Stats, RecommendedSource, FeedLanguage, UnreadCounts } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import { normalizeTitleKey } from '../shared/text'
import { RECOMMENDED_SOURCES } from '../shared/catalog'

export { RECOMMENDED_SOURCES }

interface Database {
  sources: Source[]
  articles: Article[]
  settings: AppSettings
}

const MAX_ARTICLES = 5000

let dataDir = ''
let dbPath = ''
let db: Database = { sources: [], articles: [], settings: { ...DEFAULT_SETTINGS } }

function load(): Database {
  if (!existsSync(dbPath)) {
    return { sources: [], articles: [], settings: { ...DEFAULT_SETTINGS } }
  }
  try {
    const raw = JSON.parse(readFileSync(dbPath, 'utf-8'))
    // Migration : les données antérieures n'ont pas de champ `lang` → défaut 'en'
    const sources: Source[] = (Array.isArray(raw.sources) ? raw.sources : []).map((s: Source) => ({
      ...s,
      lang: s.lang ?? 'en'
    }))
    const articles: Article[] = (Array.isArray(raw.articles) ? raw.articles : []).map((a: Article) => ({
      ...a,
      lang: a.lang ?? 'en'
    }))
    return {
      sources,
      articles,
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) }
    }
  } catch (err) {
    console.error('[store] échec du chargement, réinitialisation:', err)
    return { sources: [], articles: [], settings: { ...DEFAULT_SETTINGS } }
  }
}

// Écriture différée : regroupe les modifications rapprochées en une seule écriture disque.
let saveTimer: NodeJS.Timeout | null = null

function persistNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
}

function persist(): void {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
    } catch (err) {
      console.error('[store] échec de sauvegarde:', err)
    }
  }, 400)
}

/** Force l'écriture immédiate (à appeler avant de quitter l'application). */
export function flushStore(): void {
  if (dbPath) persistNow()
}

export function initStore(): void {
  dataDir = app.getPath('userData')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  dbPath = join(dataDir, 'vigie-data.json')
  db = load()
  // Première exécution : on sème quelques sources par défaut
  if (db.sources.length === 0) {
    seedDefaultSources()
  }
  persist()
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function seedDefaultSources(): void {
  const now = Date.now()
  // Mix par défaut FR + EN ; le réglage « langue du flux » filtre ensuite à l'affichage
  const defaults: Omit<Source, 'id' | 'createdAt'>[] = [
    { type: 'hackernews', name: 'Hacker News (front page)', url: '', category: 'Général', lang: 'en', enabled: true },
    { type: 'rss', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech', lang: 'en', enabled: true },
    { type: 'rss', name: 'Numerama', url: 'https://www.numerama.com/feed/', category: 'Tech', lang: 'fr', enabled: true },
    { type: 'rss', name: 'Le Monde Informatique', url: 'https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml', category: 'Tech', lang: 'fr', enabled: true },
    { type: 'reddit', name: 'r/programming', url: 'https://www.reddit.com/r/programming/.rss', category: 'Dev', lang: 'en', enabled: true }
  ]
  db.sources = defaults.map((s, i) => ({ ...s, id: uid(), createdAt: now + i }))
}

/** Ajoute les sources recommandées pour une langue (dédup). Retourne le nombre ajouté. */
export function addRecommendedSources(lang: FeedLanguage): number {
  const picks = RECOMMENDED_SOURCES.filter((s) => lang === 'all' || s.lang === lang)
  return addSources(picks.map((s) => ({ ...s, enabled: true })))
}

// ---------- Sources ----------

export function getSources(): Source[] {
  return [...db.sources].sort((a, b) => a.createdAt - b.createdAt)
}

export function addSource(input: Omit<Source, 'id' | 'createdAt'>): Source {
  const source: Source = { ...input, id: uid(), createdAt: Date.now() }
  db.sources.push(source)
  persist()
  return source
}

/** Ajoute plusieurs sources en évitant les doublons (même type + même URL). Retourne le nombre ajouté. */
export function addSources(inputs: Omit<Source, 'id' | 'createdAt'>[]): number {
  const existing = new Set(db.sources.map((s) => `${s.type}|${s.url}`))
  let added = 0
  const now = Date.now()
  for (const input of inputs) {
    const key = `${input.type}|${input.url}`
    if (existing.has(key)) continue
    db.sources.push({ ...input, id: uid(), createdAt: now + added })
    existing.add(key)
    added++
  }
  if (added > 0) persist()
  return added
}

export function updateSource(id: string, patch: Partial<Source>): Source | null {
  const src = db.sources.find((s) => s.id === id)
  if (!src) return null
  Object.assign(src, patch, { id: src.id, createdAt: src.createdAt })
  persist()
  return src
}

export function deleteSource(id: string): void {
  db.sources = db.sources.filter((s) => s.id !== id)
  db.articles = db.articles.filter((a) => a.sourceId !== id)
  persist()
}

// ---------- Articles ----------

export function getArticleById(id: string): Article | undefined {
  return db.articles.find((a) => a.id === id)
}

/** Ajoute les articles non encore présents (dédup par lien). Retourne le nombre ajouté. */
export function upsertArticles(articles: Article[]): number {
  const byLink = new Map(db.articles.map((a) => [a.link, a]))
  let added = 0
  let backfilled = false
  for (const art of articles) {
    const existing = byLink.get(art.link)
    if (existing) {
      // Comble une image manquante sur un article déjà stocké
      if (!existing.image && art.image) {
        existing.image = art.image
        backfilled = true
      }
      // Met à niveau l'ancien contenu (entités décodées + paragraphes),
      // sans écraser un texte intégral déjà récupéré
      if (!existing.hasFullText && art.content.includes('\n') && !existing.content.includes('\n')) {
        existing.content = art.content
        backfilled = true
      }
      continue
    }
    db.articles.push(art)
    byLink.set(art.link, art)
    added++
  }
  if (added > 0) {
    // Tronque pour ne pas grossir indéfiniment
    db.articles.sort((a, b) => b.publishedAt - a.publishedAt)
    if (db.articles.length > MAX_ARTICLES) {
      db.articles = db.articles.slice(0, MAX_ARTICLES)
    }
  }
  if (added > 0 || backfilled) persist()
  return added
}

export function queryArticles(q: ArticleQuery): Article[] {
  let list = [...db.articles]
  if (q.unreadOnly) list = list.filter((a) => !a.read)
  if (q.starredOnly) list = list.filter((a) => a.starred)
  if (q.category && q.category !== 'all') list = list.filter((a) => a.category === q.category)
  if (q.sourceType) list = list.filter((a) => a.sourceType === q.sourceType)
  if (q.lang) list = list.filter((a) => a.lang === q.lang)
  if (q.tag) list = list.filter((a) => a.tags.includes(q.tag!))
  if (q.search) {
    const needle = q.search.toLowerCase()
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.content.toLowerCase().includes(needle) ||
        (a.summary ?? '').toLowerCase().includes(needle)
    )
  }
  list.sort((a, b) => b.publishedAt - a.publishedAt)

  // Déduplication inter-sources : un même sujet (titre normalisé identique) couvert
  // par plusieurs sources n'apparaît qu'une fois, avec un compteur de couverture.
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
      const copy = { ...a, dupCount: 1 }
      seen.set(key, copy)
      out.push(copy)
    } else if (kept.sourceId !== a.sourceId) {
      kept.dupCount = (kept.dupCount ?? 1) + 1
    }
  }
  return out.slice(0, 500)
}

export function markRead(id: string, read: boolean): void {
  const art = db.articles.find((a) => a.id === id)
  if (art) {
    art.read = read
    persist()
  }
}

/** Marque comme lus tous les articles correspondant au filtre courant. Retourne le nombre modifié. */
export function markAllRead(q: ArticleQuery): number {
  const ids = new Set(queryArticles(q).map((a) => a.id))
  let n = 0
  for (const art of db.articles) {
    if (ids.has(art.id) && !art.read) {
      art.read = true
      n++
    }
  }
  if (n > 0) persist()
  return n
}

export function toggleStar(id: string): void {
  const art = db.articles.find((a) => a.id === id)
  if (art) {
    art.starred = !art.starred
    persist()
  }
}

export function setArticleTags(id: string, tags: string[]): void {
  const art = db.articles.find((a) => a.id === id)
  if (art) {
    art.tags = tags
    persist()
  }
}

export function setArticleSummary(id: string, summary: string): void {
  const art = db.articles.find((a) => a.id === id)
  if (art) {
    art.summary = summary
    persist()
  }
}

export function setArticleContent(id: string, content: string): void {
  const art = db.articles.find((a) => a.id === id)
  if (art) {
    art.content = content
    art.hasFullText = true
    persist()
  }
}

// ---------- Sauvegarde / restauration ----------

export function exportAll(): Database {
  return { sources: db.sources, articles: db.articles, settings: db.settings }
}

/**
 * Restaure une sauvegarde. Les sources sont fusionnées (dédup type+url),
 * les articles fusionnés (dédup par lien), les réglages remplacés si présents.
 */
export function importAll(data: Partial<Database>): { sources: number; articles: number } {
  let srcAdded = 0
  let artAdded = 0
  if (Array.isArray(data.sources)) {
    srcAdded = addSources(
      data.sources.map((s) => ({
        type: s.type,
        name: s.name,
        url: s.url,
        category: s.category,
        lang: s.lang ?? 'en',
        enabled: s.enabled
      }))
    )
  }
  if (Array.isArray(data.articles)) {
    artAdded = upsertArticles(data.articles.map((a) => ({ ...a, lang: a.lang ?? 'en' })))
  }
  if (data.settings) {
    db.settings = { ...DEFAULT_SETTINGS, ...data.settings }
    persist()
  }
  return { sources: srcAdded, articles: artAdded }
}

export function getStats(): Stats {
  const arts = db.articles
  const cat = new Map<string, number>()
  const type = new Map<string, number>()
  const tags = new Map<string, number>()
  const day = new Map<string, number>()

  // 14 derniers jours, initialisés à 0 pour un graphe continu
  const days: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push(key)
    day.set(key, 0)
  }

  let unread = 0
  let starred = 0
  let summarized = 0
  for (const a of arts) {
    if (!a.read) unread++
    if (a.starred) starred++
    if (a.summary) summarized++
    cat.set(a.category, (cat.get(a.category) ?? 0) + 1)
    type.set(a.sourceType, (type.get(a.sourceType) ?? 0) + 1)
    a.tags.forEach((t) => tags.set(t, (tags.get(t) ?? 0) + 1))
    const dkey = new Date(a.publishedAt).toISOString().slice(0, 10)
    if (day.has(dkey)) day.set(dkey, (day.get(dkey) ?? 0) + 1)
  }

  const toSorted = (m: Map<string, number>, limit?: number): { label: string; count: number }[] => {
    const arr = [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
    return limit ? arr.slice(0, limit) : arr
  }

  return {
    total: arts.length,
    unread,
    starred,
    summarized,
    byCategory: toSorted(cat),
    bySourceType: toSorted(type),
    perDay: days.map((date) => ({ date, count: day.get(date) ?? 0 })),
    topTags: toSorted(tags, 12)
  }
}

export function getUnreadCounts(): UnreadCounts {
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
}

/** Enregistre l'état de santé d'une source après une récupération. */
export function recordSourceHealth(id: string, count: number, error?: string): void {
  const src = db.sources.find((s) => s.id === id)
  if (!src) return
  src.lastFetchedAt = Date.now()
  src.lastCount = count
  src.lastError = error
  persist()
}

export function getCategories(): string[] {
  const set = new Set<string>()
  db.sources.forEach((s) => set.add(s.category))
  db.articles.forEach((a) => set.add(a.category))
  return [...set].filter(Boolean).sort()
}

export function getAllTags(): string[] {
  const set = new Set<string>()
  db.articles.forEach((a) => a.tags.forEach((t) => set.add(t)))
  return [...set].sort()
}

// ---------- Réglages ----------

export function getSettings(): AppSettings {
  return { ...db.settings }
}

export function saveSettings(settings: AppSettings): AppSettings {
  db.settings = { ...DEFAULT_SETTINGS, ...settings }
  persist()
  return { ...db.settings }
}
