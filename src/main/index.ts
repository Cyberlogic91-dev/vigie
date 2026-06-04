import { app, shell, BrowserWindow, Notification, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { initStore, getSettings, saveSettings } from './store'
import { registerIpc, refreshAllSources } from './ipc'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let refreshTimer: NodeJS.Timeout | null = null
let digestTimer: NodeJS.Timeout | null = null
let isQuitting = false

/** Ouvre une URL dans le navigateur système uniquement si c'est du http(s). */
function openExternalSafe(url: string): void {
  try {
    const u = new URL(url)
    if (u.protocol === 'http:' || u.protocol === 'https:') void shell.openExternal(url)
  } catch {
    /* URL invalide → ignorée */
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Vigie',
    icon: join(__dirname, '../../build/icon.png'),
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Réduire dans la zone de notification au lieu de quitter (si activé)
  mainWindow.on('close', (e) => {
    if (!isQuitting && getSettings().closeToTray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // Ouvre les liens externes dans le navigateur système (http/https uniquement)
  mainWindow.webContents.setWindowOpenHandler((details) => {
    openExternalSafe(details.url)
    return { action: 'deny' }
  })

  // Bloque toute navigation de la fenêtre privilégiée hors de l'app
  // (un lien sans target ouvrirait sinon une page distante dans la fenêtre).
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl && url.startsWith(devUrl)) return // HMR en développement
    e.preventDefault()
    openExternalSafe(url)
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showWindow(): void {
  if (!mainWindow) createWindow()
  else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, '../../build/icon.png')).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Vigie — veille technologique')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Ouvrir Vigie', click: showWindow },
      { label: 'Actualiser maintenant', click: () => void refreshAllSources() },
      { type: 'separator' },
      {
        label: 'Quitter',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
  tray.on('click', showWindow)
}

/** (Re)programme l'actualisation automatique selon les réglages. */
export function scheduleRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  const { refreshIntervalMin } = getSettings()
  if (refreshIntervalMin && refreshIntervalMin > 0) {
    refreshTimer = setInterval(
      () => {
        void refreshAllSources()
      },
      refreshIntervalMin * 60 * 1000
    )
  }
}

/** Programme le digest quotidien à l'heure HH:mm définie. */
export function scheduleDigest(): void {
  if (digestTimer) clearTimeout(digestTimer)
  digestTimer = null
  const { digestTime } = getSettings()
  if (!digestTime || !/^\d{1,2}:\d{2}$/.test(digestTime)) return

  const [h, m] = digestTime.split(':').map(Number)
  const now = new Date()
  const next = new Date()
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)

  digestTimer = setTimeout(async () => {
    const results = await refreshAllSources()
    const total = results.reduce((n, r) => n + r.added, 0)
    if (Notification.isSupported()) {
      new Notification({
        title: 'Vigie — digest quotidien',
        body: `Votre veille du jour : ${total} nouvel(s) article(s).`
      }).show()
    }
    scheduleDigest() // reprogramme pour le lendemain
  }, next.getTime() - now.getTime())
}

/** Détecte une mise à jour (changement de version) et le signale. */
function handleVersionChange(): void {
  const current = app.getVersion()
  const settings = getSettings()
  const previous = settings.lastVersion
  if (previous !== current) {
    saveSettings({ ...settings, lastVersion: current })
  }
  if (previous && previous !== current) {
    // Mise à jour détectée
    if (Notification.isSupported()) {
      new Notification({ title: 'Vigie mis à jour', body: `Nouvelle version installée : v${current}.` }).show()
    }
    mainWindow?.webContents.once('did-finish-load', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('refresh:progress', `✨ Vigie mis à jour en v${current}`)
      }
    })
  }
}

// Verrou d'instance unique : empêche les doublons (tray + lancement post-installation)
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())

  app.whenReady().then(() => {
    initStore()
    registerIpc(() => {
      scheduleRefresh()
      scheduleDigest()
    })
    createWindow()
    createTray()
    handleVersionChange()
    scheduleRefresh()
    scheduleDigest()

    // Premier rafraîchissement au démarrage
    void refreshAllSources()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  // Si l'option « réduire dans la zone de notification » est active, on reste en arrière-plan
  if (process.platform !== 'darwin' && !getSettings().closeToTray) app.quit()
})
