import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Article, Source, AppSettings, ArticleQuery, Stats, RecommendedSource, FeedLanguage } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

// Catalogue de sources recommandées, par langue
export const RECOMMENDED_SOURCES: RecommendedSource[] = [
  // Français
  { type: 'rss', name: 'Numerama', url: 'https://www.numerama.com/feed/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Le Monde Informatique', url: 'https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Korben', url: 'https://korben.info/feed', category: 'Dev', lang: 'fr' },
  { type: 'rss', name: 'LinuxFr', url: 'https://linuxfr.org/news.atom', category: 'Dev', lang: 'fr' },
  { type: 'rss', name: '01net', url: 'https://www.01net.com/actualites/feed/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Génération-NT', url: 'https://www.generation-nt.com/export/rss.xml', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Clubic', url: 'https://www.clubic.com/feed/rss', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Frandroid', url: 'https://www.frandroid.com/feed', category: 'Mobile', lang: 'fr' },
  { type: 'rss', name: 'Les Numériques', url: 'https://www.lesnumeriques.com/rss.xml', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Developpez.com', url: 'https://www.developpez.com/index/rss', category: 'Dev', lang: 'fr' },
  { type: 'rss', name: 'ZDNet France', url: 'https://www.zdnet.fr/feeds/rss/actualites/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Journal du Geek', url: 'https://www.journaldugeek.com/feed/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Presse-citron', url: 'https://www.presse-citron.net/feed/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Next', url: 'https://next.ink/feed/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Silicon.fr', url: 'https://www.silicon.fr/feed', category: 'Dev', lang: 'fr' },
  { type: 'rss', name: "Tom's Hardware FR", url: 'https://www.tomshardware.fr/feed/', category: 'Tech', lang: 'fr' },
  { type: 'rss', name: 'Phonandroid', url: 'https://www.phonandroid.com/feed', category: 'Mobile', lang: 'fr' },
  { type: 'rss', name: 'Siècle Digital', url: 'https://siecledigital.fr/feed/', category: 'Tech', lang: 'fr' },
  { type: 'reddit', name: 'r/france (tech)', url: 'https://www.reddit.com/r/france/.rss', category: 'Général', lang: 'fr' },
  // Anglais
  { type: 'hackernews', name: 'Hacker News (front page)', url: '', category: 'Général', lang: 'en' },
  { type: 'rss', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'TechRadar', url: 'https://www.techradar.com/rss', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'The Register', url: 'https://www.theregister.com/headlines.atom', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'Tech', lang: 'en' },
  { type: 'rss', name: 'Slashdot', url: 'https://rss.slashdot.org/Slashdot/slashdotMain', category: 'Général', lang: 'en' },
  { type: 'reddit', name: 'r/technology', url: 'https://www.reddit.com/r/technology/.rss', category: 'Général', lang: 'en' },
  { type: 'reddit', name: 'r/programming', url: 'https://www.reddit.com/r/programming/.rss', category: 'Dev', lang: 'en' },
  // Développement (anglais)
  { type: 'rss', name: 'GitHub Blog', url: 'https://github.blog/feed/', category: 'Dev', lang: 'en' },
  { type: 'rss', name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/', category: 'Dev', lang: 'en' },
  { type: 'rss', name: 'Dev.to', url: 'https://dev.to/feed', category: 'Dev', lang: 'en' },
  { type: 'rss', name: 'InfoQ', url: 'https://feed.infoq.com/', category: 'Dev', lang: 'en' },
  { type: 'rss', name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', category: 'Dev', lang: 'en' },
  { type: 'rss', name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', category: 'Dev', lang: 'en' },
  { type: 'reddit', name: 'r/webdev', url: 'https://www.reddit.com/r/webdev/.rss', category: 'Dev', lang: 'en' },
  { type: 'reddit', name: 'r/selfhosted', url: 'https://www.reddit.com/r/selfhosted/.rss', category: 'Dev', lang: 'en' },
  // Sécurité (anglais)
  { type: 'rss', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', category: 'Sécurité', lang: 'en' },
  { type: 'rss', name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', category: 'Sécurité', lang: 'en' },
  { type: 'rss', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', category: 'Sécurité', lang: 'en' },
  { type: 'rss', name: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom/', category: 'Sécurité', lang: 'en' },
  { type: 'reddit', name: 'r/netsec', url: 'https://www.reddit.com/r/netsec/.rss', category: 'Sécurité', lang: 'en' },
  // IA (anglais)
  { type: 'rss', name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'IA', lang: 'en' },
  { type: 'reddit', name: 'r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', category: 'IA', lang: 'en' },
  // Espagnol
  { type: 'rss', name: 'Xataka', url: 'https://www.xataka.com/index.xml', category: 'Tech', lang: 'es' },
  { type: 'rss', name: 'Genbeta', url: 'https://www.genbeta.com/index.xml', category: 'Dev', lang: 'es' },
  { type: 'rss', name: 'Hipertextual', url: 'https://hipertextual.com/feed', category: 'Tech', lang: 'es' },
  { type: 'rss', name: 'MuyComputer', url: 'https://www.muycomputer.com/feed/', category: 'Tech', lang: 'es' },
  { type: 'rss', name: 'ADSLZone', url: 'https://www.adslzone.net/feed/', category: 'Tech', lang: 'es' },
  { type: 'rss', name: 'Xataka Android', url: 'https://www.xatakandroid.com/index.xml', category: 'Mobile', lang: 'es' },
  { type: 'rss', name: 'FayerWayer', url: 'https://www.fayerwayer.com/feed/', category: 'Tech', lang: 'es' },
  // Allemand
  { type: 'rss', name: 'heise online', url: 'https://www.heise.de/rss/heise-atom.xml', category: 'Tech', lang: 'de' },
  { type: 'rss', name: 'Golem.de', url: 'https://rss.golem.de/rss.php?feed=RSS2.0', category: 'Tech', lang: 'de' },
  { type: 'rss', name: 't3n', url: 'https://t3n.de/rss.xml', category: 'Tech', lang: 'de' },
  { type: 'rss', name: 'ComputerBase', url: 'https://www.computerbase.de/rss/news.xml', category: 'Tech', lang: 'de' },
  { type: 'rss', name: 'Caschys Blog', url: 'https://stadt-bremerhaven.de/feed/', category: 'Tech', lang: 'de' },
  { type: 'rss', name: 'netzpolitik.org', url: 'https://netzpolitik.org/feed/', category: 'Général', lang: 'de' },
  { type: 'rss', name: 'WinFuture', url: 'https://static.winfuture.de/feeds/WinFuture-News-rss2.0.xml', category: 'Tech', lang: 'de' },
  // Italien
  { type: 'rss', name: 'Punto Informatico', url: 'https://www.punto-informatico.it/feed/', category: 'Tech', lang: 'it' },
  { type: 'rss', name: 'HTML.it', url: 'https://www.html.it/feed/', category: 'Dev', lang: 'it' },
  { type: 'rss', name: 'DDay.it', url: 'https://www.dday.it/rss', category: 'Tech', lang: 'it' },
  { type: 'rss', name: 'TuttoAndroid', url: 'https://www.tuttoandroid.net/feed/', category: 'Mobile', lang: 'it' },
  { type: 'rss', name: 'Wired Italia', url: 'https://www.wired.it/feed/rss', category: 'Tech', lang: 'it' },
  { type: 'rss', name: 'HDblog', url: 'https://www.hdblog.it/feed/', category: 'Mobile', lang: 'it' },
  // Portugais
  { type: 'rss', name: 'Tecnoblog', url: 'https://tecnoblog.net/feed/', category: 'Tech', lang: 'pt' },
  { type: 'rss', name: 'Olhar Digital', url: 'https://olhardigital.com.br/feed/', category: 'Tech', lang: 'pt' },
  { type: 'rss', name: 'Canaltech', url: 'https://canaltech.com.br/rss/', category: 'Tech', lang: 'pt' },
  { type: 'rss', name: 'Pplware', url: 'https://pplware.sapo.pt/feed/', category: 'Tech', lang: 'pt' }
]

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

function persist(): void {
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
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
  return list.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 500)
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

export function getUnreadCounts(): { total: number; byType: Record<string, number>; byCategory: Record<string, number> } {
  const byType: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  let total = 0
  for (const a of db.articles) {
    if (a.read) continue
    total++
    byType[a.sourceType] = (byType[a.sourceType] ?? 0) + 1
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1
  }
  return { total, byType, byCategory }
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
