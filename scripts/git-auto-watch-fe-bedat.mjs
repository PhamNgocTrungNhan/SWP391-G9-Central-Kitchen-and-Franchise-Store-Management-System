#!/usr/bin/env node
/**
 * Quét định kỳ: nếu đang ở FE_BE_DAT và có ≥ 2 file untracked mới dưới app/ hoặc Shop2026/Shop2026/
 * → git add các file đó → commit → push.
 * Chạy song song với dev: npm run watch:fe-push (từ thư mục app)
 */
import { execFileSync, execSync } from 'child_process'
import { findGitRoot } from './find-git-root.mjs'

const TARGET = 'FE_BE_DAT'
const INTERVAL_MS = 8000
const PREFIXES = ['app/', 'Shop2026/Shop2026/', 'scripts/']

const repo = findGitRoot()
process.chdir(repo)

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts })
}

function listUntrackedScoped() {
  const out = sh('git status --porcelain', { cwd: repo })
  const lines = out.split(/\r?\n/).filter(Boolean)
  const files = []
  for (const line of lines) {
    if (!line.startsWith('?? ')) continue
    let p = line.slice(3).trim()
    if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
      p = p.slice(1, -1)
    }
    const norm = p.replace(/\\/g, '/')
    if (PREFIXES.some((pre) => norm.startsWith(pre))) files.push(norm)
  }
  return [...new Set(files)]
}

function currentBranch() {
  return sh('git branch --show-current', { cwd: repo }).trim()
}

console.log(`[watch-fe-bedat] Repo: ${repo}`)
console.log(`[watch-fe-bedat] Nhánh yêu cầu: ${TARGET} | Chu kỳ ${INTERVAL_MS}ms | Prefix: ${PREFIXES.join(', ')}`)

setInterval(() => {
  try {
    const br = currentBranch()
    if (br !== TARGET) {
      return
    }
    const untracked = listUntrackedScoped()
    if (untracked.length < 2) return

    console.log(`[watch-fe-bedat] Phát hiện ${untracked.length} file mới → commit + push…`)
    execFileSync('git', ['add', '--', ...untracked], { cwd: repo, stdio: 'inherit' })
    const msg = `chore: auto-commit ${untracked.length} new files (watch FE_BE_DAT)`
    execFileSync('git', ['commit', '-m', msg], { cwd: repo, stdio: 'inherit' })
    execFileSync('git', ['push', 'origin', TARGET], { cwd: repo, stdio: 'inherit' })
    console.log('[watch-fe-bedat] Xong.')
  } catch (e) {
    console.error('[watch-fe-bedat]', e?.message || e)
  }
}, INTERVAL_MS)
