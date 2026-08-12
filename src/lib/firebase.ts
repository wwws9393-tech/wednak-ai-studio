import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  console.error('Firestore Error:', {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: { userId: auth.currentUser?.uid || null, isAnonymous: auth.currentUser?.isAnonymous || false },
  });
  throw error instanceof Error ? error : new Error(String(error));
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!/^\d{1,2}:\d{2}$/.test(timeStr || '')) throw new Error('صيغة الوقت غير صحيحة.');
  const [h, m] = timeStr.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error('قيمة الوقت غير صحيحة.');
  return h * 60 + m;
}

export function getSlotTimeRange(timeSlot: string, startTimeStr?: string, endTimeStr?: string) {
  let start = startTimeStr;
  let end = endTimeStr;
  if (!start || !end) {
    if (timeSlot.includes('صباحي')) { start = '10:00'; end = '14:00'; }
    else if (timeSlot.includes('ليلي')) { start = '23:00'; end = '02:00'; }
    else { start = '18:00'; end = '23:00'; }
  }
  const startMins = parseTimeToMinutes(start);
  let endMins = parseTimeToMinutes(end);
  if (endMins <= startMins) endMins += 1440;
  return { start, end, startMins, endMins };
}

export function checkTimeOverlap(
  a: { startMins: number; endMins: number },
  b: { startMins: number; endMins: number }
): boolean {
  return a.startMins < b.endMins && a.endMins > b.startMins;
}

function lockSegments(itemId: string, date: string, startMins: number, endMins: number) {
  const segments: { id: string; minute: number }[] = [];
  for (let minute = Math.floor(startMins / 30) * 30; minute < endMins; minute += 30) {
    const id = `${itemId}_${date}_${minute}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    segments.push({ id, minute });
  }
  return segments;
}

export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user); });
  });
}

async function requireFirebaseUser(): Promise<FirebaseUser> {
  const user = await ensureFirebaseAuth();
  if (!user) throw new Error('يجب تسجيل الدخول أو التحقق من رقم الهاتف أولاً.');
  return user;
}

export async function fetchUserFromFirestore(uid: string): Promise<UserProfile | null> {
  const user = await ensureFirebaseAuth();
  if (!uid || !user || user.uid !== uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.error('User fetch failed:', err);
    return null;
  }
}
export async function fetchPublicUserProfile(uid:string):Promise<UserProfile|null>{
  await requireFirebaseUser(); const snap=await getDoc(doc(db,'users',uid)); return snap.exists()?({...(snap.data() as UserProfile),id:snap.id}):null;
}
export function subscribeUserProfile(uid:string,callback:(user:UserProfile)=>void){
  return onSnapshot(doc(db,'users',uid),snap=>{if(snap.exists())callback({...snap.data(),id:snap.id} as UserProfile)},err=>console.error('User profile listener failed:',err));
}

export async function findUserByPhoneFromFirestore(phone: string): Promise<UserProfile | null> {
  const user = await ensureFirebaseAuth();
  if (!user) return null;
  const profile = await fetchUserFromFirestore(user.uid);
  if (!profile) return null;
  const normalize = (v: string) => v.trim().replace(/\s+/g, '');
  return normalize(profile.phone) === normalize(phone) ? profile : null;
}

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) result[key] = removeUndefinedDeep(item);
    }
    return result as T;
  }
  return value;
}

export async function saveUserToFirestore(user: UserProfile): Promise<UserProfile> {
  const firebaseUser = await requireFirebaseUser();
  if (user.id && user.id !== firebaseUser.uid) throw new Error('لا يمكن حفظ بيانات مستخدم آخر.');
  const ref = doc(db, 'users', firebaseUser.uid);
  const existing = await getDoc(ref);
  if (existing.exists() && (existing.data() as UserProfile).accountType !== user.accountType) {
    throw new Error('لا يمكن تغيير نوع الحساب بعد إنشائه من الواجهة.');
  }
  const now = new Date().toISOString();
  const saved: UserProfile = {
    ...user,
    id: firebaseUser.uid,
    createdAt: user.createdAt || (existing.exists() ? (existing.data() as UserProfile).createdAt : now),
    updatedAt: now,
  };
  const firestoreSafeUser = removeUndefinedDeep(saved);
  try { await setDoc(ref, firestoreSafeUser, { merge: true }); return saved; }
  catch (err) { return handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`); }
}

export function subscribeBookings(uid: string, accountType: AccountType, callback: (bookings: Booking[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const ref = collection(db, 'bookings');
  const q = accountType === 'مدير' || accountType === 'مدير Admin'
    ? query(ref)
    : accountType === 'صاحب قاعة' || accountType === 'مزود خدمة'
      ? query(ref, where('targetOwnerId', '==', uid))
      : query(ref, where('requesterId', '==', uid));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Booking));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => { console.error('Bookings listener failed:', err); callback([]); });
}

export function subscribeAllUsers(callback: (users: UserProfile[]) => void) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    const users = snap.docs.map((d)=>({ ...d.data(), id:d.id } as UserProfile));
    users.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    callback(users);
  }, (err)=>{ console.error('Users listener failed:',err); callback([]); });
}

export async function setUserBlockedInFirestore(userId:string, blocked:boolean, admin:UserProfile, reason='مخالفة شروط استخدام ويدنك') {
  const user=await requireFirebaseUser();
  if (admin.id!==user.uid || !['مدير','مدير Admin'].includes(admin.accountType)) throw new Error('هذه الصلاحية للمدير فقط.');
  await updateDoc(doc(db,'users',userId), blocked ? {isBlocked:true,blockedAt:new Date().toISOString(),blockedBy:user.uid,blockReason:reason,updatedAt:new Date().toISOString()} : {isBlocked:false,blockedAt:null,blockedBy:null,blockReason:null,updatedAt:new Date().toISOString()});
}

export function subscribeAvailability(itemId: string, date: string, callback: (busyMinutes: number[]) => void) {
  if (!itemId || !date) { callback([]); return () => {}; }
  const q = query(collection(db, 'bookingLocks'), where('itemId', '==', itemId), where('date', '==', date));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => Number(d.data().minute)).filter(Number.isFinite));
  }, (err) => { console.error('Availability listener failed:', err); callback([]); });
}

export async function createBookingInFirestore(bookingData: {
  itemType: 'hall' | 'provider'; itemId: string; itemName: string; itemLocation: string; itemImage: string;
  date: string; timeSlot: string; startTime?: string; endTime?: string; guests?: number;
  totalPrice: number; depositAmount: number; notes: string; customerName: string; customerPhone: string;
  customerId: string; ownerId?: string; requesterAccountType?: string; paymentStatus?: Booking['paymentStatus']; paymentMethod?: Booking['paymentMethod']; paymentReference?: string;
}): Promise<Booking> {
  const user = await requireFirebaseUser();
  if (bookingData.customerId && bookingData.customerId !== user.uid) throw new Error('هوية صاحب الحجز غير متطابقة.');
  if (!bookingData.ownerId) throw new Error('تعذر تحديد مالك القاعة أو مزود الخدمة.');
  if (bookingData.ownerId === user.uid) throw new Error('لا يمكنك حجز قاعتك أو خدمتك الخاصة.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingData.date)) throw new Error('تاريخ الحجز غير صحيح.');

  const range = getSlotTimeRange(bookingData.timeSlot, bookingData.startTime, bookingData.endTime);
  const segments = lockSegments(bookingData.itemId, bookingData.date, range.startMins, range.endMins);
  for (const segment of segments) {
    const lock = await getDoc(doc(db, 'bookingLocks', segment.id));
    if (lock.exists()) throw new Error('هذا الموعد محجوز. يرجى اختيار وقت آخر.');
  }

  const ref = doc(collection(db, 'bookings'));
  const now = new Date().toISOString();
  const booking: Booking = {
    id: ref.id,
    bookingId: `WED-${Date.now().toString().slice(-8)}`,
    itemType: bookingData.itemType,
    itemId: bookingData.itemId,
    itemName: bookingData.itemName,
    itemLocation: bookingData.itemLocation,
    itemImage: bookingData.itemImage,
    date: bookingData.date,
    timeSlot: bookingData.timeSlot,
    startTime: range.start,
    endTime: range.end,
    ...(typeof bookingData.guests === 'number' && Number.isFinite(bookingData.guests) ? { guests: bookingData.guests } : {}),
    totalPrice: Number.isFinite(Number(bookingData.totalPrice)) ? Number(bookingData.totalPrice) : 0,
    depositAmount: Number.isFinite(Number(bookingData.depositAmount)) ? Number(bookingData.depositAmount) : 0,
    notes: bookingData.notes || '',
    status: 'قيد المراجعة',
    createdAt: now,
    updatedAt: now,
    customerName: bookingData.customerName,
    customerPhone: bookingData.customerPhone,
    customerId: user.uid,
    requesterId: user.uid,
    requesterName: bookingData.customerName,
    requesterPhone: bookingData.customerPhone,
    requesterAccountType: bookingData.requesterAccountType || 'زبون',
    ownerId: bookingData.ownerId,
    targetOwnerId: bookingData.ownerId,
    targetType: bookingData.itemType,
    hallId: bookingData.itemType === 'hall' ? bookingData.itemId : null,
    serviceProviderId: bookingData.itemType === 'provider' ? bookingData.itemId : null,
    paymentStatus: bookingData.paymentStatus || 'بانتظار الدفع',
    paymentMethod: bookingData.paymentMethod || 'الدفع لاحقاً',
    paymentReference: bookingData.paymentReference || '',
  };
  const firestoreSafeBooking = removeUndefinedDeep(booking);
  try { await setDoc(ref, firestoreSafeBooking); return booking; }
  catch (err) { return handleFirestoreError(err, OperationType.CREATE, `bookings/${ref.id}`); }
}

export async function acceptBookingInFirestore(bookingId: string): Promise<void> {
  const user = await requireFirebaseUser();
  const bookingRef = doc(db, 'bookings', bookingId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error('الحجز غير موجود.');
      const booking = snap.data() as Booking;
      const userSnap=await tx.get(doc(db,'users',user.uid));
      const role=userSnap.exists()?(userSnap.data() as UserProfile).accountType:'';
      const admin=role==='مدير'||role==='مدير Admin';
      if (booking.targetOwnerId !== user.uid && !admin) throw new Error('ليس لديك صلاحية قبول هذا الحجز.');
      if (booking.status !== 'قيد المراجعة' && booking.status !== 'pending') throw new Error('تم تغيير حالة الحجز سابقاً.');
      const range = getSlotTimeRange(booking.timeSlot, booking.startTime, booking.endTime);
      const segments = lockSegments(booking.itemId, booking.date, range.startMins, range.endMins);
      const lockRefs = segments.map((s) => doc(db, 'bookingLocks', s.id));
      const lockSnaps = await Promise.all(lockRefs.map((lockRef) => tx.get(lockRef)));
      if (lockSnaps.some((lockSnap) => lockSnap.exists())) throw new Error('الموعد أصبح محجوزاً بواسطة طلب آخر.');
      segments.forEach((segment, index) => tx.set(lockRefs[index], {
        bookingId,
        itemId: booking.itemId,
        date: booking.date,
        minute: segment.minute,
        targetOwnerId: booking.targetOwnerId,
        createdAt: new Date().toISOString(),
      }));
      tx.update(bookingRef, { status: 'مقبول', updatedAt: new Date().toISOString() });
    });
  } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`); }
}

export async function rejectBookingInFirestore(bookingId: string): Promise<void> {
  const user = await requireFirebaseUser();
  const bookingRef = doc(db, 'bookings', bookingId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error('الحجز غير موجود.');
      const booking = snap.data() as Booking;
      const userSnap=await tx.get(doc(db,'users',user.uid));
      const role=userSnap.exists()?(userSnap.data() as UserProfile).accountType:'';
      if (booking.targetOwnerId !== user.uid && role!=='مدير' && role!=='مدير Admin') throw new Error('ليس لديك صلاحية رفض هذا الحجز.');
      if (booking.status !== 'قيد المراجعة' && booking.status !== 'pending') throw new Error('تم تغيير حالة الحجز سابقاً.');
      tx.update(bookingRef, { status: 'مرفوض', updatedAt: new Date().toISOString() });
    });
  } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`); }
}

export async function cancelBookingInFirestore(bookingId: string): Promise<void> {
  const user = await requireFirebaseUser();
  const bookingRef = doc(db, 'bookings', bookingId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error('الحجز غير موجود.');
      const booking = snap.data() as Booking;
      if (booking.requesterId !== user.uid && booking.targetOwnerId !== user.uid) throw new Error('ليس لديك صلاحية إلغاء هذا الحجز.');
      const range = getSlotTimeRange(booking.timeSlot, booking.startTime, booking.endTime);
      const segments = lockSegments(booking.itemId, booking.date, range.startMins, range.endMins);
      const lockRefs = segments.map((segment) => doc(db, 'bookingLocks', segment.id));
      const lockSnaps = await Promise.all(lockRefs.map((lockRef) => tx.get(lockRef)));
      lockSnaps.forEach((lockSnap, index) => {
        if (lockSnap.exists() && lockSnap.data().bookingId === bookingId) tx.delete(lockRefs[index]);
      });
      tx.update(bookingRef, { status: 'ملغي', updatedAt: new Date().toISOString() });
    });
  } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`); }
}

export async function updateBookingStatusInFirestore(bookingId: string, status: BookingStatus): Promise<void> {
  if (status === 'مقبول' || status === 'accepted') return acceptBookingInFirestore(bookingId);
  if (status === 'مرفوض' || status === 'rejected') return rejectBookingInFirestore(bookingId);
  if (status === 'ملغي' || status === 'cancelled') return cancelBookingInFirestore(bookingId);
  await requireFirebaseUser();
  try { await updateDoc(doc(db, 'bookings', bookingId), { status, updatedAt: new Date().toISOString() }); }
  catch (err) { handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`); }
}

export function subscribeUserFavorites(uid: string, callback: (ids: string[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  return onSnapshot(collection(db, 'users', uid, 'favorites'),
    (snap) => callback(snap.docs.map((d) => d.id)),
    (err) => { console.error('Favorites listener failed:', err); callback([]); });
}

export async function toggleUserFavoriteInFirestore(uid: string, itemId: string, itemType: string) {
  const user = await requireFirebaseUser();
  if (uid !== user.uid) throw new Error('لا يمكنك تعديل مفضلة حساب آخر.');
  const ref = doc(db, 'users', uid, 'favorites', itemId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) await deleteDoc(ref);
    else await setDoc(ref, { itemId, itemType, createdAt: new Date().toISOString() });
  } catch (err) { handleFirestoreError(err, OperationType.WRITE, `users/${uid}/favorites/${itemId}`); }
}

export function subscribeComplaints(uid: string, accountType: AccountType, callback: (list: Complaint[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const ref = collection(db, 'complaints');
  const q = accountType === 'مدير' || accountType === 'مدير Admin' ? query(ref) : query(ref, where('userId', '==', uid));
  return onSnapshot(q,
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Complaint))),
    (err) => { console.error('Complaints listener failed:', err); callback([]); });
}

export async function createComplaintInFirestore(complaint: Omit<Complaint, 'id' | 'createdAt' | 'status'>): Promise<Complaint> {
  const user = await requireFirebaseUser();
  if (complaint.userId && complaint.userId !== user.uid) throw new Error('هوية الشكوى غير صحيحة.');
  const ref = doc(collection(db, 'complaints'));
  const saved: Complaint = { ...complaint, id: ref.id, userId: user.uid, status: 'قيد المراجعة', createdAt: new Date().toISOString() };
  try { await setDoc(ref, saved); return saved; }
  catch (err) { return handleFirestoreError(err, OperationType.CREATE, `complaints/${ref.id}`); }
}

export async function updateComplaintStatusInFirestore(id: string, status: Complaint['status'], adminReply?: string) {
  await requireFirebaseUser();
  try { await updateDoc(doc(db, 'complaints', id), { status, ...(adminReply ? { adminReply } : {}), updatedAt: new Date().toISOString() }); }
  catch (err) { handleFirestoreError(err, OperationType.UPDATE, `complaints/${id}`); }
}

export async function seedInitialDataIfEmpty(): Promise<void> { return; }

export function subscribeHalls(callback: (halls: Hall[]) => void) {
  return onSnapshot(collection(db, 'halls'),
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Hall))),
    (err) => { console.error('Hall listener failed:', err); callback([]); });
}

export function subscribeServiceProviders(callback: (providers: ServiceProvider[]) => void) {
  return onSnapshot(collection(db, 'serviceProviders'),
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as ServiceProvider))),
    (err) => { console.error('Provider listener failed:', err); callback([]); });
}

export function subscribePosts(callback: (posts: FeedPost[]) => void) {
  return onSnapshot(collection(db, 'posts'), (snap) => {
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FeedPost));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => { console.error('Posts listener failed:', err); callback([]); });
}

export async function createPostInFirestore(post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>): Promise<FeedPost> {
  const user = await requireFirebaseUser();
  if (post.authorId && post.authorId !== user.uid) throw new Error('لا يمكنك النشر باسم حساب آخر.');
  const ref = doc(collection(db, 'posts'));
  const saved: FeedPost = { ...post, id: ref.id, authorId: user.uid, likesCount: 0, sharesCount: 0, createdAt: new Date().toISOString() };
  const firestoreSafePost = removeUndefinedDeep(saved);
  try { await setDoc(ref, firestoreSafePost); return saved; }
  catch (err) { return handleFirestoreError(err, OperationType.CREATE, `posts/${ref.id}`); }
}

export async function deletePostInFirestore(postId: string): Promise<void> {
  const user = await requireFirebaseUser();
  const ref = doc(db, 'posts', postId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const post = snap.data() as FeedPost;
    if (post.authorId !== user.uid) throw new Error('لا يمكنك حذف منشور لا يعود إلى حسابك.');
    await deleteDoc(ref);
  } catch (err) { handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`); }
}
