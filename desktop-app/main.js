const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const Menu = electron.Menu
const safeStorage = electron.safeStorage
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const crypto = require('crypto')
const net = require('net')
const http = require('http')
const { dialog } = require('electron')

// AppImage cannot guarantee a setuid chrome-sandbox binary, and some Linux
// hosts disable unprivileged user namespaces entirely. Apply this before
// Electron creates its zygote; renderer context isolation remains enabled.
if (process.platform === 'linux' && app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox')
}

let mainWindow = null
let backendProcess = null
let frontendProcess = null
let configPath = null
let startingUp = false
let backendPort = 3001
let frontendPort = 3000

function databaseUrl(db) {
  const username = encodeURIComponent(db.username)
  const password = encodeURIComponent(db.password)
  const hostValue = databaseHost(db.host)
  const host = hostValue.includes(':') ? `[${hostValue}]` : hostValue
  return `mysql://${username}:${password}@${host}:${db.port}/${encodeURIComponent(db.database)}`
}

function databaseHost(host) {
  const value = String(host || '').trim()
  // MySQL installations commonly bind only IPv4. Avoid localhost resolving
  // to ::1 on Linux while still allowing users to enter a specific host.
  return value.toLowerCase() === 'localhost' || value === '::1'
    ? '127.0.0.1'
    : value
}

function bundledNodeEnv(extra = {}) {
  const env = {
    ...process.env,
    ...extra,
  }

  // Electron's executable can run ordinary Node entry points without relying
  // on npm or a system-wide Node installation on the target computer.
  if (app.isPackaged) env.ELECTRON_RUN_AS_NODE = '1'
  return env
}

function embeddedNodeArgs(entryPoint) {
  // These are trusted utility processes, not renderers. Do not pass Chromium
  // switches here: ELECTRON_RUN_AS_NODE treats them as invalid Node options.
  return [entryPoint]
}

function getConfigPath() {
  if (!configPath) {
    configPath = path.join(app.getPath('userData'), 'config.enc')
  }
  return configPath
}

function getLogPath() {
  const logDir = path.join(app.getPath('userData'), 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  return path.join(logDir, 'desktop.log')
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`
  console.log(line)
  try {
    fs.appendFileSync(getLogPath(), `${line}\n`)
  } catch (err) {
    console.error('Failed to write desktop log:', err)
  }
}

function pipeProcessLogs(name, proc) {
  proc.stdout.on('data', d => log(`${name}: ${d.toString().trimEnd()}`))
  proc.stderr.on('data', d => log(`${name}: ${d.toString().trimEnd()}`))
  proc.on('error', err => log(`${name} process error: ${err.stack || err.message}`))
  proc.on('exit', (code, signal) => {
    if (code !== 0) log(`${name} exited unexpectedly (code ${code}, signal ${signal || 'none'})`)
  })
}

// Rejects if the spawned process dies before the startup timeout elapses, so a
// crashed backend/frontend surfaces as an error dialog instead of an
// indefinitely blank window.
function watchEarlyExit(name, proc, reject, timeoutMs) {
  const timer = setTimeout(() => {
    proc.removeListener('exit', onExit)
  }, timeoutMs)
  function onExit(code, signal) {
    clearTimeout(timer)
    reject(new Error(
      `${name} exited during startup (code ${code}, signal ${signal || 'none'}). See ${getLogPath()}`
    ))
  }
  proc.once('exit', onExit)
}

function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

async function findAvailablePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error(`No available local port found from ${preferredPort} to ${preferredPort + 19}`)
}

function waitForTcp(port, label, timeoutMs = 30000) {
  const started = Date.now()

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port })
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`${label} did not become reachable on port ${port}. See ${getLogPath()}`))
        } else {
          setTimeout(attempt, 500)
        }
      })
    }

    attempt()
  })
}

function waitForHttp(url, label, timeoutMs = 45000) {
  const started = Date.now()

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, res => {
        // Any response below 500 means a server is genuinely answering.
        // 5xx (or an empty/aborted reply) is treated as not-ready so a
        // half-started server never yields a blank window.
        if (res.statusCode && res.statusCode < 500) {
          res.resume()
          resolve()
        } else {
          res.resume()
          retryOrFail(`${label} responded with HTTP ${res.statusCode}`)
        }
      })

      const retryOrFail = reason => {
        req.destroy()
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`${label} was not reachable at ${url} (${reason}). See ${getLogPath()}`))
        } else {
          setTimeout(attempt, 500)
        }
      }

      req.once('error', err => retryOrFail(err.code || err.message))
      req.setTimeout(5000, () => req.destroy())
    }

    attempt()
  })
}

function saveConfig(data) {
  const encrypted = safeStorage.encryptString(JSON.stringify(data))
  fs.writeFileSync(getConfigPath(), encrypted)
}

function loadConfig() {
  const p = getConfigPath()
  if (!fs.existsSync(p)) return null
  const encrypted = fs.readFileSync(p)
  return JSON.parse(safeStorage.decryptString(encrypted))
}

function configExists() {
  return fs.existsSync(getConfigPath())
}

function createSetupWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 660,
    backgroundColor: '#0B0E14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  })
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log(`Setup window failed to load ${url}: ${code} ${desc}`)
    dialog.showErrorBox('Retail CRM setup failed to load', `${code} ${desc}\n\nLog file:\n${getLogPath()}`)
  })
  mainWindow.loadFile(path.join(__dirname, 'setup.html'))
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0B0E14',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // AppImage builds cannot reliably provide Chromium's setuid sandbox on
      // all Linux hosts. Keep it enabled on Windows; Linux still retains
      // context isolation and disabled Node integration.
      sandbox: process.platform !== 'linux',
    },
    autoHideMenuBar: true,
  })
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log(`Main window failed to load ${url}: ${code} ${desc}`)
    dialog.showErrorBox('Retail CRM failed to load', `${code} ${desc}\n\nLog file:\n${getLogPath()}`)
  })
  const apiUrl = encodeURIComponent(`http://127.0.0.1:${backendPort}/api`)
  mainWindow.loadURL(`http://127.0.0.1:${frontendPort}/?apiUrl=${apiUrl}`)
}

async function startBackend(db, jwt, onEarlyExit) {
  const dbUrl = databaseUrl(db)
  backendPort = await findAvailablePort(Number(db.backendPort) || 3001)

  // Determine backend path based on whether we're packaged or in development
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '../backend')

  const command = app.isPackaged ? process.execPath : 'npm'
  const args = app.isPackaged
    ? embeddedNodeArgs(path.join(backendPath, 'src', 'main.js'))
    : ['run', 'start:dev']

  backendProcess = spawn(command, args, {
    cwd: backendPath,
    shell: false,
    env: bundledNodeEnv({
      DATABASE_URL: dbUrl,
      JWT_SECRET: jwt,
      NODE_ENV: app.isPackaged ? 'production' : process.env.NODE_ENV || 'development',
      PORT: String(backendPort),
      HOST: '127.0.0.1',
      FRONTEND_ORIGIN: `http://127.0.0.1:${frontendPort}`,
      ENABLE_SWAGGER: app.isPackaged ? 'false' : process.env.ENABLE_SWAGGER || 'true',
    }),
  })

  pipeProcessLogs('Backend', backendProcess)
  if (onEarlyExit) watchEarlyExit('Backend', backendProcess, onEarlyExit, 30000)
  return backendPort
}

async function startFrontend(onEarlyExit) {
  frontendPort = await findAvailablePort(Number(process.env.FRONTEND_PORT) || 3000)

  // Determine frontend path based on whether we're packaged or in development
  const frontendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend')
    : path.join(__dirname, '../frontend')

  const command = app.isPackaged ? process.execPath : 'npm'
  const args = app.isPackaged
    ? embeddedNodeArgs(path.join(frontendPath, 'server.js'))
    : ['run', 'dev']

  frontendProcess = spawn(command, args, {
    cwd: frontendPath,
    shell: false,
    env: bundledNodeEnv({
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${backendPort}/api`,
      PORT: String(frontendPort),
      HOSTNAME: '127.0.0.1',
    }),
  })

  pipeProcessLogs('Frontend', frontendProcess)
  if (onEarlyExit) watchEarlyExit('Frontend', frontendProcess, onEarlyExit, 45000)
  return frontendPort
}

async function startApplication(cfg) {
  startingUp = true
  try {
    let reportStartupFailure
    const startupFailed = new Promise((_, reject) => {
      reportStartupFailure = reject
    })

    frontendPort = await findAvailablePort(Number(cfg.frontendPort) || 3000)
    await startBackend(cfg.database, cfg.jwtSecret, err => {
      log(`Startup aborted: ${err.message}`)
      reportStartupFailure(err)
    })
    await startFrontend(err => {
      log(`Startup aborted: ${err.message}`)
      reportStartupFailure(err)
    })
    await Promise.race([
      (async () => {
        await waitForTcp(backendPort, 'Backend API')
        await waitForHttp(`http://127.0.0.1:${frontendPort}`, 'Frontend')
      })(),
      startupFailed,
    ])
    createMainWindow()
  } finally {
    startingUp = false
  }
}

app.on('ready', async () => {
  // Create Application Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Backup Database...',
          click: async () => {
            const { dialog } = require('electron')
            const cfg = loadConfig()
            if (!cfg) return dialog.showErrorBox('Error', 'No configuration found.')
            
            const result = await dialog.showSaveDialog(mainWindow, {
              title: 'Save Database Backup',
              defaultPath: `retail_crm_backup_${new Date().toISOString().slice(0, 10)}.sql`,
              filters: [{ name: 'SQL Files', extensions: ['sql'] }]
            })
      
            if (result.canceled || !result.filePath) return
      
            const util = require('util')
            const exec = util.promisify(require('child_process').exec)
            const db = cfg.database
            const dumpCmd = `mysqldump -h ${databaseHost(db.host)} -P ${db.port} -u ${db.username} ${db.password ? `-p"${db.password}"` : ''} ${db.database} > "${result.filePath}"`
            
            try {
              await exec(dumpCmd)
              dialog.showMessageBox(mainWindow, { type: 'info', title: 'Backup Successful', message: 'Database backed up successfully.' })
            } catch (err) {
              dialog.showErrorBox('Backup Failed', err.message)
            }
          }
        },
        {
          label: 'Restore Database...',
          click: async () => {
            const { dialog } = require('electron')
            const cfg = loadConfig()
            if (!cfg) return dialog.showErrorBox('Error', 'No configuration found.')
      
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Select Database Backup to Restore',
              filters: [{ name: 'SQL Files', extensions: ['sql'] }],
              properties: ['openFile']
            })
      
            if (result.canceled || !result.filePaths.length) return
      
            const util = require('util')
            const exec = util.promisify(require('child_process').exec)
            const db = cfg.database
            const restoreCmd = `mysql -h ${databaseHost(db.host)} -P ${db.port} -u ${db.username} ${db.password ? `-p"${db.password}"` : ''} ${db.database} < "${result.filePaths[0]}"`
            
            try {
              await exec(restoreCmd)
              dialog.showMessageBox(mainWindow, { type: 'info', title: 'Restore Successful', message: 'Database restored successfully.' })
            } catch (err) {
              dialog.showErrorBox('Restore Failed', err.message)
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Reset Configuration (Requires Restart)',
          click: async () => {
            const { dialog } = require('electron')
            const response = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Reset Configuration'],
              title: 'Confirm Reset',
              message: 'Are you sure you want to reset the configuration? The app will restart and prompt for setup again. Your database data will NOT be deleted.'
            })
            if (response.response === 1) {
              try {
                if (configExists()) fs.unlinkSync(getConfigPath())
                app.relaunch()
                app.exit(0)
              } catch (err) {
                dialog.showErrorBox('Reset Failed', err.message)
              }
            }
          }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Register IPC handlers
  ipcMain.handle('system:preflight', async (event) => {
    const send = r => { try { event.sender.send('preflight:update', r) } catch {} }
    const results = []
    const add = (id, label, status, detail) => {
      const r = { id, label, status, detail }
      results.push(r)
      send(r)
      return r
    }

    // 1. Runtime
    add('runtime', 'Application runtime', 'pass',
      `Electron ${process.versions.electron} · Node ${process.versions.node}`)

    // 2. Bundled components
    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, '../backend')
    const frontendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'frontend')
      : path.join(__dirname, '../frontend')
    const required = [
      ['API server', path.join(backendPath, 'src', 'main.js')],
      ['Web server', path.join(frontendPath, 'server.js')],
    ]
    const missing = required.filter(([, p]) => !fs.existsSync(p))
    add('components', 'Application components',
      missing.length ? 'fail' : 'pass',
      missing.length
        ? `Missing: ${missing.map(([n]) => n).join(', ')}`
        : 'API server and web server bundles found')

    // 3. Database schema (migrations bundled)
    const migrationsDir = path.join(backendPath, 'prisma', 'migrations')
    let hasMigrations = false
    try {
      hasMigrations = fs.readdirSync(migrationsDir).some(d =>
        fs.existsSync(path.join(migrationsDir, d, 'migration.sql')))
    } catch {}
    add('schema', 'Database schema files',
      hasMigrations ? 'pass' : 'fail',
      hasMigrations ? 'Migration bundle found' : 'No migrations found — installation cannot create tables')

    // 4. Database driver
    let driverOk = true, driverErr = ''
    try { require('mysql2/promise') } catch (err) { driverOk = false; driverErr = err.message }
    add('dbdriver', 'Database driver',
      driverOk ? 'pass' : 'fail',
      driverOk ? 'mysql2 loaded successfully' : driverErr)

    // 5. Writable data directory
    let dirOk = true, dirErr = ''
    const dataDir = app.getPath('userData')
    try {
      fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true })
      fs.accessSync(dataDir, fs.constants.W_OK)
    } catch (err) { dirOk = false; dirErr = err.message }
    add('datadir', 'Data directory',
      dirOk ? 'pass' : 'fail',
      dirOk ? `${dataDir} (writable)` : dirErr)

    // 6. Network ports
    let apiPort = null, webPort = null
    try { apiPort = await findAvailablePort(3001) } catch {}
    try { webPort = await findAvailablePort(3000) } catch {}
    const portsOk = Boolean(apiPort && webPort)
    add('ports', 'Network ports',
      portsOk ? 'pass' : 'fail',
      portsOk
        ? `API :${apiPort} · Web :${webPort} (auto-selected)`
        : 'No free ports in range 3000–3019')

    return results
  })

  ipcMain.handle('database:test', async (_e, cfg) => {
    try {
      const mysql = require('mysql2/promise')

      // First connect without database to create it if needed
      const conn = await mysql.createConnection({
        host: databaseHost(cfg.host),
        port: cfg.port,
        user: cfg.username,
        password: cfg.password,
      })

      // Create database if it doesn't exist
      // Database names cannot be parameterized; quote embedded backticks so a
      // value supplied by the setup window cannot alter this statement.
      const escapedDatabaseName = String(cfg.database).replace(/`/g, '``')
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${escapedDatabaseName}\``)
      await conn.end()

      // Now test connection to the specific database
      const dbConn = await mysql.createConnection({
        host: databaseHost(cfg.host),
        port: cfg.port,
        user: cfg.username,
        password: cfg.password,
        database: cfg.database,
      })
      await dbConn.end()

      return { success: true }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: `MySQL is not running or is unreachable at ${databaseHost(cfg.host)}:${cfg.port}. Start MySQL and try again.`,
        }
      }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('database:migrate', async (_e, cfg) => {
    const dbUrl = databaseUrl(cfg)

    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, '../backend')

    return new Promise((resolve, reject) => {
      let output = ''
      let errorOutput = ''

      const command = app.isPackaged ? process.execPath : 'npx'
      const args = app.isPackaged
        ? embeddedNodeArgs(path.join(backendPath, 'node_modules', 'prisma', 'build', 'index.js')).concat(['migrate', 'deploy'])
        : ['prisma', 'migrate', 'deploy']
      const proc = spawn(command, args, {
        cwd: backendPath,
        shell: false,
        env: bundledNodeEnv({ DATABASE_URL: dbUrl })
      })

      proc.stdout.on('data', (data) => {
        output += data.toString()
        log(`Migration: ${data.toString().trimEnd()}`)
      })

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString()
        log(`Migration Error: ${data.toString().trimEnd()}`)
      })

      proc.on('close', code => {
        if (code === 0) {
          resolve({ success: true })
        } else {
          reject(new Error(`Schema push failed (code ${code}): ${errorOutput || output}`))
        }
      })

      setTimeout(() => {
        proc.kill()
        reject(new Error('Schema push timeout after 3 minutes'))
      }, 180000)
    })
  })

  ipcMain.handle('db:createAdmin', async (_e, data) => {
    try {
      const bcrypt = require('bcrypt')
      const mysql = require('mysql2/promise')

      // Use the dbConfig passed from the wizard
      const dbConfig = data.dbConfig

      const conn = await mysql.createConnection({
        host: databaseHost(dbConfig.host),
        port: dbConfig.port,
        user: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
      })

      const hash = await bcrypt.hash(data.password, 12)

      await conn.execute(
        `INSERT INTO users (id, name, email, password, role, locale, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'SUPER_ADMIN', ?, true, NOW(), NOW())`,
        [crypto.randomBytes(12).toString('base64url'), data.name, data.email, hash, data.locale || 'ar']
      )

      await conn.end()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('database:backup', async () => {
    try {
      const cfg = loadConfig()
      if (!cfg || !cfg.database) throw new Error('No database configuration found')

      const { dialog } = require('electron')
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Database Backup',
        defaultPath: `retail_crm_backup_${new Date().toISOString().slice(0, 10)}.sql`,
        filters: [{ name: 'SQL Files', extensions: ['sql'] }]
      })

      if (result.canceled || !result.filePath) return { success: false, canceled: true }

      const util = require('util')
      const exec = util.promisify(require('child_process').exec)
      
      const db = cfg.database
      const dumpCmd = `mysqldump -h ${databaseHost(db.host)} -P ${db.port} -u ${db.username} ${db.password ? `-p"${db.password}"` : ''} ${db.database} > "${result.filePath}"`
      
      await exec(dumpCmd)
      return { success: true, filePath: result.filePath }
    } catch (err) {
      log(`Backup failed: ${err.stack || err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('database:restore', async () => {
    try {
      const cfg = loadConfig()
      if (!cfg || !cfg.database) throw new Error('No database configuration found')

      const { dialog } = require('electron')
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Database Backup to Restore',
        filters: [{ name: 'SQL Files', extensions: ['sql'] }],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths.length) return { success: false, canceled: true }
      const filePath = result.filePaths[0]

      const util = require('util')
      const exec = util.promisify(require('child_process').exec)
      
      const db = cfg.database
      const restoreCmd = `mysql -h ${databaseHost(db.host)} -P ${db.port} -u ${db.username} ${db.password ? `-p"${db.password}"` : ''} ${db.database} < "${filePath}"`
      
      await exec(restoreCmd)
      return { success: true }
    } catch (err) {
      log(`Restore failed: ${err.stack || err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('config:reset', async () => {
    try {
      if (configExists()) {
        fs.unlinkSync(getConfigPath())
      }
      app.relaunch()
      app.exit(0)
      return { success: true }
    } catch (err) {
      log(`Config reset failed: ${err.stack || err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('setup:complete', async (_e, cfg) => {
    try {
      if (!cfg.jwtSecret) {
        cfg.jwtSecret = crypto.randomBytes(64).toString('hex')
      }

      saveConfig(cfg)

      if (mainWindow) mainWindow.close()

      await startApplication(cfg)

      return { success: true }
    } catch (err) {
      log(`Setup completion failed: ${err.stack || err.message}`)
      return { success: false, error: err.message }
    }
  })

  // Start app
  if (!configExists()) {
    createSetupWindow()
  } else {
    try {
      const cfg = loadConfig()
      await startApplication(cfg)
    } catch (err) {
      log(`Startup failed: ${err.stack || err.message}`)
      dialog.showErrorBox('Retail CRM startup failed', `${err.message}\n\nLog file:\n${getLogPath()}`)
      app.quit()
    }
  }
})

app.on('window-all-closed', () => {
  // While transitioning from the setup window to the main window there is a
  // moment with zero open windows; quitting here would kill the backend and
  // frontend processes that were just started for the main window.
  if (startingUp) return
  if (backendProcess) backendProcess.kill()
  if (frontendProcess) frontendProcess.kill()
  app.quit()
})
