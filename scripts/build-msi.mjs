// Génère un MSI propre via electron-wix-msi (gère correctement l'AppUserModelID,
// donc sans l'avertissement 1946 du générateur MSI d'electron-builder).
// Prérequis : binaires WiX 3.14 dans build/wix3 (candle.exe / light.exe).
import { MSICreator } from 'electron-wix-msi'
import { readFileSync, existsSync, renameSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, delimiter } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))

const appDir = join(root, 'release', 'win-unpacked')
const outDir = join(root, 'release')
const wixDir = join(root, 'build', 'wix3')

if (!existsSync(join(appDir, 'Vigie.exe'))) {
  console.error('❌ release/win-unpacked/Vigie.exe introuvable. Lancez d’abord « electron-builder --win --dir ».')
  process.exit(1)
}
if (!existsSync(join(wixDir, 'candle.exe'))) {
  console.error('❌ Binaires WiX 3.14 absents de build/wix3 (candle.exe/light.exe).')
  process.exit(1)
}

// Rend candle.exe / light.exe accessibles à electron-wix-msi
process.env.PATH = wixDir + delimiter + process.env.PATH

const creator = new MSICreator({
  appDirectory: appDir,
  outputDirectory: outDir,
  exe: 'Vigie',
  name: 'Vigie',
  manufacturer: 'Mickael Monestier',
  version: pkg.version,
  description: pkg.description,
  appIconPath: join(root, 'build', 'icon.ico'),
  arch: 'x64',
  shortcutName: 'Vigie',
  ui: { chooseDirectory: true }
})

console.log('• Génération du modèle WiX…')
await creator.create()
console.log('• Compilation du MSI (candle + light)…')
const { msiFile } = await creator.compile()

// electron-wix-msi nomme le fichier d'après `name` → on l'aligne sur la convention du projet
const finalPath = join(outDir, `Vigie-Setup-${pkg.version}.msi`)
if (msiFile && existsSync(msiFile) && msiFile !== finalPath) {
  renameSync(msiFile, finalPath)
}
console.log(`✅ MSI généré : ${finalPath}`)
