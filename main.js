const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const contextMenu = require('electron-context-menu');
const { startServer } = require('./index.js'); // Import the server starter

// Only one process should host the server; a second launch just opens
// another window against the already-running instance.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    main().catch(console.error);
}

async function main() {
    const { server, port, hostname } = await startServer();

    console.log(`Server running at http://${hostname}:${port}`)

    contextMenu({
        showSaveImageAs: true,
        showCopyImageAddress: true,
    });

    function createWindow() {
        const mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        // All windows share the single server started above.
        mainWindow.loadURL(`http://${hostname}:${port}`);

        // Open the DevTools.
        // mainWindow.webContents.openDevTools();
    }

    const isMac = process.platform === 'darwin';
    const menu = Menu.buildFromTemplate([
        ...(isMac ? [{ role: 'appMenu' }] : []),
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => createWindow(),
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' },
            ],
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ]);
    Menu.setApplicationMenu(menu);

    // A second launch of the app arrives here instead of starting its own server.
    app.on('second-instance', () => {
        createWindow();
    });

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', function () {
        server.close(() => {
            // console.log('Server closed');
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    });
}