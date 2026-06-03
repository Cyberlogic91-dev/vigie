import type { Article, AppSettings, Lang } from '../shared/types'
import { LANGS } from '../shared/types'
import { summarizeLocal } from './summarizer'

/**
 * Génère un résumé + des tags pour un article.
 * - 'local'  : résumé extractif intégré (hors-ligne, gratuit, sans clé)
 * - 'ollama' : modèle exécuté localement via Ollama (gratuit, sans clé)
 */
export async function summarize(
  article: Article,
  settings: AppSettings
): Promise<{ summary: string; tags: string[] }> {
  if (settings.aiProvider === 'ollama') {
    return summarizeOllama(article, settings)
  }
  return summarizeLocal(article)
}

async function summarizeOllama(
  article: Article,
  settings: AppSettings
): Promise<{ summary: string; tags: string[] }> {
  const base = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '')
  const model = settings.ollamaModel || 'llama3.2'
  const target = settings.feedLanguage === 'all' ? article.lang : settings.feedLanguage
  const langName = LANGS.find((l) => l.code === target)?.aiName ?? 'français'

  const prompt =
    `Résume l'article suivant en 2 à 3 phrases claires, écrites en ${langName}, pour un public technique. ` +
    `Propose ensuite 2 à 4 tags courts en minuscules. ` +
    `Réponds STRICTEMENT en JSON: {"summary": "...", "tags": ["..."]}.\n\n` +
    `Titre: ${article.title}\n\nContenu:\n${(article.content || article.title).slice(0, 6000)}`

  let res: Response
  try {
    res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' })
    })
  } catch {
    throw new Error(
      `Ollama est injoignable sur ${base}. Démarrez-le (commande « ollama serve ») et installez un modèle (« ollama pull ${model} »), ou choisissez l'IA locale dans les Réglages.`
    )
  }
  if (res.status === 404) {
    throw new Error(`Modèle « ${model} » introuvable dans Ollama. Lancez « ollama pull ${model} ».`)
  }
  if (!res.ok) throw new Error(`Ollama a répondu HTTP ${res.status}.`)

  const data = (await res.json()) as { response?: string }
  const raw = data.response ?? ''
  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw)
    return {
      summary: String(parsed.summary || '').trim(),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t: unknown) => String(t).toLowerCase().trim()).filter(Boolean)
        : []
    }
  } catch {
    return { summary: raw.trim(), tags: [] }
  }
}

/** Appel Ollama renvoyant du texte brut (non JSON). */
async function ollamaText(settings: AppSettings, prompt: string): Promise<string> {
  const base = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '')
  const model = settings.ollamaModel || 'llama3.2'
  let res: Response
  try {
    res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    })
  } catch {
    throw new Error(
      `Ollama est injoignable sur ${base}. Démarrez-le (« ollama serve ») et installez un modèle (« ollama pull ${model} »).`
    )
  }
  if (res.status === 404) throw new Error(`Modèle « ${model} » introuvable. Lancez « ollama pull ${model} ».`)
  if (!res.ok) throw new Error(`Ollama a répondu HTTP ${res.status}.`)
  const data = (await res.json()) as { response?: string }
  return (data.response ?? '').trim()
}

/** Traduit un article vers la langue cible (nécessite Ollama). */
export async function translate(article: Article, settings: AppSettings, target: Lang): Promise<string> {
  const langName = LANGS.find((l) => l.code === target)?.aiName ?? 'français'
  if (settings.aiProvider !== 'ollama') {
    throw new Error("La traduction nécessite le moteur Ollama (Réglages → Moteur de résumé IA).")
  }
  const prompt =
    `Traduis fidèlement le texte suivant en ${langName}. Réponds uniquement avec la traduction, sans commentaire.\n\n` +
    `${article.title}\n\n${(article.content || '').slice(0, 6000)}`
  return ollamaText(settings, prompt)
}

/** Génère un brief de synthèse à partir d'une liste d'articles. */
export async function generateBrief(articles: Article[], settings: AppSettings): Promise<string> {
  if (articles.length === 0) return 'Aucun nouvel article à synthétiser.'
  const target = settings.feedLanguage === 'all' ? 'fr' : settings.feedLanguage
  const langName = LANGS.find((l) => l.code === target)?.aiName ?? 'français'
  const list = articles
    .slice(0, 30)
    .map((a, i) => `${i + 1}. [${a.sourceName}] ${a.title} — ${(a.summary || a.content || '').slice(0, 160)}`)
    .join('\n')

  if (settings.aiProvider === 'ollama') {
    const prompt =
      `Voici les titres et extraits d'articles de veille technologique du jour. ` +
      `Rédige en ${langName} un brief synthétique : dégage les 3 à 5 grands thèmes, ` +
      `avec pour chacun une phrase de synthèse. Sois concis et structuré (puces).\n\n${list}`
    return ollamaText(settings, prompt)
  }

  // Mode local : synthèse extractive simple (regroupement par source + têtes d'affiche)
  const lines: string[] = [`Brief du jour — ${articles.length} article(s) récent(s).`, '']
  for (const a of articles.slice(0, 12)) {
    lines.push(`• [${a.sourceName}] ${a.title}`)
  }
  if (articles.length > 12) lines.push(`… et ${articles.length - 12} autre(s).`)
  lines.push('', 'Astuce : activez Ollama (Réglages) pour un brief synthétique rédigé par IA.')
  return lines.join('\n')
}
