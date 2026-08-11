import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';
import {
  UserProfile,
  Booking,
  Hall,
  ServiceProvider,
  FeedPost,
  Complaint,
  AccountType,
  BookingStatus,
} from '../types';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  { experimentalAutoDetectLongPolling: true },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', errInfo);
  throw error instanceof Error ? error : new Error(String(error));
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!/^\d{1,2}:\d{2}$/.test(timeStr || '')) {
    throw new Error('صيغة الوقت غير صحيحة.');
  }
  const [h, m] = timeStr.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error('قيمة الوقت غير صحيحة.');
  return h * 60 + m;
}

export function getSlotTimeRange(timeSlot: string, startTimeStr?: string, endTimeStr?: string) {
  let start = startTimeStr;
  let end = endTimeStr;

  if (!start || !end) {
    if (timeSlot.includes('صباحي')) {
      start = '10:00';
      end = '14:00';
    } else if (timeSlot.includes('ليلي')) {
      start = '23:00';
      end = '02:00';
    } else {
      start = '18:00';
      end = '23:00';
    }
  }

  const startMins = parseTimeToMinutes(start);
  let endMins = parseTimeToMinutes(end);
  if (endMins <= startMins) endMins += 24 * 60;
  if (endMins - startMins > 24 * 60) throw new Error('مدة الحجز غير صحيحة.');

  return { start, end, startMins, endMins };
}

export function checkTimeOverlap(
  range1: { startMins: number; endMins: number },
  range2: { startMins: number; endMins: number }
): boolean {
  return range1.startMins < range2.endMins && range1.endMins > range2.startMins;
}

function bookingLockKeys(itemId: string, date: string, startMins: number, endMins: number): string[] {
  const keys: string[] = [];
  // 30-minute lock granularity. All current booking inputs are aligned to clock slots.
  for (let minute = Math.floor(startMins / 30) * 30; minute < endMins; minute += 30) {
    keys.push(`${itemId}_${date}_${minute}`.replace(/[^a-zA-Z0-9_-]/g, '_'));
  }
  return keys;
}

export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function requireFirebaseUser(): Promise<FirebaseUser> {
  const user = await ensureFirebaseAuth();
  if (!user) throw new Error('يجب تسجيل الدخول أو التحقق من رقم الهاتف أولاً.');
  return user;
}

export async function fetchUserFromFirestore(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const firebaseUser = await ensureFirebaseAuth();
  if (!firebaseUser || firebaseUser.uid !== uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.error('Error fetching user from Firestore:', err);
    return null;
  }
}

export async function findUserByPhoneFromFirestore(phone: string): Promise<UserProfile | null> {
  // User documents are private. After phone-auth, only inspect the authenticated user's own document.
  const firebaseUser = await ensureFirebaseAuth();
  if (!firebaseUser) return null;
  const profile = await fetchUserFromFirestore(firebaseUser.uid);
  if (!profile) return null;
  const normalize = (value: string) => value.trim().replace(/\s+/g, '');
  return normalize(profile.phone) === normalize(phone) ? profile : null;
}

export async function saveUserToFirestore(user: UserProfile): Promise<UserProfile> {
  const firebaseUser = await requireFirebaseUser();
  if (user.id && user.id !== firebaseUser.uid) {
    throw new Error('لا يمكن حفظ بيانات مستخدم آخر.');
  }

  const userRef = doc(db, 'users', firebaseUser.uid);
  const existing = await getDoc(userRef);
  const now = new Date().toISOString();

  if (existing.exists()) {
    const previous = existing.data() as UserProfile;
    if (previous.accountType !== user.accountType) {
      throw new Error('لا يمكن تغيير نوع الحساب بعد إنشائه من الواجهة.');
    }
  }

  const userDoc: UserProfile = {
    ...user,
    id: firebaseUser.uid,
    updatedAt: now,
    createdAt: user.createdAt || (existing.exists() ? (existing.data() as UserProfile).createdAt : now),
  };

  try {
    await setDoc(userRef, userDoc, { merge: true });
    return userDoc;
  } catch (err) {
    return handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
  }
}

export function subscribeBookings(uid: string, accountType: AccountType, callback: (bookings: Booking[]) => void) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const bookingsRef = collection(db, 'bookings');
  const q = accountType === 'مدير Admin' || accountType === 'مدير'
    ? query(bookingsRef)
    : accountType === 'صاحب قاعة' || accountType === 'مزود خدمة'
      ? query(bookingsRef, where('targetOwnerId', '==', uid))
      : query(bookingsRef, where('requesterId', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Booking));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (error) => {
      console.error('Bookings listener error:', error);
      callback([]);
    }
  );
}

export async function createBookingInFirestore(bookingData: {
  itemType: 'hall' | 'provider';
  itemId: string;
  itemName: string;
  itemLocation: string;
  itemImage: string;
  date: string;
  timeSlot: string;
  guests?: number;
  totalPrice: number;
  depositAmount: number;
  notes: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  ownerId?: string;
  startTime?: string;
  endTime?: string;
}): Promise<Booking> {
  const firebaseUser = await requireFirebaseUser();
  if (bookingData.customerId && bookingData.customerId !== firebaseUser.uid) {
    throw new Error('هوية صاحب الحجز غير متطابقة مع الحساب المسجل.');
  }
  if (!bookingData.ownerId) throw new Error('تعذر تحديد مالك القاعة أو مزود الخدمة.');
  if (firebaseUser.uid === bookingData.ownerId) throw new Error('لا يمكنك حجز حسابك أو خدمتك الخاصة.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingData.date)) throw new Error('تاريخ الحجز غير صحيح.');

  const range = getSlotTimeRange(bookingData.timeSlot, bookingData.startTime, bookingData.endTime);
  const bookingsRef = collection(db, 'bookings');

  try {
    const existingSnap = await getDocs(
      query(bookingsRef, where('itemId', '==', bookingData.itemId), where('date', '==', bookingData.date))
    );
    const acceptedOverlap = existingSnap.docs
      .map((d) => d.data() as Booking)
      .filter((b) => b.status === 'مقبول' || b.status === 'accepted')
      .some((b) => checkTimeOverlap(range, getSlotTimeRange(b.timeSlot, b.startTime, b.endTime)));
    if (acceptedOverlap) throw new Error('هذا الموعد محجوز. يرجى اختيار وقت آخر.');
  } catch (err) {
    if (err instanceof Error && err.message.includes('محجوز')) throw err;
    handleFirestoreError(err, OperationType.GET, 'bookings');
  }

  const newDocRef = doc(bookingsRef);
  const now = new Date().toISOString();
  const humanBookingId = `WED-${Date.now().toString().slice(-8)}`;
  const newBooking: Booking = {
    id: newDocRef.id,
    bookingId: humanBookingId,
    itemType: bookingData.itemType,
    itemId: bookingData.itemId,
    itemName: bookingData.itemName,
    itemLocation: bookingData.itemLocation,
    itemImage: bookingData.itemImage,
    date: bookingData.date,
    timeSlot: bookingData.timeSlot,
    startTime: range.start,
    endTime: range.end,
    guests: bookingData.guests,
    totalPrice: bookingData.totalPrice,
    depositAmount: bookingData.depositAmount,
    notes: bookingData.notes,
    status: 'قيد المراجعة',
    createdAt: now,
    updatedAt: now,
    customerName: bookingData.customerName,
    customerPhone: bookingData.customerPhone,
    customerId: firebaseUser.uid,
    requesterId: firebaseUser.uid,
    requesterName: bookingData.customerName,
    requesterPhone: bookingData.customerPhone,
    requesterAccountType: 'زبون',
    ownerId: bookingData.ownerId,
    targetOwnerId: bookingData.ownerId,
    targetType: bookingData.itemType,
    hallId: bookingData.itemType === 'hall' ? bookingData.itemId : null,
    serviceProviderId: bookingData.itemType === 'provider' ? bookingData.itemId : null,
  };

  try {
    await setDoc(newDocRef, newBooking);
    return newBooking;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, `bookings/${newDocRef.id}`);
  }
}

export async function acceptBookingInFirestore(bookingDocId: string): Promise<void> {
  const firebaseUser = await requireFirebaseUser();
  const bookingRef = doc(db, 'bookings', bookingDocId);

  try {
    // First read existing accepted bookings to cover legacy bookings created before lock documents existed.
    const initialSnap = await getDoc(bookingRef);
    if (!initialSnap.exists()) throw new Error('الحجز غير موجود.');
    const initial = initialSnap.data() as Booking;
    if (initial.targetOwnerId !== firebaseUser.uid) throw new Error('ليس لديك صلاحية قبول هذا الحجز.');

    const range = getSlotTimeRange(initial.timeSlot, initial.startTime, initial.endTime);
    const existing = await getDocs(query(collection(db, 'bookings'), where('itemId', '==', initial.itemId), where('date', '==', initial.date)));
    const legacyOverlap = existing.docs
      .filter((d) => d.id !== bookingDocId)
      .map((d) => d.data() as Booking)
      .filter((b) => b.status === 'مقبول' || b.status === 'accepted')
      .some((b) => checkTimeOverlap(range, getSlotTimeRange(b.timeSlot, b.startTime, b.endTime)));
    if (legacyOverlap) throw new Error('تعذر القبول: يوجد حجز مؤكد متعارض في نفس الفترة.');

    const lockKeys = bookingLockKeys(initial.itemId, initial.date, range.startMins, range.endMins);
    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(bookingRef);
      if (!freshSnap.exists()) throw new Error('الحجز غير موجود.');
      const booking = freshSnap.data() as Booking;
      if (booking.targetOwnerId !== firebaseUser.uid) throw new Error('ليس لديك صلاحية قبول هذا الحجز.');
      if (booking.status !== 'قيد المراجعة' && booking.status !== 'pending') throw new Error('تم تغيير حالة هذا الحجز سابقاً.');

      const lockRefs = lockKeys.map((key) => doc(db, 'bookingLocks', key));
      for (const lockRef of lockRefs) {
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists()) throw new Error('تعذر القبول: الموعد أصبح محجوزاً بواسطة طلب آخر.');
      }

      for (const lockRef of lockRefs) {
        transaction.set(lockRef, {
          bookingId: bookingDocId,
          itemId: booking.itemId,
          date: booking.date,
          requesterId: booking.requesterId,
          targetOwnerId: booking.targetOwnerId,
          createdAt: new Date().toISOString(),
        });
      }

      transaction.update(bookingRef, { status: 'مقبول', updatedAt: new Date().toISOString() });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingDocId}`);
  }
}

export async function updateBookingStatusInFirestore(bookingDocId: string, newStatus: BookingStatus): Promise<void> {
  if (newStatus === 'مقبول' || newStatus === 'accepted') {
    await acceptBookingInFirestore(bookingDocId);
    return;
  }
  if (newStatus === 'ملغي' || newStatus === 'cancelled') {
    await cancelBookingInFirestore(bookingDocId);
    return;
  }

  await requireFirebaseUser();
  try {
    await updateDoc(doc(db, 'bookings', bookingDocId), { status: newStatus, updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingDocId}`);
  }
}

export async function cancelBookingInFirestore(bookingDocId: string): Promise<void> {
  const firebaseUser = await requireFirebaseUser();
  const bookingRef = doc(db, 'bookings', bookingDocId);
  try {
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) throw new Error('الحجز غير موجود.');
    const booking = snap.data() as Booking;
    if (booking.requesterId !== firebaseUser.uid && booking.targetOwnerId !== firebaseUser.uid) {
      throw new Error('ليس لديك صلاحية إلغاء هذا الحجز.');
    }

    const range = getSlotTimeRange(booking.timeSlot, booking.startTime, booking.endTime);
    const lockKeys = bookingLockKeys(booking.itemId, booking.date, range.startMins, range.endMins);

    await runTransaction(db, async (transaction) => {
      const fresh = await transaction.get(bookingRef);
      if (!fresh.exists()) throw new Error('الحجز غير موجود.');
      const current = fresh.data() as Booking;
      if (current.requesterId !== firebaseUser.uid && current.targetOwnerId !== firebaseUser.uid) {
        throw new Error('ليس لديك صلاحية إلغاء هذا الحجز.');
      }
      for (const key of lockKeys) {
        const lockRef = doc(db, 'bookingLocks', key);
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists() && lockSnap.data().bookingId === bookingDocId) transaction.delete(lockRef);
      }
      transaction.update(bookingRef, { status: 'ملغي', updatedAt: new Date().toISOString() });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingDocId}`);
  }
}

export function subscribeUserFavorites(uid: string, callback: (favIds: string[]) => void) {
  if (!uid) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'users', uid, 'favorites'),
    (snap) => callback(snap.docs.map((d) => d.id)),
    (err) => {
      console.error('Favorites listener error:', err);
      callback([]);
    }
  );
}

export async function toggleUserFavoriteInFirestore(uid: string, itemId: string, itemType: string) {
  const firebaseUser = await requireFirebaseUser();
  if (uid !== firebaseUser.uid) throw new Error('لا يمكنك تعديل مفضلة حساب آخر.');
  const favDocRef = doc(db, 'users', uid, 'favorites', itemId);
  try {
    const snap = await getDoc(favDocRef);
    if (snap.exists()) await deleteDoc(favDocRef);
    else await setDoc(favDocRef, { itemId, itemType, createdAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/favorites/${itemId}`);
  }
}

export function subscribeComplaints(uid: string, accountType: AccountType, callback: (list: Complaint[]) => void) {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const ref = collection(db, 'complaints');
  const q = accountType === 'مدير Admin' || accountType === 'مدير'
    ? query(ref)
    : query(ref, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Complaint))),
    (err) => {
      console.error('Complaints listener error:', err);
      callback([]);
    }
  );
}

export async function createComplaintInFirestore(complaint: Omit<Complaint, 'id' | 'createdAt' | 'status'>): Promise<Complaint> {
  const firebaseUser = await requireFirebaseUser();
  if (complaint.userId && complaint.userId !== firebaseUser.uid) throw new Error('هوية الشكوى غير صحيحة.');
  const docRef = doc(collection(db, 'complaints'));
  const newComplaint: Complaint = {
    ...complaint,
    id: docRef.id,
    userId: firebaseUser.uid,
    status: 'قيد المراجعة',
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(docRef, newComplaint);
    return newComplaint;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, `complaints/${docRef.id}`);
  }
}

export async function updateComplaintStatusInFirestore(complaintId: string, status: Complaint['status'], adminReply?: string) {
  await requireFirebaseUser();
  try {
    await updateDoc(doc(db, 'complaints', complaintId), {
      status,
      ...(adminReply ? { adminReply } : {}),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
  }
}

// Client-side production builds never seed demo data. Kept as a no-op for backwards-compatible App imports.
export async function seedInitialDataIfEmpty(): Promise<void> {
  return;
}

export function subscribeHalls(callback: (halls: Hall[]) => void) {
  return onSnapshot(
    collection(db, 'halls'),
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Hall))),
    (err) => {
      console.error('Error subscribing to halls:', err);
      callback([]);
    }
  );
}

export function subscribeServiceProviders(callback: (providers: ServiceProvider[]) => void) {
  return onSnapshot(
    collection(db, 'serviceProviders'),
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as ServiceProvider))),
    (err) => {
      console.error('Error subscribing to service providers:', err);
      callback([]);
    }
  );
}

export function subscribePosts(callback: (posts: FeedPost[]) => void) {
  return onSnapshot(
    collection(db, 'posts'),
    (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FeedPost));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.error('Error subscribing to posts:', err);
      callback([]);
    }
  );
}

export async function createPostInFirestore(post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>): Promise<FeedPost> {
  const firebaseUser = await requireFirebaseUser();
  if (post.authorId && post.authorId !== firebaseUser.uid) throw new Error('لا يمكنك النشر باسم حساب آخر.');
  const docRef = doc(collection(db, 'posts'));
  const newPost: FeedPost = {
    ...post,
    id: docRef.id,
    authorId: firebaseUser.uid,
    likesCount: 0,
    sharesCount: 0,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(docRef, newPost);
    return newPost;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, `posts/${docRef.id}`);
  }
}
