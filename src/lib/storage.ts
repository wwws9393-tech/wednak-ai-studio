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
  | 'portfolio'
  | 'post-media';

export async function uploadOwnerMedia(file: File, folder: MediaFolder): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('يجب تسجيل الدخول أولاً لرفع الملفات.');

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) throw new Error('اختر صورة أو فيديو صالحاً.');

  const maxBytes = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(isVideo ? 'حجم الفيديو يجب أن لا يتجاوز 50MB.' : 'حجم الصورة يجب أن لا يتجاوز 8MB.');
  }

  const path = `users/${uid}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURI(path)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  });

  if (!response.ok) {
    let message = 'تعذر رفع الملف إلى Supabase.';
    try {
      const body = await response.json();
      message = body?.message || body?.error || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURI(path)}`;
}

export async function uploadOwnerImage(
  file: File,
  folder: 'hall-cover' | 'hall-profile' | 'post-media'
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف المختار يجب أن يكون صورة.');
  return uploadOwnerMedia(file, folder);
}
