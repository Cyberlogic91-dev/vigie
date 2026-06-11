// Build de l'APK Android SIGNÉ pour distribution.
// Lit la keystore depuis build/keystore.properties (gitignoré).
// Étapes : bundle web → cap sync → assembleRelease → zipalign → apksigner.
import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const run = (cmd, env = {}, cwd) =>
  execSync(cmd, { stdio: 'inherit', shell: true, cwd, env: { ...process.env, ...env } })

const propsPath = 'build/keystore.properties'
if (!existsSync(propsPath)) {
  console.error('❌ build/keystore.properties introuvable (keystore de signature). Voir le README.')
  process.exit(1)
}
const props = Object.fromEntries(
  readFileSync(propsPath, 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => l.split('=').map((x) => x.trim()))
)

const jdk17 = ['C:/Program Files/Java/jdk-17', process.env.JAVA_HOME].find((p) => p && existsSync(`${p}/bin/javac.exe`))
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA || '', 'Android/Sdk')
const btDir = join(sdk, 'build-tools')
const bt = readdirSync(btDir).sort().reverse()[0]
const tool = (name) => join(btDir, bt, process.platform === 'win32' ? `${name}.bat` : name)
const exe = (name) => join(btDir, bt, process.platform === 'win32' ? `${name}.exe` : name)

console.log('• Build du bundle web mobile…')
run('npx vite build --config vite.mobile.config.ts')
copyFileSync('mobile/www/mobile-index.html', 'mobile/www/index.html')
console.log('• Synchronisation Capacitor…')
run('npx cap sync android')

console.log('• Compilation release (Gradle)…')
const gw = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew'
run(`${gw} assembleRelease --no-daemon`, jdk17 ? { JAVA_HOME: jdk17 } : {}, 'android')

const unsigned = 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
const aligned = 'android/app/build/outputs/apk/release/app-release-aligned.apk'
const version = JSON.parse(readFileSync('package.json', 'utf-8')).version
if (!existsSync('release')) mkdirSync('release')
const out = `release/Vigie-${version}-android.apk`

console.log('• zipalign + signature…')
run(`"${exe('zipalign')}" -f 4 "${unsigned}" "${aligned}"`)
run(
  `"${tool('apksigner')}" sign --ks "${props.storeFile}" --ks-key-alias ${props.keyAlias} ` +
    `--ks-pass pass:${props.storePassword} --key-pass pass:${props.keyPassword} --out "${out}" "${aligned}"`
)
run(`"${tool('apksigner')}" verify "${out}"`)
console.log(`✅ APK signé : ${out}`)
