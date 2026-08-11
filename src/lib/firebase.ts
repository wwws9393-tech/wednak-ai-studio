import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signOut,
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
import { UserProfile, Booking, Hall, ServiceProvider, FeedPost, Complaint, AccountType, BookingStatus } from '../types';
import { INITIAL_HALLS } from '../data/halls';
import { INITIAL_SERVICE_PROVIDERS } from '../data/serviceProviders';
import { INITIAL_POSTS } from '../data/posts';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with long polling auto-detection to ensure smooth connectivity in browser sandbox environments
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Time helpers for slot overlap calculation
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = parts.length > 1 && !isNaN(parts[1]) ? parts[1] : 0;
  return h * 60 + m;
}

export function getSlotTimeRange(timeSlot: string, startTimeStr?: string, endTimeStr?: string) {
  let start = startTimeStr || '18:00';
  let end = endTimeStr || '23:00';

  if (!startTimeStr || !endTimeStr) {
    if (timeSlot.includes('صباحي')) {
      start = '10:00';
      end = '14:00';
    } else if (timeSlot.includes('مسائي')) {
      start = '18:00';
      end = '23:00';
    } else if (timeSlot.includes('ليلي')) {
      start = '23:00';
      end = '02:00';
    }
  }

  let startMins = parseTimeToMinutes(start);
  let endMins = parseTimeToMinutes(end);
  if (endMins <= startMins) {
    endMins += 24 * 60; // Midnight crossing
  }

  return { start, end, startMins, endMins };
}

export function checkTimeOverlap(
  range1: { startMins: number; endMins: number },
  range2: { startMins: number; endMins: number }
): boolean {
  return range1.startMins < range2.endMins && range1.endMins > range2.startMins;
}

// Safe Auth check (no anonymous sign in to avoid admin-restricted-operation errors)
export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// User Profile Service
export async function fetchUserFromFirestore(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user from Firestore:', err);
    return null;
  }
}

export async function findUserByPhoneFromFirestore(phone: string): Promise<UserProfile | null> {
  const path = 'users';
  try {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const q = query(collection(db, 'users'), where('phone', '==', cleanPhone));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error finding user by phone in Firestore:', err);
    return null;
  }
}

export async function saveUserToFirestore(user: UserProfile): Promise<UserProfile> {
  const firebaseUser = await ensureFirebaseAuth();
  const targetUid = user.id || firebaseUser?.uid || `user-${Date.now()}`;

  const userDoc: UserProfile = {
    ...user,
    id: targetUid,
  };

  const userRef = doc(db, 'users', targetUid);
  try {
    await setDoc(
      userRef,
      {
        ...userDoc,
        updatedAt: new Date().toISOString(),
        createdAt: user.createdAt || new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}`);
  }

  return userDoc;
}

// Bookings Service
export function subscribeBookings(
  uid: string,
  accountType: AccountType,
  callback: (bookings: Booking[]) => void
) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const bookingsRef = collection(db, 'bookings');
  let q;

  if (accountType === 'مدير Admin' || accountType === 'مدير') {
    q = query(bookingsRef);
  } else if (accountType === 'صاحب قاعة' || accountType === 'مزود خدمة') {
    q = query(bookingsRef, where('targetOwnerId', '==', uid));
  } else {
    q = query(bookingsRef, where('requesterId', '==', uid));
  }

  return onSnapshot(
    q,
    (snap) => {
      const list: Booking[] = snap.docs.map((d) => d.data() as Booking);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (error) => {
      console.error('Bookings listener error:', error);
      if (accountType === 'صاحب قاعة' || accountType === 'مزود خدمة') {
        const fallbackQ = query(bookingsRef, where('ownerId', '==', uid));
        onSnapshot(fallbackQ, (fSnap) => {
          const list: Booking[] = fSnap.docs.map((d) => d.data() as Booking);
          callback(list);
        });
      } else if (accountType === 'زبون') {
        const fallbackQ = query(bookingsRef, where('customerId', '==', uid));
        onSnapshot(fallbackQ, (fSnap) => {
          const list: Booking[] = fSnap.docs.map((d) => d.data() as Booking);
          callback(list);
        });
      }
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
  const firebaseUser = await ensureFirebaseAuth();
  const currentUid = bookingData.customerId || firebaseUser?.uid || `guest-${Date.now()}`;

  const targetOwnerId = bookingData.ownerId || 'owner-1';

  if (currentUid === targetOwnerId) {
    throw new Error('لا يمكنك حجز قاعتك أو حسابك الخاص كصاحب قاعة/مزود خدمة.');
  }

  const range = getSlotTimeRange(bookingData.timeSlot, bookingData.startTime, bookingData.endTime);

  const bookingsRef = collection(db, 'bookings');
  let existingSnap;
  try {
    existingSnap = await getDocs(
      query(
        bookingsRef,
        where('itemId', '==', bookingData.itemId),
        where('date', '==', bookingData.date)
      )
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'bookings');
  }

  const acceptedOverlaps = existingSnap!.docs
    .map((d) => d.data() as Booking)
    .filter((b) => b.status === 'مقبول' || b.status === 'accepted')
    .some((b) => {
      const bRange = getSlotTimeRange(b.timeSlot, (b as any).startTime, (b as any).endTime);
      return checkTimeOverlap(range, bRange);
    });

  if (acceptedOverlaps) {
    throw new Error('عذراً، هذا الموعد محجوز بالكامل ومأكود لهذا اليوم. يرجى اختيار تاريخ أو فترة زمنية أخرى.');
  }

  const newDocRef = doc(collection(db, 'bookings'));
  const bookingId = `WED-${Date.now().toString().slice(-4)}`;

  const newBooking: Booking = {
    id: bookingId,
    bookingId: bookingId,
    itemType: bookingData.itemType,
    itemId: bookingData.itemId,
    itemName: bookingData.itemName,
    itemLocation: bookingData.itemLocation,
    itemImage: bookingData.itemImage,
    date: bookingData.date,
    timeSlot: bookingData.timeSlot,
    guests: bookingData.guests,
    totalPrice: bookingData.totalPrice,
    depositAmount: bookingData.depositAmount,
    notes: bookingData.notes,
    status: 'قيد المراجعة',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName: bookingData.customerName,
    customerPhone: bookingData.customerPhone,
    customerId: currentUid,
    requesterId: currentUid,
    requesterName: bookingData.customerName,
    requesterPhone: bookingData.customerPhone,
    requesterAccountType: 'زبون',
    ownerId: targetOwnerId,
    targetOwnerId: targetOwnerId,
    targetType: bookingData.itemType,
    hallId: bookingData.itemType === 'hall' ? bookingData.itemId : null,
    serviceProviderId: bookingData.itemType === 'provider' ? bookingData.itemId : null,
    startTime: range.start,
    endTime: range.end,
  } as any;

  try {
    await setDoc(doc(db, 'bookings', newDocRef.id), newBooking);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `bookings/${newDocRef.id}`);
  }

  return newBooking;
}

// Transaction for Accepting Booking safely with Overlap Check
export async function acceptBookingInFirestore(bookingDocId: string): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, 'bookings', bookingDocId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error('الحجز غير موجود.');
      }

      const booking = bookingSnap.data() as Booking & {
        startTime?: string;
        endTime?: string;
        targetOwnerId?: string;
        requesterId?: string;
      };

      if (booking.status !== 'قيد المراجعة' && booking.status !== 'pending') {
        throw new Error('تم تغيير حالة هذا الحجز سابقاً.');
      }

      const date = booking.date;
      const itemId = booking.itemId;
      const range = getSlotTimeRange(booking.timeSlot, booking.startTime, booking.endTime);

      const qSnap = await getDocs(
        query(collection(db, 'bookings'), where('itemId', '==', itemId), where('date', '==', date))
      );

      const hasOverlap = qSnap.docs
        .filter((d) => d.id !== bookingDocId)
        .map((d) => d.data() as Booking & { startTime?: string; endTime?: string })
        .filter((b) => b.status === 'مقبول' || b.status === 'accepted')
        .some((b) => {
          const bRange = getSlotTimeRange(b.timeSlot, b.startTime, b.endTime);
          return checkTimeOverlap(range, bRange);
        });

      if (hasOverlap) {
        throw new Error('تعذر القبول: يوجد حجز آخر مؤكد متعارض في نفس الفترة الزمنية.');
      }

      transaction.update(bookingRef, {
        status: 'مقبول',
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingDocId}`);
  }
}

export async function updateBookingStatusInFirestore(bookingDocId: string, newStatus: BookingStatus): Promise<void> {
  if (newStatus === 'مقبول') {
    await acceptBookingInFirestore(bookingDocId);
    return;
  }

  const bookingRef = doc(db, 'bookings', bookingDocId);
  try {
    await updateDoc(bookingRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingDocId}`);
  }
}

export async function cancelBookingInFirestore(bookingDocId: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingDocId);
  try {
    await updateDoc(bookingRef, {
      status: 'ملغي',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingDocId}`);
  }
}

// Favorites Real-Time Listener & Actions
export function subscribeUserFavorites(uid: string, callback: (favIds: string[]) => void) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const favsRef = collection(db, 'users', uid, 'favorites');
  return onSnapshot(favsRef, (snap) => {
    const ids = snap.docs.map((d) => d.id);
    callback(ids);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${uid}/favorites`);
  });
}

export async function toggleUserFavoriteInFirestore(uid: string, itemId: string, itemType: string) {
  if (!uid) return;
  const favDocRef = doc(db, 'users', uid, 'favorites', itemId);
  try {
    const snap = await getDoc(favDocRef);
    if (snap.exists()) {
      await deleteDoc(favDocRef);
    } else {
      await setDoc(favDocRef, {
        itemId,
        itemType,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/favorites/${itemId}`);
  }
}

// Complaints Real-Time Service
export function subscribeComplaints(uid: string, accountType: AccountType, callback: (list: Complaint[]) => void) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const ref = collection(db, 'complaints');
  let q;
  if (accountType === 'مدير Admin' || accountType === 'مدير') {
    q = query(ref);
  } else {
    q = query(ref, where('userId', '==', uid));
  }

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Complaint);
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'complaints');
  });
}

export async function createComplaintInFirestore(complaint: Omit<Complaint, 'id' | 'createdAt' | 'status'>): Promise<Complaint> {
  const firebaseUser = await ensureFirebaseAuth();
  const docRef = doc(collection(db, 'complaints'));
  const id = `CMP-${Date.now().toString().slice(-4)}`;
  const userId = complaint.userId || firebaseUser?.uid || `user-${Date.now()}`;

  const newComplaint: Complaint = {
    ...complaint,
    id,
    userId,
    status: 'قيد المراجعة',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, newComplaint);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `complaints/${docRef.id}`);
  }

  return newComplaint;
}

export async function updateComplaintStatusInFirestore(complaintId: string, status: Complaint['status'], adminReply?: string) {
  const q = query(collection(db, 'complaints'), where('id', '==', complaintId));
  try {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, {
        status,
        ...(adminReply ? { adminReply } : {}),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
  }
}

// Data Seed Function to populate initial Halls, Providers, Posts into Firestore if empty
export async function seedInitialDataIfEmpty() {
  try {
    // Halls
    const hallsSnap = await getDocs(collection(db, 'halls'));
    if (hallsSnap.empty) {
      for (const hall of INITIAL_HALLS) {
        await setDoc(doc(db, 'halls', hall.id), hall);
      }
    }

    // Providers
    const providersSnap = await getDocs(collection(db, 'serviceProviders'));
    if (providersSnap.empty) {
      for (const provider of INITIAL_SERVICE_PROVIDERS) {
        await setDoc(doc(db, 'serviceProviders', provider.id), provider);
      }
    }

    // Posts
    const postsSnap = await getDocs(collection(db, 'posts'));
    if (postsSnap.empty) {
      for (const post of INITIAL_POSTS) {
        await setDoc(doc(db, 'posts', post.id), post);
      }
    }
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
}

export function subscribeHalls(callback: (halls: Hall[]) => void) {
  return onSnapshot(collection(db, 'halls'), (snap) => {
    if (!snap.empty) {
      callback(snap.docs.map((d) => d.data() as Hall));
    } else {
      callback(INITIAL_HALLS);
    }
  }, (err) => {
    console.error('Error subscribing to halls:', err);
    callback(INITIAL_HALLS);
  });
}

export function subscribeServiceProviders(callback: (providers: ServiceProvider[]) => void) {
  return onSnapshot(collection(db, 'serviceProviders'), (snap) => {
    if (!snap.empty) {
      callback(snap.docs.map((d) => d.data() as ServiceProvider));
    } else {
      callback(INITIAL_SERVICE_PROVIDERS);
    }
  }, (err) => {
    console.error('Error subscribing to service providers:', err);
    callback(INITIAL_SERVICE_PROVIDERS);
  });
}

export function subscribePosts(callback: (posts: FeedPost[]) => void) {
  return onSnapshot(collection(db, 'posts'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as FeedPost);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    } else {
      callback(INITIAL_POSTS);
    }
  }, (err) => {
    console.error('Error subscribing to posts:', err);
    callback(INITIAL_POSTS);
  });
}

export async function createPostInFirestore(post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>): Promise<FeedPost> {
  const firebaseUser = await ensureFirebaseAuth();
  const docRef = doc(collection(db, 'posts'));
  const authorId = post.authorId || firebaseUser?.uid || `author-${Date.now()}`;

  const newPost: FeedPost = {
    ...post,
    id: `post-${Date.now()}`,
    authorId,
    likesCount: 0,
    sharesCount: 0,
    createdAt: 'قبل لحظات',
  };

  try {
    await setDoc(docRef, newPost);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posts/${docRef.id}`);
  }

  return newPost;
}
