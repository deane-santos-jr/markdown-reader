import type { DocumentFormat, WorkspaceFile } from '../types';
import { ensureFormatExtension, MAX_DOCUMENT_BYTES } from './documentLifecycle';

export interface OpenedFileResult {
  name: string;
  content: string;
  path?: string;
  handle?: unknown;
  modifiedTime?: number;
}

export interface SaveFileResult {
  status: 'saved' | 'conflict' | 'cancelled' | 'error';
  name?: string;
  path?: string;
  handle?: unknown;
  modifiedTime?: number;
}

interface BrowserFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(content: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

function decodeFile(buffer: ArrayBuffer): string {
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) throw new Error('File exceeds the 5 MB limit');
  const bytes = new Uint8Array(buffer);
  if (bytes.includes(0)) throw new Error('Binary files are not supported');
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

export async function readBrowserFile(file: File): Promise<string> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('File exceeds the 5 MB limit');
  return decodeFile(await file.arrayBuffer());
}

export async function openFilePicker(): Promise<OpenedFileResult | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Writing documents',
          accept: {
            'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
            'text/plain': ['.txt'],
          },
        }],
        multiple: false,
      }) as BrowserFileHandle[];
      const file = await handle.getFile();
      return {
        name: file.name,
        content: await readBrowserFile(file),
        path: file.name,
        handle,
        modifiedTime: file.lastModified,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.mdown,.mkd,.txt';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve({
          name: file.name,
          content: await readBrowserFile(file),
          path: file.name,
          modifiedTime: file.lastModified,
        });
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

export async function openDirectoryPicker(): Promise<WorkspaceFile[] | null> {
  if (!('showDirectoryPicker' in window)) return null;
  try {
    const directoryHandle = await (window as any).showDirectoryPicker();
    return await readDirectoryRecursively(directoryHandle, '');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

async function readDirectoryRecursively(
  directoryHandle: any,
  currentPath: string,
  depth = 0,
): Promise<WorkspaceFile[]> {
  if (depth > 8) return [];
  const entries: WorkspaceFile[] = [];
  let count = 0;

  for await (const entry of directoryHandle.values()) {
    if (count++ >= 1000) break;
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      if (['node_modules', '.git', '.vscode', 'dist', 'build'].includes(entry.name)) continue;
      entries.push({
        id: entryPath,
        name: entry.name,
        path: entryPath,
        isDir: true,
        children: await readDirectoryRecursively(entry, entryPath, depth + 1),
        handle: entry,
      });
    } else if (/\.(md|markdown|mdown|mkd|txt)$/i.test(entry.name)) {
      entries.push({
        id: entryPath,
        name: entry.name,
        path: entryPath,
        isDir: false,
        handle: entry,
      });
    }
  }

  return entries.sort((left, right) => {
    if (left.isDir !== right.isDir) return left.isDir ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

export async function readFileHandle(handleValue: unknown, path?: string): Promise<OpenedFileResult> {
  const handle = handleValue as BrowserFileHandle;
  if (!handle?.getFile) throw new Error('This file is no longer available');
  const browserFile = await handle.getFile();
  return {
    name: browserFile.name,
    path: path || browserFile.name,
    content: await readBrowserFile(browserFile),
    handle,
    modifiedTime: browserFile.lastModified,
  };
}

export async function readWorkspaceFile(file: WorkspaceFile): Promise<OpenedFileResult> {
  return readFileHandle(file.handle, file.path);
}

export async function saveToFileHandle(
  content: string,
  handleValue: unknown,
  expectedModifiedTime?: number,
  overwrite = false,
): Promise<SaveFileResult> {
  const handle = handleValue as BrowserFileHandle;
  if (!handle?.createWritable || !handle.getFile) return { status: 'error' };
  try {
    const currentFile = await handle.getFile();
    if (!overwrite && expectedModifiedTime && currentFile.lastModified !== expectedModifiedTime) {
      return { status: 'conflict' };
    }
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    const savedFile = await handle.getFile();
    return {
      status: 'saved',
      name: savedFile.name,
      path: savedFile.name,
      handle,
      modifiedTime: savedFile.lastModified,
    };
  } catch {
    return { status: 'error' };
  }
}

export async function saveAsFile(
  content: string,
  format: Exclude<DocumentFormat, 'neutral'>,
  suggestedName: string,
): Promise<SaveFileResult> {
  const name = ensureFormatExtension(suggestedName, format);
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: name,
        types: [{
          description: format === 'markdown' ? 'Markdown document' : 'Plain text document',
          accept: format === 'markdown'
            ? { 'text/markdown': ['.md'] }
            : { 'text/plain': ['.txt'] },
        }],
      }) as BrowserFileHandle;
      if (handle.name !== ensureFormatExtension(handle.name, format)) return { status: 'error' };
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      const file = await handle.getFile();
      return {
        status: 'saved',
        name: file.name,
        path: file.name,
        handle,
        modifiedTime: file.lastModified,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return { status: 'cancelled' };
      return { status: 'error' };
    }
  }

  const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
  return { status: 'saved', name, path: name };
}
