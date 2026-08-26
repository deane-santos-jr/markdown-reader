import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt?: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
}) => {
  const [scale, setScale] = useState<number>(1);

  if (!isOpen || !imageSrc) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div
      className="modal-overlay"
      style={{ background: 'rgba(0, 0, 0, 0.85)', cursor: 'zoom-out' }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          gap: '0.5rem',
          zIndex: 110,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tool-btn icon-only" onClick={handleZoomIn} title="Zoom In" style={{ background: '#222', color: '#fff' }}>
          <ZoomIn size={16} />
        </button>
        <button className="tool-btn icon-only" onClick={handleZoomOut} title="Zoom Out" style={{ background: '#222', color: '#fff' }}>
          <ZoomOut size={16} />
        </button>
        <button className="tool-btn icon-only" onClick={handleReset} title="Reset" style={{ background: '#222', color: '#fff' }}>
          <RotateCcw size={16} />
        </button>
        <a
          href={imageSrc}
          download="image"
          className="tool-btn icon-only"
          title="Download Image"
          style={{ background: '#222', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Download size={16} />
        </a>
        <button className="tool-btn icon-only" onClick={onClose} title="Close" style={{ background: '#222', color: '#fff' }}>
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '90vw',
          maxHeight: '90vh',
          cursor: 'default',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt={imageAlt || ''}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            transform: `scale(${scale})`,
            transition: 'transform 0.15s ease',
            borderRadius: '6px',
            boxShadow: '0 10px 35px rgba(0,0,0,0.5)',
          }}
        />
        {imageAlt && (
          <div
            style={{
              color: '#ffffff',
              marginTop: '1rem',
              fontSize: '0.9rem',
              background: 'rgba(0,0,0,0.6)',
              padding: '4px 12px',
              borderRadius: '4px',
            }}
          >
            {imageAlt}
          </div>
        )}
      </div>
    </div>
  );
};
