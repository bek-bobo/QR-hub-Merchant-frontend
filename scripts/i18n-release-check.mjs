import { spawnSync } from 'node:child_process'

// Check freshness; never regenerate resources during a release gate.
const commands = [['npm', ['run', 'locales:validate']], ['npm', ['run', 'lint']],
  ['npm', ['run', 'typecheck']], ['npm', ['test']], ['npm', ['run', 'build']], ['git', ['diff', '--check']]]
for (const [command, args] of commands) {
  console.log(`Running ${command} ${args.join(' ')}`)
  const windowsNpm = process.platform === 'win32' && command === 'npm'
  // cmd is required for npm.cmd on Windows. Only the fixed commands above enter
  // this command string; no arguments or environment text supplied by a caller.
  const result = spawnSync(windowsNpm ? 'cmd.exe' : command,
    windowsNpm ? ['/d', '/s', '/c', `npm ${args.join(' ')}`] : args, { stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    console.error(result.error?.message ?? `Release check failed: ${command} (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
}
