const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getCommandLineArgs: () => ipcRenderer.invoke('get-command-line-args')
});
