// Publish the corresponding source alongside the personal AGPL build.
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const skip = new Set(['.git', 'node_modules', 'dist', '.vercel', '.openai'])
const files = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (join(dir, name) === 'catalogue/media') continue
    if (skip.has(name) || name === '.env' || name.startsWith('.env.local')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else files.push(path)
  }
}
walk('.')
execFileSync('rm', ['-f', 'frontend/dist/source.zip'])
execFileSync('zip', ['-q', 'frontend/dist/source.zip', '-@'], { input: files.join('\n') + '\n' })
