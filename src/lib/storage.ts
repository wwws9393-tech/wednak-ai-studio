import { auth } from './firebase';

const SUPABASE_URL = 'https://bzdwwazrjxyubfacsxcs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rWcEX-GNr1AFpL_UruekMQ_ftP7aKAk';
const SUPABASE_BUCKET = 'wednak-media';

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export type MediaFolder =
  | 'hall-cover'
  | 'hall-profile'
  | 'provider-cover'
  | 'provider-avatar'
  | 'user-profile'
  | 'user-cover'
  | 'portfolio'
  | 'post-media'
  | 'media-thumbnails';

export type UploadProgressCallback = (progress: number) => void;

export interface UploadedMediaAsset {
  mediaUrl: string;
  thumbnailUrl?: string;
}

const IMMUTABLE_CACHE_SECONDS = 60 * 60 * 24 * 365;

function reportProgress(callback: UploadProgressCallback | undefined, value: number) {
  callback?.(Math.max(0, Math.min(100, Math.round(value))));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر تجهيز الصورة للرفع.'));
    };
    image.src = url;
  });
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('تعذر ضغط الصورة.'));
      resolve(new File([blob], `${name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' }));
    }, 'image/webp', quality);
  });
}

async function resizeImage(file: File, maxDimension: number, quality: number): Promise<File> {
  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز الصورة على هذا الجهاز.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return canvasToFile(canvas, file.name, quality);
}

async function createVideoThumbnail(file: File): Promise<File | undefined> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('thumbnail-timeout')), 9000);
      const done = () => { window.clearTimeout(timeout); resolve(); };
      video.addEventListener('loadeddata', done, { once: true });
      video.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('thumbnail-load-failed'));
      }, { once: true });
      video.src = objectUrl;
      video.load();
    });

    if (Number.isFinite(video.duration) && video.duration > 0.35) {
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 2500);
        video.addEventListener('seeked', () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.currentTime = Math.min(0.7, Math.max(0.1, video.duration / 12));
      });
    }

    const sourceWidth = video.videoWidth || 720;
    const sourceHeight = video.videoHeight || 1280;
    const scale = Math.min(1, 640 / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await canvasToFile(canvas, `${file.name.replace(/\.[^.]+$/, '')}-thumbnail`, 0.78);
  } catch {
    return undefined;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function uploadFile(
  file: File,
  folder: MediaFolder,
  uid: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const path = `users/${uid}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURI(path)}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_PUBLISHABLE_KEY}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('cache-control', `max-age=${IMMUTABLE_CACHE_SECONDS}, immutable`);
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        reportProgress(onProgress, (event.loaded / event.total) * 100);
      }
    };
    xhr.onerror = () => reject(new Error('تعذر الاتصال بخدمة رفع الملفات.'));
    xhr.onabort = () => reject(new Error('تم إيقاف رفع الملف.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        reportProgress(onProgress, 100);
        resolve(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURI(path)}`);
        return;
      }

      let message = 'تعذر رفع الملف إلى Supabase.';
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        message = body?.message || body?.error || message;
      } catch {
        // Keep Arabic fallback.
      }
      reject(new Error(message));
    };

    xhr.send(file);
  });
}

export async function uploadOwnerMediaAsset(
  file: File,
  folder: MediaFolder,
  onProgress?: UploadProgressCallback,
): Promise<UploadedMediaAsset> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('يجب تسجيل الدخول أولاً لرفع الملفات.');

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) throw new Error('اختر صورة أو فيديو صالحاً.');

  const maxBytes = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(isVideo ? 'حجم الفيديو يجب أن لا يتجاوز 50MB.' : 'حجم الصورة يجب أن لا يتجاوز 8MB.');
  }

  reportProgress(onProgress, 2);
  if (isImage) {
    const [optimized, thumbnail] = await Promise.all([
      resizeImage(file, 1600, 0.82),
      resizeImage(file, 640, 0.76),
    ]);
    reportProgress(onProgress, 10);
    const mediaUrl = await uploadFile(optimized, folder, uid, (value) => reportProgress(onProgress, 10 + value * 0.67));
    const thumbnailUrl = await uploadFile(thumbnail, 'media-thumbnails', uid, (value) => reportProgress(onProgress, 77 + value * 0.23));
    reportProgress(onProgress, 100);
    return { mediaUrl, thumbnailUrl };
  }

  const thumbnailPromise = createVideoThumbnail(file);
  const mediaUrl = await uploadFile(file, folder, uid, (value) => reportProgress(onProgress, 5 + value * 0.75));
  const thumbnail = await thumbnailPromise;
  const thumbnailUrl = thumbnail
    ? await uploadFile(thumbnail, 'media-thumbnails', uid, (value) => reportProgress(onProgress, 80 + value * 0.2))
    : undefined;
  reportProgress(onProgress, 100);
  return { mediaUrl, thumbnailUrl };
}

export async function uploadOwnerMedia(
  file: File,
  folder: MediaFolder,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('يجب تسجيل الدخول أولاً لرفع الملفات.');
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) throw new Error('اختر صورة أو فيديو صالحاً.');
  const maxBytes = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(isVideo ? 'حجم الفيديو يجب أن لا يتجاوز 50MB.' : 'حجم الصورة يجب أن لا يتجاوز 8MB.');

  reportProgress(onProgress, 3);
  const prepared = isImage ? await resizeImage(file, 1600, 0.82) : file;
  reportProgress(onProgress, 10);
  const url = await uploadFile(prepared, folder, uid, (value) => reportProgress(onProgress, 10 + value * 0.9));
  reportProgress(onProgress, 100);
  return url;
}

export async function uploadOwnerImage(
  file: File,
  folder: 'hall-cover' | 'hall-profile' | 'post-media',
  onProgress?: UploadProgressCallback,
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف المختار يجب أن يكون صورة.');
  return uploadOwnerMedia(file, folder, onProgress);
}
