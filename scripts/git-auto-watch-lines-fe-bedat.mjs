#!/usr/bin/env node
/**
 * Quét định kỳ: nếu đang ở FE_BE_DAT và tổng dòng thêm+xóa (git numstat) so với HEAD
 * trong các thư mục được giám sát ≥ MIN_LINES → stage các path đó → commit → push.
 * Chạy từ repo root: node scripts/git-auto-watch-lines-fe-bedat.mjs
 * Hoặc: npm run watch:fe-push-lines
 */
import { execFileSync, execSync } from 'child_process'
import { findGitRoot } from './find-git-root.mjs'

const TARGET = 'FE_BE_DAT'
const INTERVAL_MS = 12000
const MIN_LINES = 2
/** Chỉ tính diff trong các path này; commit cũng chỉ add các path này + package.json gốc */
const DIFF_PATHSPECS = ['app', 'Shop2026/Shop2026', 'scripts', 'package.json', 'package-lock.json']

const repo = findGitRoot()
process.chdir(repo)

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts })
}

function currentBranch() {
  return sh('git branch --show-current', { cwd: repo }).trim()
}

/** Tổng dòng insert+delete (bỏ qua file binary `-` trong numstat) */
function countScopedDiffLines() {
  const args = ['diff', '--numstat', 'HEAD', '--', ...DIFF_PATHSPECS]
  let out
  try {
    out = execFileSync('git', args, { cwd: repo, encoding: 'utf8' })
  } catch {
    return 0
  }
  let total = 0
  for (const line of out.split(/\r?\n/)) {
    if (!line.trim()) continue
    const tab = line.indexOf('\t')
    if (tab === -1) continue
    const ins = line.slice(0, tab)
    const rest = line.slice(tab + 1)
    const tab2 = rest.indexOf('\t')
    const del = tab2 === -1 ? rest : rest.slice(0, tab2)
    if (ins === '-' || del === '-') continue
    total += (parseInt(ins, 10) || 0) + (parseInt(del, 10) || 0)
  }
  return total
}

console.log(`[watch-lines] Repo: ${repo}`)
console.log(`[watch-lines] Nhánh: ${TARGET} | Ngưỡng: ≥${MIN_LINES} dòng | Chu kỳ: ${INTERVAL_MS}ms`)
console.log(`[watch-lines] Path: ${DIFF_PATHSPECS.join(', ')}`)

setInterval(() => {
  try {
    if (currentBranch() !== TARGET) return
    const n = countScopedDiffLines()
    if (n < MIN_LINES) return

    console.log(`[watch-lines] Phát hiện ~${n} dòng thay đổi → add, commit, push…`)
    execFileSync('git', ['add', '--', ...DIFF_PATHSPECS], { cwd: repo, stdio: 'inherit' })
    execFileSync(
      'git',
      ['commit', '-m', `chore: auto-commit (${n}+ lines in scoped paths) [watch-lines]`],
      { cwd: repo, stdio: 'inherit' },
    )
    execFileSync('git', ['push', 'origin', TARGET], { cwd: repo, stdio: 'inherit' })
    console.log('[watch-lines] Xong.')
  } catch (e) {
    if (String(e?.message || e).includes('nothing to commit')) {
      return
    }
    console.error('[watch-lines]', e?.message || e)
  }
}, INTERVAL_MS)
