import { describe, it, expect } from 'vitest'
import { decodeEntities, toParagraphs } from '../src/shared/text'

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
