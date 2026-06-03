import type { Article } from '../shared/types'
import { STOPWORDS } from './langdetect'

// Découpe en phrases (gère . ! ? … en évitant de couper trop court)
const SENTENCE_SPLIT = /(?<=[.!?…])\s+(?=[A-ZÀ-Ö0-9«"'(])/

const WORD_RE = /[a-zà-öø-ÿ0-9]+/g

// Résidus de noms d'entités HTML à ne jamais retenir comme tags
const JUNK = new Set(['rsquo', 'lsquo', 'rdquo', 'ldquo', 'hellip', 'nbsp', 'amp', 'quot', 'apos', 'mdash', 'ndash', 'laquo', 'raquo'])

/**
 * Résumé extractif local : aucune IA externe, aucune clé, hors-ligne.
 * Sélectionne les phrases les plus représentatives (fréquence des mots,
 * recoupement avec le titre, position) et en déduit des tags.
 */
export function summarizeLocal(article: Article): { summary: string; tags: string[] } {
  const stop = new Set(STOPWORDS[article.lang] ?? STOPWORDS.en)
  const text = (article.content || '').replace(/\s+/g, ' ').trim()

  // Si le contenu est trop maigre, on se rabat sur le titre
  if (text.length < 120) {
    return { summary: text || article.title, tags: topTerms(article.title, stop, 3) }
  }

  // Fréquence des mots significatifs sur tout le texte
  const freq = new Map<string, number>()
  for (const w of text.toLowerCase().match(WORD_RE) ?? []) {
    if (w.length > 2 && !stop.has(w) && !JUNK.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1)
  }

  const titleWords = new Set(
    (article.title.toLowerCase().match(WORD_RE) ?? []).filter((w) => w.length > 2 && !stop.has(w))
  )

  let sentences = text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter((s) => s.length > 30)
  if (sentences.length === 0) sentences = [text]

  const scored = sentences.map((s, i) => {
    const words = (s.toLowerCase().match(WORD_RE) ?? []).filter((w) => w.length > 2 && !stop.has(w))
    let score = 0
    for (const w of words) {
      score += freq.get(w) ?? 0
      if (titleWords.has(w)) score += 3
    }
    // normalise par longueur (évite de favoriser les phrases interminables)
    score = words.length ? score / Math.sqrt(words.length) : 0
    // léger bonus aux premières phrases (souvent le chapô)
    score *= 1 + ((sentences.length - i) / sentences.length) * 0.25
    return { s, i, score }
  })

  const keep = Math.min(3, Math.max(1, Math.round(sentences.length / 4)))
  const top = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .sort((a, b) => a.i - b.i)

  const summary = top.map((t) => t.s).join(' ').slice(0, 700)
  const tags = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w)
  return { summary, tags }
}

function topTerms(text: string, stop: Set<string>, n: number): string[] {
  const freq = new Map<string, number>()
  for (const w of text.toLowerCase().match(WORD_RE) ?? []) {
    if (w.length > 2 && !stop.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w)
}
