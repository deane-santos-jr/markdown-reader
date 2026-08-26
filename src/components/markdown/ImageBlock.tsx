import React from 'react';

interface ImageBlockProps {
  src?: string;
  alt?: string;
  onImageClick?: (src: string, alt?: string) => void;
}

const ALLOWED_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'data:', 'blob:']);

function isSafeImageSrc(src: string): boolean {
  try {
    // Allow relative URLs (no protocol)
    if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../') || (!src.includes(':') && !src.startsWith('//'))) {
      return true;
    }
    const url = new URL(src, window.location.href);
    if (ALLOWED_IMAGE_PROTOCOLS.has(url.protocol)) {
      // For data: only allow image/*
      if (url.protocol === 'data:' && !src.startsWith('data:image/')) return false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const ImageBlock: React.FC<ImageBlockProps> = ({ src, alt, onImageClick }) => {
  if (!src) return null;
  if (!isSafeImageSrc(src)) {
    return (
      <div style={{ margin: '1.5em 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
        Blocked unsafe image source
      </div>
    );
  }

  const safeAlt = alt || '';
  return (
    <div style={{ margin: '1.5em 0', textAlign: 'center' }}>
      <img
        src={src}
        alt={safeAlt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        onClick={() => {
          if (onImageClick && isSafeImageSrc(src)) onImageClick(src, safeAlt);
        }}
        title={safeAlt ? `${safeAlt} (Click to zoom)` : 'Click to zoom'}
      />
      {safeAlt && <div className="image-caption">{safeAlt}</div>}
    </div>
  );
};
