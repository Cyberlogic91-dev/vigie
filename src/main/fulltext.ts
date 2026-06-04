import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

const MAX_BYTES = 5_000_000 // 5 Mo
const TIMEOUT_MS = 15_000

/** Refuse les schémas non-http(s) et les adresses réseau internes (anti-SSRF). */
export function assertSafeUrl(url: string): void {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw new Error('URL invalide.')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Seules les URL http(s) sont autorisées.')
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const isInternal =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) || // link-local / metadata cloud
    /^fe80:/i.test(host) ||
    /^f[cd][0-9a-f]{2}:/i.test(host) // IPv6 unique-local
  if (isInternal) throw new Error('Adresse réseau interne bloquée.')
}

/**
 * Télécharge la page d'un article et en extrait le texte principal lisible
 * via l'algorithme Readability (le même que le mode lecture de Firefox).
 * Utilise linkedom comme DOM léger côté serveur.
 */
export async function extractFullText(url: string): Promise<{ text: string; title?: string }> {
  assertSafeUrl(url)
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Vigie/0.1 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`Téléchargement échoué (HTTP ${res.status})`)

  const len = Number(res.headers.get('content-length') || 0)
  if (len > MAX_BYTES) throw new Error('Page trop volumineuse.')

  const html = (await res.text()).slice(0, MAX_BYTES)

  const { document } = parseHTML(html)
  // Readability attend un document de type DOM ; linkedom en fournit une implémentation compatible.
  const reader = new Readability(document as unknown as Document)
  const article = reader.parse()

  if (!article || !article.textContent || article.textContent.trim().length < 200) {
    throw new Error('Impossible d’extraire le contenu principal de cette page.')
  }

  const text = article.textContent.replace(/\n{3,}/g, '\n\n').trim()
  return { text: text.slice(0, 20000), title: article.title ?? undefined }
}
