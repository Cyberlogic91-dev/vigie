import { describe, it, expect } from 'vitest'
import { summarizeLocal } from '../src/main/summarizer'
import type { Article } from '../src/shared/types'

function article(content: string, title = 'Titre de test'): Article {
  return {
    id: '1', sourceId: 's', sourceName: 'Test', sourceType: 'rss',
    title, link: 'https://example.com', content, publishedAt: 0, fetchedAt: 0,
    category: 'Tech', lang: 'fr', tags: [], summary: null, read: false, starred: false
  }
}

describe('summarizeLocal', () => {
  it('produit un résumé non vide et des tags', () => {
    const content =
      "Une entreprise française a dévoilé un nouveau processeur ARM destiné aux centres de données. " +
      "Ce processeur promet une consommation d'énergie réduite de quarante pour cent. " +
      'Les premiers tests montrent des performances comparables aux meilleures puces du marché. ' +
      'De nombreuses entreprises ont déjà manifesté leur intérêt pour cette technologie.'
    const { summary, tags } = summarizeLocal(article(content))
    expect(summary.length).toBeGreaterThan(20)
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.length).toBeLessThanOrEqual(4)
  })

  it('exclut les résidus d’entités HTML des tags', () => {
    const content = 'rsquo rsquo rsquo '.repeat(20) + 'processeur processeur intelligence artificielle données'
    const { tags } = summarizeLocal(article(content))
    expect(tags).not.toContain('rsquo')
  })

  it('se rabat sur le titre si le contenu est trop court', () => {
    const { summary } = summarizeLocal(article('court', 'Mon titre important'))
    expect(summary.length).toBeGreaterThan(0)
  })
})
