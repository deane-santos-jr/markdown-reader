const { app, BrowserWindow, ipcMain, dialog, crashReporter } = require('electron');
const path = require('path');
const fs = require('fs');
const { TextDecoder } = require('util');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RENDERER_RELOAD_COOLDOWN_MS = 60 * 1000;
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt']);

function isAllowedFile(filePath) {
  return ALLOWED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function decodeDocument(buffer) {
  if (buffer.length > MAX_FILE_SIZE) throw new Error('File exceeds the 5 MB limit');
  if (buffer.includes(0)) throw new Error('Binary files are not supported');
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
}

async function safeReadFile(filePath) {
  const resolved = path.resolve(filePath);
  const stat = await fs.promises.stat(resolved);
  if (!stat.isFile()) throw new Error('Not a file');
  const content = decodeDocument(await fs.promises.readFile(resolved));
  return {
    path: resolved,
    name: path.basename(resolved),
    content,
    modifiedTime: stat.mtimeMs,
  };
}

async function readDirectoryTree(directoryPath, depth = 0, counter = { value: 0 }) {
  if (depth > 8 || counter.value >= 1000) return [];
  const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
  const tree = [];
  for (const entry of entries) {
    if (counter.value++ >= 1000) break;
    if (['node_modules', '.git', '.vscode', 'dist', 'build'].includes(entry.name)) continue;
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      tree.push({
        id: entryPath,
        name: entry.name,
        path: entryPath,
        isDir: true,
        children: await readDirectoryTree(entryPath, depth + 1, counter),
      });
    } else if (entry.isFile() && isAllowedFile(entryPath)) {
      tree.push({ id: entryPath, name: entry.name, path: entryPath, isDir: false });
    }
  }
  return tree.sort((left, right) => {
    if (left.isDir !== right.isDir) return left.isDir ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

function enforceExtension(filePath, format) {
  const extension = format === 'markdown' ? '.md' : '.txt';
  const currentExtension = path.extname(filePath).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(currentExtension)) return filePath.slice(0, -currentExtension.length) + extension;
  return filePath + extension;
}

async function writeDocument(filePath, content, expectedModifiedTime, overwrite) {
  if (typeof filePath !== 'string' || filePath.length > 1024) throw new Error('Invalid path');
  if (!isAllowedFile(filePath)) throw new Error('Disallowed extension');
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
    throw new Error('Content exceeds the 5 MB limit');
  }

  const resolved = path.resolve(filePath);
  if (!overwrite && expectedModifiedTime !== undefined) {
    try {
      const currentStat = await fs.promises.stat(resolved);
      if (Math.abs(currentStat.mtimeMs - expectedModifiedTime) > 0.5) return { status: 'conflict' };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await fs.promises.writeFile(resolved, content, 'utf-8');
  const stat = await fs.promises.stat(resolved);
  return {
    status: 'saved',
    path: resolved,
    name: path.basename(resolved),
    modifiedTime: stat.mtimeMs,
  };
}

let mainWindow = null;
let pendingFiles = [];
let closeConfirmed = false;
let quitRequested = false;
let quitOnConfirmedClose = false;
let rendererHung = false;
let lastRendererReloadAt = 0;

crashReporter.start({ uploadToServer: false });

app.on('before-quit', () => {
  quitRequested = true;
});

function isAbnormalExit(details) {
  return details.reason !== 'clean-exit';
}

function recordProcessExit(details) {
  if (!isAbnormalExit(details)) return;
  const logsDirectory = app.getPath('logs');
  fs.mkdirSync(logsDirectory, { recursive: true });
  const entry = JSON.stringify({ time: new Date().toISOString(), ...details });
  fs.appendFileSync(path.join(logsDirectory, 'process-exits.log'), entry + '\n');
}

app.on('render-process-gone', (_event, _webContents, details) => recordProcessExit({ type: 'Renderer', ...details }));
app.on('child-process-gone', (_event, details) => recordProcessExit(details));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const secondFile = argv.slice(1).find((argument) => {
      if (argument.startsWith('-')) return false;
      return /\.(md|markdown|mdown|mkd|txt)$/i.test(argument);
    });
    if (secondFile) {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        readFileAndSend(secondFile);
      } else {
        pendingFiles.push(secondFile);
      }
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow?.webContents) readFileAndSend(filePath);
  else pendingFiles.push(filePath);
});

async function readFileAndSend(filePath) {
  try {
    if (!isAllowedFile(filePath)) throw new Error('Disallowed extension');
    const document = await safeReadFile(filePath);
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('file-opened', document);
    }
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('Unable to open document', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

function rendererCanConfirmClose() {
  return !rendererHung && !mainWindow.webContents.isCrashed();
}

function reloadAfterRendererLoss() {
  const now = Date.now();
  if (now - lastRendererReloadAt < RENDERER_RELOAD_COOLDOWN_MS) return;
  lastRendererReloadAt = now;
  mainWindow.reload();
}

function createWindow() {
  rendererHung = false;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: '#f6f8fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableWebSQL: false,
      spellcheck: true,
      backgroundThrottling: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingFiles.length > 0) {
      const filesToOpen = [...pendingFiles];
      pendingFiles = [];
      for (const file of filesToOpen) readFileAndSend(file);
      return;
    }
    const argumentFile = process.argv.slice(1).find((argument) => {
      if (argument.startsWith('-')) return false;
      if (argument === '.' || argument.endsWith('.cjs') || argument.endsWith('.js')) return false;
      return /\.(md|markdown|mdown|mkd|txt)$/i.test(argument);
    });
    if (argumentFile) readFileAndSend(argumentFile);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (isAbnormalExit(details)) reloadAfterRendererLoss();
  });
  mainWindow.on('unresponsive', () => {
    rendererHung = true;
  });
  mainWindow.on('responsive', () => {
    rendererHung = false;
  });
  mainWindow.on('close', (event) => {
    quitOnConfirmedClose = quitRequested;
    quitRequested = false;
    if (closeConfirmed || !rendererCanConfirmClose()) return;
    event.preventDefault();
    mainWindow.webContents.send('close-requested');
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    closeConfirmed = false;
  });
}

ipcMain.handle('read-file-native', async (_event, filePath) => {
  try {
    if (typeof filePath !== 'string' || filePath.length > 1024) throw new Error('Invalid path');
    if (!isAllowedFile(filePath)) throw new Error('Disallowed extension');
    return await safeReadFile(filePath);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to read file' };
  }
});

ipcMain.handle('save-file-native', async (_event, request) => {
  try {
    return await writeDocument(
      request.path,
      request.content,
      request.expectedModifiedTime,
      request.overwrite === true,
    );
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : 'Unable to save file' };
  }
});

ipcMain.handle('show-open-dialog-native', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Writing documents', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    return await safeReadFile(result.filePaths[0]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to open file' };
  }
});

ipcMain.handle('show-open-directory-native', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return null;
  try {
    return await readDirectoryTree(path.resolve(result.filePaths[0]));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to open folder' };
  }
});

ipcMain.handle('show-save-dialog-native', async (_event, request) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { status: 'cancelled' };
  const format = request.format === 'text' ? 'text' : 'markdown';
  const defaultName = enforceExtension(request.suggestedName || 'Untitled', format);
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{
      name: format === 'markdown' ? 'Markdown document' : 'Plain text document',
      extensions: [format === 'markdown' ? 'md' : 'txt'],
    }],
  });
  if (result.canceled || !result.filePath) return { status: 'cancelled' };
  const filePath = enforceExtension(result.filePath, format);
  try {
    return await writeDocument(filePath, request.content, undefined, true);
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : 'Unable to save file' };
  }
});

ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize-toggle', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow?.close());
ipcMain.handle('window-close-confirmed', () => {
  closeConfirmed = true;
  if (quitOnConfirmedClose) app.quit();
  else mainWindow?.close();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
