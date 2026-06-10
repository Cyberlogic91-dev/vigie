import { describe, it, expect } from 'vitest'
import { decodeEntities, toParagraphs, normalizeTitleKey, readingTimeMin } from '../src/shared/text'

describe('decodeEntities', () => {
  it('décode les entités nommées', () => {
    expect(decodeEntities('d&rsquo;autres')).toBe('d’autres')
    expect(decodeEntities('A &amp; B')).toBe('A & B')
    expect(decodeEntities('&laquo; test &raquo;')).toBe('« test »')
  })
  it('décode les entités numériques (décimal et hex)', () => {
    expect(decodeEntities('n&#8217;emploie')).toBe('n’emploie')
    expect(decodeEntities('fin&#x2026;')).toBe('fin…')
  })
  it('laisse le texte sans entité intact', () => {
    expect(decodeEntities('texte normal')).toBe('texte normal')
  })
})

describe('toParagraphs', () => {
  it('découpe sur les sauts de ligne et nettoie', () => {
    expect(toParagraphs('Un\n\nDeux\n  \nTrois')).toEqual(['Un', 'Deux', 'Trois'])
  })
  it('décode les entités dans les paragraphes', () => {
    expect(toParagraphs('l&rsquo;essai')).toEqual(['l’essai'])
  })
})

describe('normalizeTitleKey', () => {
  it('rapproche deux titres identiques malgré accents/ponctuation/casse', () => {
    const a = normalizeTitleKey('Une puce ARM française vise les centres de données !')
    const b = normalizeTitleKey('une puce arm FRANCAISE vise les centres de donnees')
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })
  it('distingue deux titres différents', () => {
    expect(normalizeTitleKey('Une puce ARM française vise les centres de données')).not.toBe(
      normalizeTitleKey('OpenAI annonce un nouveau modèle de génération vidéo')
    )
  })
  it("retourne '' pour un titre trop court (non discriminant)", () => {
    expect(normalizeTitleKey('Brève')).toBe('')
  })
})

describe('readingTimeMin', () => {
  it('estime ~1 min pour un texte court', () => {
    expect(readingTimeMin('quelques mots seulement')).toBe(1)
  })
  it('estime proportionnellement (~440 mots → 2 min)', () => {
    expect(readingTimeMin('mot '.repeat(440))).toBe(2)
  })
})
