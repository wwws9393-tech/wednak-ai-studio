import React, { useEffect, useRef, useState } from 'react';

interface MediaThumbnailProps {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  alt: string;
  className?: string;
  fallbackUrl?: string;
}

/**
 * Lightweight list/grid preview. New videos use their stored poster without
 * touching the video file. Legacy videos are mounted only when they approach
 * the viewport so existing data remains visible without slowing app startup.
 */
export const MediaThumbnail: React.FC<MediaThumbnailProps> = ({
  url,
  type,
  thumbnailUrl,
  alt,
  className = 'h-full w-full object-cover',
  fallbackUrl,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(type === 'image' || !!thumbnailUrl);

  useEffect(() => {
    if (type !== 'video' || thumbnailUrl || nearViewport) return;
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nearViewport, thumbnailUrl, type]);

  const imageUrl = thumbnailUrl || (type === 'image' ? url : '');

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-slate-900">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(event) => {
            if (fallbackUrl && event.currentTarget.src !== fallbackUrl) event.currentTarget.src = fallbackUrl;
          }}
        />
      ) : nearViewport ? (
        <video
          src={url}
          aria-label={alt}
          muted
          playsInline
          preload="metadata"
          className={className}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.duration > 0.1 && video.currentTime === 0) video.currentTime = Math.min(0.1, video.duration / 10);
          }}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900" aria-label="جاري تجهيز معاينة الفيديو" />
      )}
    </div>
  );
};
