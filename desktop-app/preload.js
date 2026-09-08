const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  runPreflight: () => ipcRenderer.invoke('system:preflight'),
  onPreflightUpdate: (callback) => {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('preflight:update', listener)
    return () => ipcRenderer.removeListener('preflight:update', listener)
  },
  testDatabase: (config) => ipcRenderer.invoke('database:test', config),
  runMigration: (config) => ipcRenderer.invoke('database:migrate', config),
  createAdmin: (data) => ipcRenderer.invoke('db:createAdmin', data),
  completeSetup: (config) => ipcRenderer.invoke('setup:complete', config),
  backupDatabase: () => ipcRenderer.invoke('database:backup'),
  restoreDatabase: () => ipcRenderer.invoke('database:restore'),
  resetConfig: () => ipcRenderer.invoke('config:reset'),
})
