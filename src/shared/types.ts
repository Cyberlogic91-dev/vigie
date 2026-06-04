// Types partagés entre le processus principal (Electron) et l'interface (React)

export type SourceType = 'rss' | 'github' | 'hackernews' | 'reddit' | 'mastodon'

/** Langue d'une source/d'un article */
export type Lang = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt'
/** Préférence de langue du flux ('all' = pas de filtre) */
export type FeedLanguage = Lang | 'all'

/** Liste ordonnée des langues, avec libellé et drapeau (pour l'UI) */
export const LANGS: { code: Lang; label: string; flag: string; aiName: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', aiName: 'français' },
  { code: 'en', label: 'Anglais', flag: '🇬🇧', aiName: 'English' },
  { code: 'es', label: 'Espagnol', flag: '🇪🇸', aiName: 'español' },
  { code: 'de', label: 'Allemand', flag: '🇩🇪', aiName: 'Deutsch' },
  { code: 'it', label: 'Italien', flag: '🇮🇹', aiName: 'italiano' },
  { code: 'pt', label: 'Portugais', flag: '🇵🇹', aiName: 'português' }
]

export interface Source {
  id: string
  type: SourceType
  /** Libellé affiché */
  name: string
  /**
   * URL ou identifiant de la source.
   * - rss/reddit/mastodon : URL du flux
   * - github : "owner/repo" pour les releases
   * - hackernews : terme de recherche (vide = front page)
   */
  url: string
  /** Catégorie par défaut appliquée aux articles de cette source */
  category: string
  /** Langue de la source (sert au filtre de langue du flux) */
  lang: Lang
  enabled: boolean
  createdAt: number
  /** Santé : dernière récupération, dernière erreur, nb d'articles ramenés */
  lastFetchedAt?: number
  lastError?: string
  lastCount?: number
}

export interface Article {
  id: string
  sourceId: string
  sourceName: string
  sourceType: SourceType
  title: string
  link: string
  /** Contenu/extrait brut récupéré */
  content: string
  author?: string
  /** URL de l'image principale (vignette) si disponible */
  image?: string
  publishedAt: number
  fetchedAt: number
  category: string
  /** Langue de l'article (héritée de la source) */
  lang: Lang
  tags: string[]
  /** Résumé généré par IA (null tant que non généré) */
  summary: string | null
  read: boolean
  starred: boolean
  /** Vrai si le texte intégral a été récupéré (Readability) */
  hasFullText?: boolean
}

/** Fournisseur d'IA pour les résumés (aucun ne nécessite de clé/API payante) */
export type AiProvider = 'local' | 'ollama'

export interface AppSettings {
  /** 'local' = résumé extractif intégré (hors-ligne) ; 'ollama' = modèle local via Ollama */
  aiProvider: AiProvider
  /** URL du serveur Ollama (par défaut http://localhost:11434) */
  ollamaUrl: string
  /** Nom du modèle Ollama (ex: llama3.2, qwen2.5) */
  ollamaModel: string
  /** Génération automatique des résumés à la récupération */
  autoSummarize: boolean
  /** Intervalle d'actualisation automatique en minutes (0 = désactivé) */
  refreshIntervalMin: number
  /** Notifications système pour les nouveaux articles */
  notificationsEnabled: boolean
  /** Heure du digest quotidien au format "HH:mm" (vide = désactivé) */
  digestTime: string
  theme: 'light' | 'dark'
  /** Disposition des cartes d'articles */
  cardLayout: 'compact' | 'magazine'
  /** Apparence : échelle de police (1 = 100 %) et couleur d'accent ('' = défaut) */
  fontScale: number
  accentColor: string
  /** Mots-clés (séparés par des virgules) : masquer / mettre en avant */
  muteKeywords: string
  highlightKeywords: string
  /** Réduire dans la zone de notification au lieu de quitter */
  closeToTray: boolean
  /** Onboarding effectué (premier lancement) */
  onboarded: boolean
  /** Dernière version lancée (détection des mises à jour) */
  lastVersion: string
  /** Langue du flux affiché et des résumés IA */
  feedLanguage: FeedLanguage
  /** Détecter automatiquement la langue de chaque article (sources multilingues) */
  autoDetectLang: boolean
}

export interface FetchResult {
  sourceId: string
  sourceName: string
  added: number
  error?: string
}

export interface StatBucket {
  label: string
  count: number
}

export interface Stats {
  total: number
  unread: number
  starred: number
  summarized: number
  byCategory: StatBucket[]
  bySourceType: StatBucket[]
  perDay: { date: string; count: number }[]
  topTags: StatBucket[]
}

export interface ArticleQuery {
  search?: string
  category?: string
  sourceType?: SourceType
  unreadOnly?: boolean
  starredOnly?: boolean
  tag?: string
  /** Filtre par langue (absent = toutes) */
  lang?: Lang
}

export const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'local',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  autoSummarize: false,
  refreshIntervalMin: 60,
  notificationsEnabled: true,
  digestTime: '',
  theme: 'dark',
  cardLayout: 'magazine',
  fontScale: 1,
  accentColor: '',
  muteKeywords: '',
  highlightKeywords: '',
  closeToTray: false,
  onboarded: false,
  lastVersion: '',
  feedLanguage: 'all',
  autoDetectLang: true
}

/** Une source proposée dans le catalogue de sources recommandées */
export interface RecommendedSource {
  type: SourceType
  name: string
  url: string
  category: string
  lang: Lang
}

/** Compteurs d'articles non lus (barre latérale) */
export interface UnreadCounts {
  total: number
  byType: Record<string, number>
  byCategory: Record<string, number>
}

// Canaux IPC exposés via le preload
export interface VigieAPI {
  // Sources
  getSources: () => Promise<Source[]>
  addSource: (source: Omit<Source, 'id' | 'createdAt'>) => Promise<Source>
  updateSource: (id: string, patch: Partial<Source>) => Promise<Source | null>
  deleteSource: (id: string) => Promise<void>
  getRecommendedSources: () => Promise<RecommendedSource[]>
  addRecommendedSources: (lang: FeedLanguage) => Promise<number>

  // Articles
  getArticles: (query: ArticleQuery) => Promise<Article[]>
  markRead: (id: string, read: boolean) => Promise<void>
  markAllRead: (query: ArticleQuery) => Promise<number>
  toggleStar: (id: string) => Promise<void>
  setArticleTags: (id: string, tags: string[]) => Promise<void>
  getCategories: () => Promise<string[]>
  getAllTags: () => Promise<string[]>
  getStats: () => Promise<Stats>
  getUnreadCounts: () => Promise<UnreadCounts>

  // Récupération & IA
  refreshAll: () => Promise<FetchResult[]>
  refreshSource: (id: string) => Promise<FetchResult>
  summarizeArticle: (id: string) => Promise<string>
  summarizeUnread: (query: ArticleQuery) => Promise<{ done: number; failed: number }>
  fetchFullText: (id: string) => Promise<string>
  translateArticle: (id: string, target: Lang) => Promise<string>
  generateBrief: (query: ArticleQuery) => Promise<string>
  exportArticleMarkdown: (id: string) => Promise<{ saved: boolean; path?: string }>

  // Sauvegarde / restauration
  exportData: () => Promise<{ saved: boolean; path?: string }>
  importData: () => Promise<{ sources: number; articles: number; cancelled?: boolean }>

  // Import / export OPML
  exportOpml: () => Promise<{ saved: boolean; path?: string }>
  importOpml: () => Promise<{ added: number; cancelled?: boolean }>

  // Réglages
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<AppSettings>

  // Événements (main -> renderer)
  onRefreshProgress: (cb: (msg: string) => void) => () => void
}
