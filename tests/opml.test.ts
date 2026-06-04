import { describe, it, expect } from 'vitest'
import { sourcesToOpml, opmlToSources } from '../src/main/opml'
import type { Source } from '../src/shared/types'

function src(partial: Partial<Source>): Source {
  return {
    id: '1', type: 'rss', name: 'X', url: 'https://x/feed', category: 'Tech',
    lang: 'fr', enabled: true, createdAt: 0, ...partial
  }
}

describe('OPML round-trip', () => {
  it('préserve type, url, catégorie et langue', () => {
    const sources = [
      src({ name: 'Numerama', url: 'https://www.numerama.com/feed/', lang: 'fr' }),
      src({ name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', lang: 'en' }),
      src({ type: 'github', name: 'react', url: 'facebook/react', lang: 'en', category: 'Dev' }),
      src({ type: 'hackernews', name: 'HN', url: 'AI', lang: 'en' })
    ]
    const back = opmlToSources(sourcesToOpml(sources))
    expect(back).toHaveLength(4)
    expect(back[0]).toMatchObject({ type: 'rss', url: 'https://www.numerama.com/feed/', lang: 'fr' })
    expect(back[1].lang).toBe('en')
    expect(back[2]).toMatchObject({ type: 'github', url: 'facebook/react' })
    expect(back[3].type).toBe('hackernews')
  })

  it('échappe correctement les caractères spéciaux des noms', () => {
    const xml = sourcesToOpml([src({ name: 'A & B « test »' })])
    expect(xml).toContain('&amp;')
    const back = opmlToSources(xml)
    expect(back[0].name).toContain('&')
  })
})
