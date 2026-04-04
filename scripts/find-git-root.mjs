import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function findGitRoot(startDir = __dirname) {
  let dir = path.resolve(startDir)
  const root = path.parse(dir).root
  while (dir && dir !== root) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    dir = path.dirname(dir)
  }
  throw new Error('Không tìm thấy thư mục chứa .git (chạy script từ trong repo).')
}
