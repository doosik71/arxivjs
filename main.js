const { app, BrowserWindow, Menu, dialog } = require('electron');
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

    // Guards the confirmation dialog: only asked once per "closing the last
    // window" attempt, and reset so it is asked again next time.
    let quitConfirmed = false;

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

        mainWindow.on('close', (event) => {
            const isLastWindow = BrowserWindow.getAllWindows().length === 1;
            if (!isLastWindow || quitConfirmed) {
                return;
            }

            event.preventDefault();

            const choice = dialog.showMessageBoxSync(mainWindow, {
                type: 'question',
                buttons: ['Quit', 'Cancel'],
                defaultId: 1,
                cancelId: 1,
                title: 'Quit ArxivJS',
                message: 'Quit ArxivJS?',
                detail: 'Closing the last window will also stop the server.',
            });

            if (choice === 0) {
                quitConfirmed = true;
                mainWindow.close();
            }
        });

        mainWindow.on('closed', () => {
            quitConfirmed = false;
        });
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
        // Any keep-alive or in-flight streaming (summarize/chat) connection
        // can keep server.close()'s callback from ever firing, so force it
        // after a short grace period instead of waiting indefinitely.
        const forceCloseTimer = setTimeout(() => {
            server.closeAllConnections();
        }, 3000);

        server.close(() => {
            clearTimeout(forceCloseTimer);
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    });
}