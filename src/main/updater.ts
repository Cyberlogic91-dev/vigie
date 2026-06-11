import { app, BrowserWindow, Notification, ipcMain } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

let updateReady = false

export interface UpdateCheckResult {
  state: 'available' | 'downloading' | 'uptodate' | 'dev' | 'error'
  current: string
  version?: string
  message?: string
}

/**
 * Mise à jour automatique via GitHub Releases.
 * - Vérifie au démarrage puis toutes les 6 h.
 * - Télécharge en arrière-plan, puis propose « Redémarrer pour installer ».
 * - Silencieux en développement, hors-ligne, ou si aucune Release n'est publiée.
 * - Expose aussi un check manuel (`update:check`) déclenchable depuis les Réglages.
 */
export function initAutoUpdate(getWindow: () => BrowserWindow | null): void {
  // La version courante et le check manuel restent disponibles même en dev
  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('update:install', () => {
    if (updateReady) autoUpdater.quitAndInstall()
  })

  ipcMain.handle('update:check', async (): Promise<UpdateCheckResult> => {
    const current = app.getVersion()
    if (!app.isPackaged) return { state: 'dev', current }
    if (updateReady) return { state: 'available', current }
    try {
      const res = await autoUpdater.checkForUpdates()
      if (res?.isUpdateAvailable) {
        return { state: 'downloading', current, version: res.updateInfo?.version }
      }
      return { state: 'uptodate', current }
    } catch (e) {
      return { state: 'error', current, message: e instanceof Error ? e.message : String(e) }
    }
  })

  // L'auto-update (vérif. périodique + téléchargement) ne fonctionne qu'en version installée
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const notify = (msg: string): void => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send('update:status', msg)
  }

  autoUpdater.on('update-available', (info) => notify(`Mise à jour disponible (v${info.version})…`))
  autoUpdater.on('download-progress', (p) => notify(`Téléchargement de la mise à jour : ${Math.round(p.percent)} %`))
  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send('update:ready', info.version)
    if (Notification.isSupported()) {
      new Notification({
        title: 'Vigie — mise à jour prête',
        body: `La version v${info.version} est prête. Redémarrez pour l'installer.`
      }).show()
    }
  })
  // En cas d'erreur (hors-ligne, pas de Release…), on échoue silencieusement
  autoUpdater.on('error', (err) => console.warn('[updater]', err?.message || err))

  const check = (): void => {
    autoUpdater.checkForUpdates().catch((e) => console.warn('[updater] check:', e?.message || e))
  }
  check()
  setInterval(check, 6 * 60 * 60 * 1000)
}
