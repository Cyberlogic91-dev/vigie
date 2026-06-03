import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

/**
 * Télécharge la page d'un article et en extrait le texte principal lisible
 * via l'algorithme Readability (le même que le mode lecture de Firefox).
 * Utilise linkedom comme DOM léger côté serveur.
 */
export async function extractFullText(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Vigie/0.1 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow'
  })
  if (!res.ok) throw new Error(`Téléchargement échoué (HTTP ${res.status})`)

  const html = await res.text()

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
