#!/usr/bin/env node
/**
 * Một lần: đảm bảo nhánh FE_BE_DAT, stage thay đổi trong app/ và Shop2026/Shop2026/, commit, push.
 * Dùng: node scripts/git-push-fe-bedat.mjs ["thông điệp commit"]
 */
import { execFileSync } from 'child_process'
import { findGitRoot } from './find-git-root.mjs'

const TARGET = 'FE_BE_DAT'
const msg = process.argv.slice(2).join(' ').trim() || `chore: sync FE_BE_DAT ${new Date().toISOString().slice(0, 19)}`

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts })
}

const repo = findGitRoot()
process.chdir(repo)

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
if (branch !== TARGET) {
  console.error(`[git-push-fe-bedat] Đang ở nhánh "${branch}". Chuyển sang ${TARGET} trước (git checkout ${TARGET}).`)
  process.exit(1)
}

run('git', ['add', '--', 'app', 'Shop2026/Shop2026', 'scripts'])
try {
  run('git', ['diff', '--cached', '--quiet'])
  console.log('[git-push-fe-bedat] Không có thay đổi để commit.')
  process.exit(0)
} catch {
  // có diff staged
}

run('git', ['commit', '-m', msg])
run('git', ['push', 'origin', TARGET])
console.log('[git-push-fe-bedat] Đã push origin', TARGET)
