import { FilePlus2, FileText, FolderOpen, Trash2 } from 'lucide-react';
import type { RecentDocument } from '../types';
import type { RecoverySnapshot } from '../utils/documentLifecycle';

interface StartScreenProps {
  recents: RecentDocument[];
  recovery: RecoverySnapshot | null;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent: (recent: RecentDocument) => void;
  onRemoveRecent: (path: string) => void;
  onClearRecents: () => void;
  onRestore: () => void;
  onDiscardRecovery: () => void;
}

export function StartScreen({
  recents,
  recovery,
  onNew,
  onOpen,
  onOpenRecent,
  onRemoveRecent,
  onClearRecents,
  onRestore,
  onDiscardRecovery,
}: StartScreenProps) {
  return (
    <main className="start-screen">
      <section className="start-panel">
        <div className="start-heading">
          <span className="start-kicker">LOCAL WRITING</span>
          <h1>Write without losing the thread.</h1>
          <p>Open Markdown or plain text, or begin with a clean untitled draft.</p>
        </div>

        <div className="start-actions">
          <button className="start-action primary" onClick={onNew}>
            <FilePlus2 size={20} />
            <span><strong>New document</strong><small>Start an untitled draft</small></span>
          </button>
          <button className="start-action" onClick={onOpen}>
            <FolderOpen size={20} />
            <span><strong>Open file</strong><small>Markdown or plain text</small></span>
          </button>
        </div>

        {recovery && (
          <div className="recovery-card">
            <div>
              <span className="start-kicker">RECOVERY AVAILABLE</span>
              <strong>{recovery.title}</strong>
              <small>{new Date(recovery.capturedAt).toLocaleString()}</small>
            </div>
            <div className="recovery-actions">
              <button className="tool-btn active" onClick={onRestore}>Restore draft</button>
              <button className="tool-btn" onClick={onDiscardRecovery}>Discard</button>
            </div>
          </div>
        )}

        <div className="recent-section">
          <div className="recent-header">
            <span className="start-kicker">RECENT FILES</span>
            {recents.length > 0 && <button className="text-button" onClick={onClearRecents}>Clear recents</button>}
          </div>
          {recents.length === 0 ? (
            <div className="recent-empty">Files you open on desktop will appear here.</div>
          ) : (
            <div className="recent-list">
              {recents.map((recent) => (
                <div className="recent-row" key={recent.path}>
                  <button className="recent-open" onClick={() => onOpenRecent(recent)}>
                    <FileText size={17} />
                    <span><strong>{recent.name}</strong><small>{recent.path}</small></span>
                    <time>{new Date(recent.openedAt).toLocaleDateString()}</time>
                  </button>
                  <button className="tool-btn icon-only" onClick={() => onRemoveRecent(recent.path)} title="Remove from recents">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
