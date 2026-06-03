import type { Lang } from '../shared/types'

// Mots très fréquents par langue (stopwords). La détection compte les correspondances.
export const STOPWORDS: Record<Lang, string[]> = {
  fr: ['le', 'la', 'les', 'des', 'un', 'une', 'et', 'est', 'dans', 'pour', 'que', 'qui', 'avec', 'sur', 'pas', 'plus', 'au', 'aux', 'du', 'ce', 'cette', 'sont', 'mais', 'ses', 'son', 'nous', 'vous'],
  en: ['the', 'of', 'and', 'to', 'in', 'is', 'for', 'that', 'with', 'on', 'as', 'are', 'be', 'this', 'it', 'from', 'by', 'an', 'at', 'we', 'you', 'has', 'have', 'was', 'will'],
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'es', 'de', 'en', 'para', 'que', 'con', 'por', 'no', 'más', 'del', 'se', 'su', 'lo', 'como', 'pero', 'sus', 'este', 'esta'],
  de: ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'zu', 'den', 'von', 'mit', 'auf', 'für', 'nicht', 'auch', 'im', 'sich', 'des', 'dem', 'wird', 'sind', 'oder', 'aber', 'bei'],
  it: ['il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'e', 'è', 'di', 'che', 'per', 'con', 'non', 'più', 'del', 'al', 'della', 'sono', 'come', 'anche', 'ma', 'nel', 'una'],
  pt: ['o', 'a', 'os', 'as', 'um', 'uma', 'e', 'é', 'de', 'que', 'para', 'com', 'não', 'mais', 'do', 'no', 'na', 'da', 'dos', 'das', 'se', 'como', 'mas', 'por', 'são']
}

// Indices par caractères distinctifs (poids additionnel)
const CHAR_HINTS: { lang: Lang; re: RegExp; weight: number }[] = [
  { lang: 'es', re: /[ñ¿¡]/, weight: 3 },
  { lang: 'de', re: /[äöüß]/, weight: 2 },
  { lang: 'pt', re: /[ãõ]/, weight: 3 },
  { lang: 'fr', re: /[àèùâêîôûëï]/, weight: 1 },
  { lang: 'it', re: /[àèìòù]/, weight: 1 }
]

const LANGS: Lang[] = ['fr', 'en', 'es', 'de', 'it', 'pt']

/**
 * Détecte la langue d'un texte. Retourne null si le texte est trop court
 * ou si aucune langue ne se détache nettement (pour éviter les faux positifs).
 */
export function detectLang(text: string): Lang | null {
  const lower = text.toLowerCase()
  const words = lower.match(/[a-zàâäéèêëîïôöùûüçñãõß]+/g) ?? []
  if (words.length < 8) return null

  const scores: Record<Lang, number> = { fr: 0, en: 0, es: 0, de: 0, it: 0, pt: 0 }
  const sets: Record<Lang, Set<string>> = {} as Record<Lang, Set<string>>
  for (const l of LANGS) sets[l] = new Set(STOPWORDS[l])

  for (const w of words) {
    for (const l of LANGS) if (sets[l].has(w)) scores[l]++
  }
  for (const { lang, re, weight } of CHAR_HINTS) {
    if (re.test(lower)) scores[lang] += weight
  }

  // Classement
  const ranked = LANGS.map((l) => ({ l, s: scores[l] })).sort((a, b) => b.s - a.s)
  const [first, second] = ranked
  // Confiance : assez de signaux et marge suffisante sur le 2e
  if (first.s < 3) return null
  if (first.s - second.s < 2) return null
  return first.l
}
