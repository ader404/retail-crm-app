import { join } from 'path'
import { mkdirSync } from 'fs'

/**
 * Resolves the directory where uploaded files (e.g. product images) are stored.
 *
 * In a packaged Electron app the install directory is typically read-only
 * (e.g. under Program Files), so paths derived from __dirname/process.cwd()
 * inside the app bundle cannot be written to. Electron's main process sets
 * UPLOADS_DIR to a writable, OS-appropriate app-data directory (via
 * app.getPath('userData')) before spawning this backend. When that variable
 * isn't set (plain `pnpm start` in development), fall back to a local
 * `uploads` folder at the backend package root.
 */
export function getUploadsDir(): string {
  const dir = process.env.UPLOADS_DIR
    ? process.env.UPLOADS_DIR
    : join(process.cwd(), 'uploads')

  mkdirSync(dir, { recursive: true })
  return dir
}
