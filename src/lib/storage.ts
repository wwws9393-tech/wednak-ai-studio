import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app, auth } from './firebase';

const storage = getStorage(app);

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadOwnerImage(file: File, folder: 'hall-cover' | 'hall-profile' | 'post-media'): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('يجب تسجيل الدخول أولاً لرفع الصور.');
  if (!file.type.startsWith('image/')) throw new Error('الملف المختار يجب أن يكون صورة.');
  if (file.size > 8 * 1024 * 1024) throw new Error('حجم الصورة يجب أن لا يتجاوز 8MB.');

  const path = `users/${uid}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
