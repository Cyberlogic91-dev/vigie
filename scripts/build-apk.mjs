// Build de l'APK Android : bundle web mobile → Capacitor sync → Gradle assembleDebug.
// Nécessite : Android SDK + un JDK 17 (Capacitor 6 cible Java 17).
import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs'

const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } })

// Détecte un JDK 17 (Capacitor 6 ne compile pas avec un JDK trop récent)
const jdk17 = ['C:/Program Files/Java/jdk-17', process.env.JAVA_HOME].find(
  (p) => p && existsSync(`${p}/bin/javac.exe`)
)

console.log('• Build du bundle web mobile…')
run('npx vite build --config vite.mobile.config.ts')
copyFileSync('mobile/www/mobile-index.html', 'mobile/www/index.html')

console.log('• Synchronisation Capacitor…')
run('npx cap sync android')

console.log('• Compilation de l’APK (Gradle)…')
const gw = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
run(`cd android && ${gw} assembleDebug --no-daemon`, jdk17 ? { JAVA_HOME: jdk17 } : {})

const src = 'android/app/build/outputs/apk/debug/app-debug.apk'
const version = JSON.parse(readFileSync('package.json', 'utf-8')).version
if (!existsSync('release')) mkdirSync('release')
const out = `release/Vigie-${version}-android.apk`
copyFileSync(src, out)
console.log(`✅ APK généré : ${out}`)
