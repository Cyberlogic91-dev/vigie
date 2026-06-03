// Décodage des entités HTML (nommées + numériques) — partagé main/renderer.

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', sbquo: '‚', bdquo: '„',
  hellip: '…', mdash: '—', ndash: '–', minus: '−',
  laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  agrave: 'à', acirc: 'â', auml: 'ä', aacute: 'á',
  ugrave: 'ù', ucirc: 'û', uuml: 'ü', uacute: 'ú',
  icirc: 'î', iuml: 'ï', iacute: 'í', igrave: 'ì',
  ocirc: 'ô', ouml: 'ö', oacute: 'ó', ograve: 'ò', otilde: 'õ',
  ccedil: 'ç', ntilde: 'ñ', oelig: 'œ', aelig: 'æ', szlig: 'ß',
  deg: '°', euro: '€', pound: '£', cent: '¢', copy: '©', reg: '®',
  trade: '™', middot: '·', bull: '•', times: '×', divide: '÷',
  frac12: '½', frac14: '¼', frac34: '¾', shy: '', zwnj: '', zwj: ''
}

/** Décode les entités HTML d'une chaîne (ex: &rsquo; → ’, &#8217; → ’, &#x2026; → …). */
export function decodeEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input
  return input.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (m, ent: string) => {
    if (ent[0] === '#') {
      const code = ent[1] === 'x' || ent[1] === 'X' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10)
      if (Number.isFinite(code) && code > 0) {
        try {
          return String.fromCodePoint(code)
        } catch {
          return m
        }
      }
      return m
    }
    const key = ent.toLowerCase()
    return Object.prototype.hasOwnProperty.call(NAMED, key) ? NAMED[key] : m
  })
}

/** Découpe un texte en paragraphes (sur les sauts de ligne), nettoyés. */
export function toParagraphs(text: string): string[] {
  return decodeEntities(text)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}
