import type { Source, SourceType, Lang } from '../shared/types'

/** Génère un fichier OPML à partir des sources. */
export function sourcesToOpml(sources: Source[]): string {
  const escape = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const outlines = sources
    .map((s) => {
      // On encode le type Vigie dans un attribut dédié pour un ré-import fidèle
      const xmlUrl = s.type === 'rss' || s.type === 'reddit' || s.type === 'mastodon' ? s.url : ''
      return (
        `    <outline text="${escape(s.name)}" title="${escape(s.name)}" ` +
        `type="${s.type}" cyType="${s.type}" cyUrl="${escape(s.url)}" ` +
        `category="${escape(s.category)}" cyLang="${s.lang}" language="${s.lang}"${xmlUrl ? ` xmlUrl="${escape(xmlUrl)}"` : ''} />`
      )
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Vigie — sources de veille</title>
  </head>
  <body>
${outlines}
  </body>
</opml>
`
}

/** Extrait les attributs d'une balise <outline .../>. */
function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /(\w+)\s*=\s*"([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tag)) !== null) {
    attrs[m[1]] = m[2]
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  }
  return attrs
}

const VALID_TYPES: SourceType[] = ['rss', 'github', 'hackernews', 'reddit', 'mastodon']

/** Analyse un OPML et retourne des sources prêtes à insérer. */
export function opmlToSources(xml: string): Omit<Source, 'id' | 'createdAt'>[] {
  const outlines = xml.match(/<outline\b[^>]*\/?>/g) ?? []
  const result: Omit<Source, 'id' | 'createdAt'>[] = []

  for (const tag of outlines) {
    const a = parseAttrs(tag)
    const xmlUrl = a.xmlUrl || a.url
    // Type : priorité à l'attribut Vigie, sinon flux générique
    let type: SourceType = 'rss'
    if (a.cyType && VALID_TYPES.includes(a.cyType as SourceType)) {
      type = a.cyType as SourceType
    } else if (xmlUrl?.includes('reddit.com')) {
      type = 'reddit'
    }

    const url = a.cyUrl || xmlUrl || ''
    const name = a.title || a.text || url
    if (!name) continue
    // Un outline sans flux et non typé (simple conteneur) est ignoré
    if (type === 'rss' && !url) continue

    // Langue : attribut Vigie, sinon `language` OPML, sinon défaut anglais
    const langRaw = (a.cyLang || a.language || '').toLowerCase().slice(0, 2)
    const lang: Lang = (['fr', 'en', 'es', 'de', 'it', 'pt'] as const).includes(langRaw as Lang)
      ? (langRaw as Lang)
      : 'en'

    result.push({
      type,
      name,
      url,
      category: a.category || 'Importé',
      lang,
      enabled: true
    })
  }
  return result
}
