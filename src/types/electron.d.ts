import type { DocumentFormat, WorkspaceFile } from './index';

interface NativeOpenedFile {
  path: string;
  name: string;
  content: string;
  modifiedTime: number;
  error?: string;
}

interface NativeSaveResult {
  status: 'saved' | 'conflict' | 'cancelled' | 'error';
  path?: string;
  name?: string;
  modifiedTime?: number;
  error?: string;
}

interface ElectronWriterApi {
  isDesktop: boolean;
  platform: string;
  openFileDialog(): Promise<NativeOpenedFile | null>;
  openFolderDialog(): Promise<WorkspaceFile[] | { error: string } | null>;
  readFile(path: string): Promise<NativeOpenedFile>;
  saveFile(request: {
    path: string;
    content: string;
    expectedModifiedTime?: number;
    overwrite?: boolean;
  }): Promise<NativeSaveResult>;
  saveFileAs(request: {
    content: string;
    format: Exclude<DocumentFormat, 'neutral'>;
    suggestedName: string;
  }): Promise<NativeSaveResult>;
  toggleMaximize(): Promise<void>;
  minimizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  confirmClose(): Promise<void>;
  onCloseRequested(callback: () => void): () => void;
  onFileOpened(callback: (file: NativeOpenedFile) => void): () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronWriterApi;
  }
}

export {};
