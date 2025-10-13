const { app, BrowserWindow, protocol, session, powerSaveBlocker, systemPreferences } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let powerSaveBlockerId = null;

function createWindow() {
  // Check and request camera permissions on macOS
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('camera');
    if (status !== 'granted') {
      systemPreferences.askForMediaAccess('camera');
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      // ✅ SECURITY & MEDIA SETTINGS
      nodeIntegration: false,        // Keep this OFF for media + security
      contextIsolation: true,        // Must be true for modern Electron
      sandbox: false,                // Allow camera usage
      webSecurity: false,            // Needed to load local wasm/assets
      allowRunningInsecureContent: true,
      devTools: false,
      // Add preload script
      preload: path.join(__dirname, 'preload.js'),
      // Enhanced media settings
      media: {
        audio: false, // We don't need audio
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            minWidth: 640,
            maxWidth: 1920,
            minHeight: 480,
            maxHeight: 1080
          }
        }
      },
    },
  });

  // Prevent any kind of throttling
  mainWindow.webContents.setBackgroundThrottling(false);

  // Handle window state changes
  mainWindow.on('minimize', () => {
    mainWindow.webContents.setBackgroundThrottling(false);
  });

  mainWindow.on('hide', () => {
    mainWindow.webContents.setBackgroundThrottling(false);
  });

  // Handle window close
  mainWindow.on('closed', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('release-camera');
    }
    if (powerSaveBlockerId !== null) {
      powerSaveBlocker.stop(powerSaveBlockerId);
    }
    mainWindow = null;
  });

  // ✅ Handle permission requests (camera/mic)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      // Reset any existing camera usage first
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('release-camera');
      }
      console.log('Granting media permission');
      callback(true);
    } else {
      callback(false);
    }
  });

  // ✅ Register custom protocol for serving local assets (like wasm)
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6);
    callback({ path: path.normalize(`${app.getAppPath()}/public/${url}`) });
  });

  // ✅ Load React app (dev or production)
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Optional: open dev tools automatically
  if (isDev) mainWindow.webContents.openDevTools();

  // Optional: handle page reloading on dev
  mainWindow.webContents.on('did-fail-load', () => {
    if (isDev) mainWindow.loadURL('http://localhost:3000');
  });

  // Optional: Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  // For macOS — recreate window when clicking dock icon
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit app when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Add this after app.whenReady()
app.on('before-quit', () => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('release-camera');
  }
});
