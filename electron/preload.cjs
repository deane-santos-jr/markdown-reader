const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  openFileDialog: () => ipcRenderer.invoke('show-open-dialog-native'),
  openFolderDialog: () => ipcRenderer.invoke('show-open-directory-native'),
  readFile: (filePath) => ipcRenderer.invoke('read-file-native', filePath),
  saveFile: (request) => ipcRenderer.invoke('save-file-native', request),
  saveFileAs: (request) => ipcRenderer.invoke('show-save-dialog-native', request),
  toggleMaximize: () => ipcRenderer.invoke('window-maximize-toggle'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  confirmClose: () => ipcRenderer.invoke('window-close-confirmed'),
  onCloseRequested: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('close-requested', handler);
    return () => ipcRenderer.removeListener('close-requested', handler);
  },
  onFileOpened: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('file-opened', handler);
    return () => ipcRenderer.removeListener('file-opened', handler);
  },
});
