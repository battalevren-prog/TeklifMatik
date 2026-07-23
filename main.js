const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  const windowOptions = {
    width: 1300,
    height: 860,
    minWidth: 800,
    minHeight: 500,
    title: 'TeklifMatik - Profesyonel Teklif Yönetim Uygulaması',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  };

  const iconPath = path.join(__dirname, 'src/assets/icon.png');
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Print / PDF Generation
ipcMain.handle('print-to-pdf', async (event, filename) => {
  try {
    const pdfPath = dialog.showSaveDialogSync(mainWindow, {
      title: 'Teklifi PDF Olarak Kaydet',
      defaultPath: filename || 'Teklif.pdf',
      filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }]
    });

    if (!pdfPath) return { success: false, cancelled: true };

    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    fs.writeFileSync(pdfPath, data);
    return { success: true, filePath: pdfPath };
  } catch (error) {
    console.error('PDF error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler: Export Backup JSON
ipcMain.handle('export-backup', async (event, jsonDataString) => {
  try {
    const savePath = dialog.showSaveDialogSync(mainWindow, {
      title: 'Veri Yedekleme Dosyasını Kaydet',
      defaultPath: `TeklifMatik_Yedek_${new Date().toISOString().slice(0,10)}.json`,
      filters: [{ name: 'JSON Dosyası', extensions: ['json'] }]
    });

    if (!savePath) return { success: false, cancelled: true };

    fs.writeFileSync(savePath, jsonDataString, 'utf-8');
    return { success: true, filePath: savePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler: Import Backup JSON
ipcMain.handle('import-backup', async () => {
  try {
    const files = dialog.showOpenDialogSync(mainWindow, {
      title: 'Yedek Dosyasını Seçin',
      properties: ['openFile'],
      filters: [{ name: 'JSON Dosyası', extensions: ['json'] }]
    });

    if (!files || files.length === 0) return { success: false, cancelled: true };

    const content = fs.readFileSync(files[0], 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
