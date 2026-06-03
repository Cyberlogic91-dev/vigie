import { app, BrowserWindow, Notification, ipcMain } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

let updateReady = false

/**
 * Initialise la mise à jour automatique via GitHub Releases.
 * - Vérifie au démarrage puis toutes les 6 h.
 * - Télécharge en arrière-plan, puis propose « Redémarrer pour installer ».
 * Silencieux si l'app n'est pas empaquetée ou si le dépôt n'est pas configuré.
 */
export function initAutoUpdate(getWindow: () => BrowserWindow | null): void {
  // L'auto-update ne fonctionne qu'en version installée
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
  // En cas d'erreur (dépôt non configuré, hors-ligne…), on échoue silencieusement
  autoUpdater.on('error', (err) => console.warn('[updater]', err?.message || err))

  // IPC depuis le renderer : installer maintenant
  ipcMain.handle('update:install', () => {
    if (updateReady) {
      autoUpdater.quitAndInstall()
    }
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch((e) => console.warn('[updater] check:', e?.message || e))
  }
  check()
  setInterval(check, 6 * 60 * 60 * 1000)
}
