const { app, BrowserWindow, protocol, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow; // Move mainWindow to global scope

function createWindow() {
  mainWindow = new BrowserWindow({  // Remove const, use global mainWindow
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
      devTools: true,

      // ✅ IMPORTANT: allow media access
      // (Some versions of Electron honor this flag)
      media: {
        audio: false,
        video: true,
      },
    },
  });

  // ✅ Handle permission requests (camera/mic)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      console.log('Media permission granted');
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

  // Move minimize event listener inside createWindow
//   mainWindow.on('minimize', (event) => {
//     event.preventDefault();
//    // mainWindow.hide(); // Keeps app running in background
//     console.log('App hidden but still running...');
//   });

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
