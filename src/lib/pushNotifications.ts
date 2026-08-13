import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { WEB_PUSH_VAPID_KEY } from '../config/push';

export type PushSupport = 'supported' | 'unsupported' | 'not-configured';

export async function getPushSupport(): Promise<PushSupport> {
  if (!WEB_PUSH_VAPID_KEY || WEB_PUSH_VAPID_KEY.startsWith('REPLACE_')) return 'not-configured';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return (await isSupported()) ? 'supported' : 'unsupported';
}

async function tokenDocumentId(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function messagingRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js');
}

export async function enablePushNotifications(uid: string): Promise<void> {
  if (await getPushSupport() !== 'supported') throw new Error('إشعارات هذا الجهاز غير مدعومة أو لم يتم إعداد مفتاح Web Push بعد.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('لم تتم الموافقة على إذن الإشعارات. يمكنك تفعيله من إعدادات الجهاز.');
  const registration = await messagingRegistration();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: WEB_PUSH_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('تعذر تسجيل هذا الجهاز لاستلام الإشعارات.');

  const tokenId = await tokenDocumentId(token);
  await setDoc(doc(db, 'users', uid, 'pushTokens', tokenId), {
    token,
    tokenId,
    enabled: true,
    platform: navigator.platform || 'web',
    userAgent: navigator.userAgent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function disablePushNotifications(uid: string): Promise<void> {
  if (await getPushSupport() !== 'supported') return;
  const registration = await messagingRegistration();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: WEB_PUSH_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (token) {
    const tokenId = await tokenDocumentId(token);
    await deleteDoc(doc(db, 'users', uid, 'pushTokens', tokenId));
    await deleteToken(messaging);
  }
}

export async function refreshPushRegistration(uid: string): Promise<void> {
  if (Notification.permission !== 'granted' || await getPushSupport() !== 'supported') return;
  await enablePushNotifications(uid);
}

export async function initializeForegroundPushNotifications(): Promise<() => void> {
  if (await getPushSupport() !== 'supported') return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, async (payload) => {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(payload.notification?.title || payload.data?.title || 'ويدنك', {
      body: payload.notification?.body || payload.data?.body || 'لديك تحديث جديد',
      icon: '/wednak-mark-green.svg',
      badge: '/wednak-mark-green.svg',
      data: { url: payload.data?.url || '/?tab=notifications' },
      tag: payload.data?.notificationId || payload.data?.bookingId || 'wednak-update',
    });
  });
}
