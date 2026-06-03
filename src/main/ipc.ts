import { ipcMain, BrowserWindow, Notification, dialog } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import * as store from './store'
import { fetchSource } from './fetchers'
import { summarize, translate, generateBrief } from './ai'
import { sourcesToOpml, opmlToSources } from './opml'
import { extractFullText } from './fulltext'
import { detectLang } from './langdetect'
import type { Article, FetchResult, Source, ArticleQuery, AppSettings, Lang } from '../shared/types'

function broadcast(channel: string, ...args: unknown[]): void {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(channel, ...args))
}

async function refreshOneSource(source: Source): Promise<FetchResult> {
  try {
    broadcast('refresh:progress', `Récupération : ${source.name}…`)
    let articles = await fetchSource(source)
    // Détection automatique de la langue par article (sources multilingues)
    if (store.getSettings().autoDetectLang) {
      articles = articles.map((a) => {
        const detected = detectLang(`${a.title} ${a.content}`)
        return detected ? { ...a, lang: detected } : a
      })
    }
    const added = store.upsertArticles(articles)
    store.recordSourceHealth(source.id, articles.length)
    return { sourceId: source.id, sourceName: source.name, added }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    store.recordSourceHealth(source.id, 0, message)
    return { sourceId: source.id, sourceName: source.name, added: 0, error: message }
  }
}

/** Récupère toutes les sources actives, gère résumés auto et notifications. */
export async function refreshAllSources(): Promise<FetchResult[]> {
  const sources = store.getSources().filter((s) => s.enabled)
  const results: FetchResult[] = []
  for (const source of sources) {
    results.push(await refreshOneSource(source))
  }

  const totalAdded = results.reduce((n, r) => n + r.added, 0)

  const settings = store.getSettings()
  if (settings.notificationsEnabled && totalAdded > 0 && Notification.isSupported()) {
    new Notification({
      title: 'Vigie — veille',
      body: `${totalAdded} nouvel${totalAdded > 1 ? 'aux' : ''} article${totalAdded > 1 ? 's' : ''} récupéré${totalAdded > 1 ? 's' : ''}.`
    }).show()
  }

  // Résumés automatiques (en arrière-plan, sans bloquer le retour)
  if (settings.autoSummarize && totalAdded > 0) {
    void autoSummarizeRecent(settings)
  }

  broadcast('refresh:progress', `Terminé : ${totalAdded} nouveau(x) article(s).`)
  return results
}

async function autoSummarizeRecent(settings: AppSettings): Promise<void> {
  const pending = store
    .queryArticles({})
    .filter((a) => a.summary === null)
    .slice(0, 15)
  for (const art of pending) {
    try {
      const { summary, tags } = await summarize(art, settings)
      store.setArticleSummary(art.id, summary)
      if (tags.length) {
        const existing = store.getArticleById(art.id)
        store.setArticleTags(art.id, [...new Set([...(existing?.tags ?? []), ...tags])])
      }
      broadcast('refresh:progress', `Résumé généré : ${art.title.slice(0, 40)}…`)
    } catch (err) {
      console.error('[ai] échec résumé auto:', err)
      break // probablement clé invalide / quota : on arrête
    }
  }
  broadcast('articles:updated')
}

export function registerIpc(onSettingsChanged?: () => void): void {
  // Sources
  ipcMain.handle('sources:get', () => store.getSources())
  ipcMain.handle('sources:add', (_e, s: Omit<Source, 'id' | 'createdAt'>) => store.addSource(s))
  ipcMain.handle('sources:update', (_e, id: string, patch: Partial<Source>) => store.updateSource(id, patch))
  ipcMain.handle('sources:delete', (_e, id: string) => store.deleteSource(id))
  ipcMain.handle('sources:recommended', () => store.RECOMMENDED_SOURCES)
  ipcMain.handle('sources:addRecommended', (_e, lang: 'fr' | 'en' | 'all') => store.addRecommendedSources(lang))

  // Articles
  ipcMain.handle('articles:get', (_e, q: ArticleQuery) => store.queryArticles(q))
  ipcMain.handle('articles:markRead', (_e, id: string, read: boolean) => store.markRead(id, read))
  ipcMain.handle('articles:markAllRead', (_e, q: ArticleQuery) => store.markAllRead(q))
  ipcMain.handle('articles:toggleStar', (_e, id: string) => store.toggleStar(id))
  ipcMain.handle('articles:setTags', (_e, id: string, tags: string[]) => store.setArticleTags(id, tags))
  ipcMain.handle('articles:categories', () => store.getCategories())
  ipcMain.handle('articles:tags', () => store.getAllTags())
  ipcMain.handle('articles:stats', () => store.getStats())
  ipcMain.handle('articles:unreadCounts', () => store.getUnreadCounts())

  // Récupération
  ipcMain.handle('refresh:all', () => refreshAllSources())
  ipcMain.handle('refresh:source', (_e, id: string) => {
    const src = store.getSources().find((s) => s.id === id)
    if (!src) return { sourceId: id, sourceName: '?', added: 0, error: 'Source introuvable' } as FetchResult
    return refreshOneSource(src)
  })

  // IA
  ipcMain.handle('ai:summarize', async (_e, id: string): Promise<string> => {
    const art = store.getArticleById(id)
    if (!art) throw new Error('Article introuvable')
    const settings = store.getSettings()
    const { summary, tags } = await summarize(art, settings)
    store.setArticleSummary(id, summary)
    if (tags.length) {
      store.setArticleTags(id, [...new Set([...art.tags, ...tags])])
    }
    return summary
  })

  ipcMain.handle('ai:summarizeUnread', async (_e, q: ArticleQuery): Promise<{ done: number; failed: number }> => {
    const settings = store.getSettings()
    const pending = store
      .queryArticles({ ...q })
      .filter((a) => a.summary === null)
      .slice(0, 25)
    let done = 0
    let failed = 0
    for (const art of pending) {
      try {
        const { summary, tags } = await summarize(art, settings)
        store.setArticleSummary(art.id, summary)
        if (tags.length) {
          const fresh = store.getArticleById(art.id)
          store.setArticleTags(art.id, [...new Set([...(fresh?.tags ?? []), ...tags])])
        }
        done++
        broadcast('refresh:progress', `Résumé ${done}/${pending.length}…`)
      } catch (err) {
        failed++
        console.error('[ai] échec résumé groupé:', err)
        break // clé/quota probablement en cause
      }
    }
    broadcast('articles:updated')
    return { done, failed }
  })

  ipcMain.handle('ai:translate', async (_e, id: string, target: Lang): Promise<string> => {
    const art = store.getArticleById(id)
    if (!art) throw new Error('Article introuvable')
    return translate(art, store.getSettings(), target)
  })

  ipcMain.handle('ai:brief', async (_e, q: ArticleQuery): Promise<string> => {
    // Brief à partir des articles récents (non lus en priorité) du filtre courant
    const recent = store.queryArticles({ ...q }).slice(0, 30)
    const pick = recent.filter((a) => !a.read)
    return generateBrief(pick.length ? pick : recent, store.getSettings())
  })

  // Export d'un article en Markdown
  ipcMain.handle('article:exportMarkdown', async (_e, id: string): Promise<{ saved: boolean; path?: string }> => {
    const art = store.getArticleById(id)
    if (!art) throw new Error('Article introuvable')
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const safe = art.title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 60).trim() || 'article'
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exporter l’article (Markdown)',
      defaultPath: `${safe}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (canceled || !filePath) return { saved: false }
    const date = new Date(art.publishedAt).toLocaleString('fr-FR')
    const md = [
      `# ${art.title}`,
      '',
      `> Source : ${art.sourceName} · ${date}${art.author ? ` · ${art.author}` : ''}`,
      `> Lien : ${art.link}`,
      '',
      art.summary ? `## Résumé\n\n${art.summary}\n` : '',
      `## Contenu\n`,
      art.content || '(aucun contenu)',
      '',
      art.tags.length ? `---\nTags : ${art.tags.join(', ')}` : ''
    ].join('\n')
    writeFileSync(filePath, md, 'utf-8')
    return { saved: true, path: filePath }
  })

  // Import / export OPML
  ipcMain.handle('opml:export', async (): Promise<{ saved: boolean; path?: string }> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exporter les sources (OPML)',
      defaultPath: 'vigie-sources.opml',
      filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }]
    })
    if (canceled || !filePath) return { saved: false }
    writeFileSync(filePath, sourcesToOpml(store.getSources()), 'utf-8')
    return { saved: true, path: filePath }
  })

  ipcMain.handle('opml:import', async (): Promise<{ added: number; cancelled?: boolean }> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Importer des sources (OPML)',
      properties: ['openFile'],
      filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }]
    })
    if (canceled || filePaths.length === 0) return { added: 0, cancelled: true }
    const xml = readFileSync(filePaths[0], 'utf-8')
    const added = store.addSources(opmlToSources(xml))
    return { added }
  })

  // Texte complet (Readability)
  ipcMain.handle('article:fulltext', async (_e, id: string): Promise<string> => {
    const art = store.getArticleById(id)
    if (!art) throw new Error('Article introuvable')
    if (!art.link) throw new Error('Aucun lien disponible pour cet article')
    const { text } = await extractFullText(art.link)
    store.setArticleContent(id, text)
    return text
  })

  // Sauvegarde / restauration des données
  ipcMain.handle('data:export', async (): Promise<{ saved: boolean; path?: string }> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Sauvegarder les données Vigie',
      defaultPath: 'vigie-sauvegarde.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { saved: false }
    writeFileSync(filePath, JSON.stringify(store.exportAll(), null, 2), 'utf-8')
    return { saved: true, path: filePath }
  })

  ipcMain.handle('data:import', async (): Promise<{ sources: number; articles: number; cancelled?: boolean }> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Restaurer une sauvegarde Vigie',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || filePaths.length === 0) return { sources: 0, articles: 0, cancelled: true }
    const data = JSON.parse(readFileSync(filePaths[0], 'utf-8'))
    const result = store.importAll(data)
    onSettingsChanged?.() // les réglages restaurés peuvent changer les timers
    broadcast('articles:updated')
    return result
  })

  // Réglages
  ipcMain.handle('settings:get', () => store.getSettings())
  ipcMain.handle('settings:save', (_e, s: AppSettings) => {
    const saved = store.saveSettings(s)
    onSettingsChanged?.()
    return saved
  })
}
