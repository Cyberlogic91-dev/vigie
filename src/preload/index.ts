import { contextBridge, ipcRenderer } from 'electron'
import type { VigieAPI } from '../shared/types'

const api: VigieAPI = {
  // Sources
  getSources: () => ipcRenderer.invoke('sources:get'),
  addSource: (source) => ipcRenderer.invoke('sources:add', source),
  updateSource: (id, patch) => ipcRenderer.invoke('sources:update', id, patch),
  deleteSource: (id) => ipcRenderer.invoke('sources:delete', id),
  getRecommendedSources: () => ipcRenderer.invoke('sources:recommended'),
  addRecommendedSources: (lang) => ipcRenderer.invoke('sources:addRecommended', lang),

  // Articles
  getArticles: (query) => ipcRenderer.invoke('articles:get', query),
  markRead: (id, read) => ipcRenderer.invoke('articles:markRead', id, read),
  markAllRead: (query) => ipcRenderer.invoke('articles:markAllRead', query),
  toggleStar: (id) => ipcRenderer.invoke('articles:toggleStar', id),
  setArticleTags: (id, tags) => ipcRenderer.invoke('articles:setTags', id, tags),
  getCategories: () => ipcRenderer.invoke('articles:categories'),
  getAllTags: () => ipcRenderer.invoke('articles:tags'),
  getStats: () => ipcRenderer.invoke('articles:stats'),
  getUnreadCounts: () => ipcRenderer.invoke('articles:unreadCounts'),

  // Récupération & IA
  refreshAll: () => ipcRenderer.invoke('refresh:all'),
  refreshSource: (id) => ipcRenderer.invoke('refresh:source', id),
  summarizeArticle: (id) => ipcRenderer.invoke('ai:summarize', id),
  summarizeUnread: (query) => ipcRenderer.invoke('ai:summarizeUnread', query),
  fetchFullText: (id) => ipcRenderer.invoke('article:fulltext', id),
  translateArticle: (id, target) => ipcRenderer.invoke('ai:translate', id, target),
  generateBrief: (query) => ipcRenderer.invoke('ai:brief', query),
  exportArticleMarkdown: (id) => ipcRenderer.invoke('article:exportMarkdown', id),

  // Import / export OPML
  exportOpml: () => ipcRenderer.invoke('opml:export'),
  importOpml: () => ipcRenderer.invoke('opml:import'),

  // Sauvegarde / restauration
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),

  // Réglages
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Événements
  onRefreshProgress: (cb) => {
    const handler = (_e: unknown, msg: string): void => cb(msg)
    ipcRenderer.on('refresh:progress', handler)
    const updated = (): void => cb('__articles_updated__')
    ipcRenderer.on('articles:updated', updated)
    return () => {
      ipcRenderer.removeListener('refresh:progress', handler)
      ipcRenderer.removeListener('articles:updated', updated)
    }
  },
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (cb) => {
    const handler = (_e: unknown, msg: string): void => cb(msg)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
  onUpdateReady: (cb) => {
    const handler = (_e: unknown, v: string): void => cb(v)
    ipcRenderer.on('update:ready', handler)
    return () => ipcRenderer.removeListener('update:ready', handler)
  }
}

contextBridge.exposeInMainWorld('vigie', api)
