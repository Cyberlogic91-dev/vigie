import Parser from 'rss-parser'
import type { Article, Source } from '../shared/types'
import { decodeEntities } from '../shared/text'

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Vigie/0.1 (veille technologique)' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['itunes:image', 'itunesImage']
    ]
  }
})

/** Normalise une URL d'image (protocole-relatif → https). */
function normalizeImg(url: string | undefined): string | undefined {
  if (!url) return undefined
  const u = url.trim()
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  return undefined
}

/** Extrait l'image principale d'un item RSS (Media RSS, enclosure, ou première <img>). */
function extractImage(item: Record<string, any>, html: string): string | undefined {
  // media:content (peut être un tableau)
  const mc = item.mediaContent as Array<{ $?: { url?: string; medium?: string; type?: string } }> | undefined
  if (mc) {
    for (const m of Array.isArray(mc) ? mc : [mc]) {
      const url = m?.$?.url
      const isImg =
        m?.$?.medium === 'image' ||
        (m?.$?.type ?? '').startsWith('image') ||
        /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url ?? '')
      if (url && isImg) return normalizeImg(url)
    }
  }
  // media:thumbnail
  const mt = item.mediaThumbnail as { $?: { url?: string } } | undefined
  if (mt?.$?.url) return normalizeImg(mt.$.url)
  // enclosure image
  const enc = item.enclosure as { url?: string; type?: string } | undefined
  if (enc?.url && (enc.type ?? '').startsWith('image')) return normalizeImg(enc.url)
  // itunes:image
  const it = item.itunesImage as { $?: { href?: string } } | string | undefined
  if (typeof it === 'string') return normalizeImg(it)
  if (it?.$?.href) return normalizeImg(it.$.href)
  // première <img> du contenu HTML
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? normalizeImg(m[1]) : undefined
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function makeArticle(source: Source, partial: Partial<Article> & { title: string; link: string }): Article {
  const now = Date.now()
  return {
    id: uid(),
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    title: partial.title,
    link: partial.link,
    content: partial.content ?? '',
    author: partial.author,
    image: partial.image,
    publishedAt: partial.publishedAt ?? now,
    fetchedAt: now,
    category: source.category,
    lang: source.lang ?? 'en',
    tags: [],
    summary: null,
    read: false,
    starred: false
  }
}

function stripHtml(html: string): string {
  let s = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    // Limites de blocs → sauts de ligne (pour conserver les paragraphes)
    .replace(/<\/(p|div|li|h[1-6]|blockquote|section|article|tr|ul|ol)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
  s = decodeEntities(s)
  // Normalise les espaces tout en gardant les sauts de ligne
  return s
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------- RSS / Atom / Reddit / Mastodon (tous des flux) ----------

async function fetchFeed(source: Source): Promise<Article[]> {
  const feed = await parser.parseURL(source.url)
  return (feed.items ?? []).map((raw) => {
    const item = raw as Record<string, any>
    const rawHtml = String(item['content:encoded'] || item.content || item.summary || '')
    const body = item['content:encoded'] || item.content || item.contentSnippet || item.summary || ''
    const published = item.isoDate || item.pubDate
    return makeArticle(source, {
      title: typeof item.title === 'string' ? item.title.trim() : '(sans titre)',
      link: item.link || item.guid || '',
      content: stripHtml(String(body)).slice(0, 4000),
      author: item.creator || item.author,
      image: extractImage(item, rawHtml),
      publishedAt: published ? new Date(published).getTime() : Date.now()
    })
  }).filter((a) => a.link)
}

// ---------- GitHub releases ----------

async function fetchGithub(source: Source): Promise<Article[]> {
  // url attendue: "owner/repo"
  const repo = source.url.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '')
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Vigie/0.1'
    },
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} pour ${repo}`)
  }
  const releases = (await res.json()) as Array<{
    html_url: string
    name: string | null
    tag_name: string
    body: string | null
    published_at: string
    author?: { login: string }
  }>
  return releases.map((r) =>
    makeArticle(source, {
      title: `${repo} ${r.name || r.tag_name}`,
      link: r.html_url,
      content: stripHtml(r.body || '').slice(0, 4000),
      author: r.author?.login,
      publishedAt: new Date(r.published_at).getTime()
    })
  )
}

// ---------- Hacker News (via Algolia Search API) ----------

async function fetchHackerNews(source: Source): Promise<Article[]> {
  const query = source.url.trim()
  const endpoint = query
    ? `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=30`
    : `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30`
  const res = await fetch(endpoint, { headers: { 'User-Agent': 'Vigie/0.1' }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Hacker News API ${res.status}`)
  const data = (await res.json()) as {
    hits: Array<{
      objectID: string
      title: string | null
      url: string | null
      author: string
      points: number
      num_comments: number
      created_at: string
      story_text?: string | null
    }>
  }
  return data.hits
    .filter((h) => h.title)
    .map((h) => {
      const hnLink = `https://news.ycombinator.com/item?id=${h.objectID}`
      return makeArticle(source, {
        title: h.title!,
        link: h.url || hnLink,
        content: stripHtml(
          `${h.story_text || ''} (${h.points} points, ${h.num_comments} commentaires) — discussion: ${hnLink}`
        ).slice(0, 2000),
        author: h.author,
        publishedAt: new Date(h.created_at).getTime()
      })
    })
}

export async function fetchSource(source: Source): Promise<Article[]> {
  switch (source.type) {
    case 'github':
      return fetchGithub(source)
    case 'hackernews':
      return fetchHackerNews(source)
    case 'rss':
    case 'reddit':
    case 'mastodon':
      return fetchFeed(source)
    default:
      throw new Error(`Type de source inconnu : ${source.type}`)
  }
}
