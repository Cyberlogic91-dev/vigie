// Génère build/icon.png (512px) et build/icon.ico depuis build/icon.svg
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'))

// PNG principal 512px (utilisé par electron-builder pour les autres plateformes)
await sharp(svg, { density: 384 }).resize(512, 512).png().toFile(join(root, 'build', 'icon.png'))

// ICO multi-tailles pour Windows
const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer())
)
const ico = await pngToIco(pngBuffers)
writeFileSync(join(root, 'build', 'icon.ico'), ico)

console.log('Icônes générées : build/icon.png (512px), build/icon.ico (' + sizes.join(', ') + ')')
