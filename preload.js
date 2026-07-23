const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printToPDF: (filename) => ipcRenderer.invoke('print-to-pdf', filename),
  exportBackup: (dataString) => ipcRenderer.invoke('export-backup', dataString),
  importBackup: () => ipcRenderer.invoke('import-backup'),
  isDesktop: true
});
