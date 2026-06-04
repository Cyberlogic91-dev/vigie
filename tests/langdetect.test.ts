import { describe, it, expect } from 'vitest'
import { detectLang } from '../src/main/langdetect'

const SAMPLES: Record<string, string> = {
  fr: "Le nouveau processeur est plus rapide et consomme moins d'énergie dans les centres de données pour que les entreprises réduisent leurs coûts",
  en: 'The new processor is faster and consumes less energy in data centers so that companies can reduce their operating costs this year',
  es: 'El nuevo procesador es más rápido y consume menos energía en los centros de datos para que las empresas reduzcan sus costes',
  de: 'Der neue Prozessor ist schneller und verbraucht weniger Energie in den Rechenzentren damit die Unternehmen ihre Kosten senken können',
  it: 'Il nuovo processore è più veloce e consuma meno energia nei centri dati per le aziende che vogliono ridurre i costi operativi',
  pt: 'O novo processador é mais rápido e consome menos energia nos centros de dados para que as empresas reduzam os seus custos'
}

describe('detectLang', () => {
  for (const [lang, text] of Object.entries(SAMPLES)) {
    it(`détecte le ${lang}`, () => {
      expect(detectLang(text)).toBe(lang)
    })
  }
  it('retourne null sur un texte trop court', () => {
    expect(detectLang('ok')).toBeNull()
  })
})
