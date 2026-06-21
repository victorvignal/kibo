import { BrowserWindow, app } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import log from 'electron-log/main'

let initialized = false

/**
 * Inicializa o auto-updater escutando eventos do electron-updater
 * e retransmitindo para o renderer via webContents.send.
 *
 * Só roda fora de dev (production build).
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  if (initialized) return
  initialized = true

  // Logs do updater vão pra electron-log, que já cria arquivo em userData/logs/
  autoUpdater.logger = log
  log.transports.file.level = 'info'

  autoUpdater.autoDownload = true          // baixa assim que detecta versão nova
  autoUpdater.autoInstallOnAppQuit = true // instala na próxima saída do app

  // Em Windows: evita abrir o NSIS installer com privilégios de admin sem necessidade
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update:status', { state: 'checking' })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:status', { state: 'up-to-date' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    mainWindow.webContents.send('update:status', {
      state: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow.webContents.send('update:status', {
      state: 'downloading',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    mainWindow.webContents.send('update:status', {
      state: 'downloaded',
      version: info.version
    })
  })

  autoUpdater.on('error', (err: Error) => {
    mainWindow.webContents.send('update:status', {
      state: 'error',
      message: err.message || String(err)
    })
  })

  // Checagem automática ao iniciar (só em produção)
  if (!app.isPackaged) {
    log.info('[updater] skipping auto-check in dev mode')
    return
  }

  // Espera a janela ficar pronta e dispara a checagem
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[updater] initial check failed', err)
    })
  }, 3_000)

  // Checagem periódica a cada 6h (caso o app fique aberto muito tempo)
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[updater] periodic check failed', err)
    })
  }, 6 * 60 * 60 * 1000)
}

/** Dispara checagem manual (chamado pelo botão "Verificar atualizações"). */
export async function checkForUpdates(): Promise<{ currentVersion: string }> {
  if (!app.isPackaged) {
    throw new Error('Updates só funcionam em build de produção')
  }
  await autoUpdater.checkForUpdates()
  return { currentVersion: app.getVersion() }
}

/** Sai do app e instala a atualização baixada. */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
