const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startServer } = require('./index.js'); // Import the server starter

async function main() {
    const { server, port, hostname } = await startServer();

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

        // The server is now running, load the URL
        mainWindow.loadURL(`http://${hostname}:${port}`);

        console.log(`Server running at http://${hostname}:${port}`)

        // Open the DevTools.
        // mainWindow.webContents.openDevTools();
    }

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

main().catch(console.error);