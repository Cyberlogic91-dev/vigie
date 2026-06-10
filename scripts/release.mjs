// Publie une Release GitHub (installeur signé + latest.yml pour l'auto-update).
// Le jeton GitHub est lu dans le gestionnaire d'identifiants Git de la machine
// (celui utilisé par `git push`) — rien à saisir, aucun secret dans le dépôt.
import { execSync, spawnSync } from 'child_process'

function getGitHubToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    })
    const m = out.match(/^password=(.+)$/m)
    return m ? m[1].trim() : ''
  } catch {
    return ''
  }
}

const token = getGitHubToken()
if (!token) {
  console.error(
    '❌ Aucun jeton GitHub trouvé. Connectez-vous une fois avec `git push` (Git Credential Manager), ' +
      'ou définissez la variable d’environnement GH_TOKEN.'
  )
  process.exit(1)
}

console.log('• Jeton GitHub récupéré depuis le gestionnaire d’identifiants.')
console.log('• Build + publication de la Release…')

const steps = [
  ['node', ['scripts/gen-icons.mjs']],
  ['npx', ['electron-vite', 'build']],
  ['npx', ['electron-builder', '--win', '--publish', 'always']]
]
for (const [cmd, args] of steps) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, GH_TOKEN: token }
  })
  if (res.status !== 0) {
    console.error(`❌ Échec de : ${cmd} ${args.join(' ')}`)
    process.exit(res.status ?? 1)
  }
}
console.log('✅ Release publiée — les installations existantes se mettront à jour automatiquement.')
