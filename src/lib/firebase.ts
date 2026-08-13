import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
  writeBatch,
  arrayUnion,
  Timestamp,
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

function dateValueMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

function newestFirst(a: { createdAt?: unknown }, b: { createdAt?: unknown }): number {
  return dateValueMillis(b.createdAt) - dateValueMillis(a.createdAt);
}

function dateValueIso(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const millis = dateValueMillis(value);
  return millis ? new Date(millis).toISOString() : '';
}

function normalizeBookingDates(booking: Booking): Booking {
  const raw = booking as Booking & { date?: unknown; createdAt?: unknown; updatedAt?: unknown; cancelledAt?: unknown; paidAt?: unknown };
  const normalizedDate = typeof raw.date === 'string' ? raw.date : dateValueIso(raw.date).slice(0, 10);
  return {
    ...booking,
    date: normalizedDate,
    createdAt: dateValueIso(raw.createdAt),
    updatedAt: dateValueIso(raw.updatedAt) || undefined,
    cancelledAt: dateValueIso(raw.cancelledAt) || undefined,
    paidAt: dateValueIso(raw.paidAt) || undefined,
  };
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
  let startMins = parseTimeToMinutes(start);
  if (timeSlot.includes('ليلي') && startMins < 360) startMins += 1440;
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

const IRAQ_TIME_ZONE = 'Asia/Baghdad';
const IRAQ_UTC_OFFSET = '+03:00';

export function getIraqTodayDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IRAQ_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getIraqDateAfterDays(days: number, now = new Date()): string {
  const [year, month, day] = getIraqTodayDate(now).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getIraqBookingStartDate(date: string, time: string, dayOffset = 0): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('تاريخ أو وقت الحجز غير صحيح.');
  }
  const [year, month, day] = date.split('-').map(Number);
  const adjustedDate = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const adjustedDateKey = `${adjustedDate.getUTCFullYear()}-${String(adjustedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(adjustedDate.getUTCDate()).padStart(2, '0')}`;
  const value = new Date(`${adjustedDateKey}T${time}:00${IRAQ_UTC_OFFSET}`);
  if (!Number.isFinite(value.getTime())) throw new Error('تاريخ أو وقت الحجز غير صحيح.');
  return value;
}

export function isIraqBookingStartInFuture(date: string, time: string, now = Date.now(), dayOffset = 0): boolean {
  return getIraqBookingStartDate(date, time, dayOffset).getTime() > now;
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

export function subscribeBookings(uid: string, accountType: AccountType, callback: (bookings: Booking[]) => void, onError?: (message:string)=>void) {
  if (!uid) { callback([]); return () => {}; }
  const ref = collection(db, 'bookings');
  const q = accountType === 'مدير' || accountType === 'مدير Admin'
    ? query(ref)
    : accountType === 'صاحب قاعة' || accountType === 'مزود خدمة'
      ? query(ref, where('targetOwnerId', '==', uid))
      : query(ref, where('requesterId', '==', uid));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => normalizeBookingDates({ ...d.data(), id: d.id } as Booking));
    list.sort(newestFirst);
    callback(list);
  }, (err) => { console.error('Bookings listener failed:', err); onError?.(err.message); });
}

export function subscribeAllUsers(callback: (users: UserProfile[]) => void, onError?: (message:string)=>void) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    const users = snap.docs.map((d)=>({ ...d.data(), id:d.id } as UserProfile));
    users.sort(newestFirst);
    callback(users);
  }, (err)=>{ console.error('Users listener failed:',err); onError?.(err.message); });
}

export async function setUserBlockedInFirestore(userId:string, blocked:boolean, admin:UserProfile, reason='مخالفة شروط استخدام ويدنك') {
  const user=await requireFirebaseUser();
  if (admin.id!==user.uid || !['مدير','مدير Admin'].includes(admin.accountType)) throw new Error('هذه الصلاحية للمدير فقط.');
  await updateDoc(doc(db,'users',userId), blocked ? {isBlocked:true,blockedAt:new Date().toISOString(),blockedBy:user.uid,blockReason:reason,updatedAt:new Date().toISOString()} : {isBlocked:false,blockedAt:null,blockedBy:null,blockReason:null,updatedAt:new Date().toISOString()});
}

export async function deleteUserAndDataInFirestore(userId:string, admin:UserProfile) {
  const user=await requireFirebaseUser();
  if (admin.id!==user.uid || !['مدير','مدير Admin'].includes(admin.accountType)) throw new Error('هذه الصلاحية للمدير فقط.');
  if (!userId || userId===user.uid) throw new Error('لا يمكن حذف حساب المدير الحالي.');
  const removeUser=httpsCallable<{userId:string},{success:boolean}>(getFunctions(app,'us-central1'),'adminDeleteUser');
  try {
    const result=await removeUser({userId});
    if(!result.data.success)throw new Error('لم يؤكد الخادم عملية الحذف.');
    return;
  } catch(error) {
    console.warn('Admin function unavailable; using Firestore-only deletion:',error);
  }
  await setDoc(doc(db,'deletedUsers',userId),{userId,deletedAt:new Date().toISOString(),deletedBy:user.uid},{merge:true});
  const targets:[string,string][]=[['halls','ownerId'],['serviceProviders','ownerId'],['posts','authorId'],['offers','ownerId'],['complaints','userId'],['bookings','requesterId'],['bookings','customerId'],['bookings','targetOwnerId'],['bookings','ownerId']];
  const refs=new Map<string,ReturnType<typeof doc>>();
  for(const [collectionName,field] of targets){
    const snap=await getDocs(query(collection(db,collectionName),where(field,'==',userId)));
    snap.docs.forEach(item=>refs.set(item.ref.path,item.ref));
  }
  const favorites=await getDocs(collection(db,'users',userId,'favorites'));
  favorites.docs.forEach(item=>refs.set(item.ref.path,item.ref));
  refs.set(`users/${userId}`,doc(db,'users',userId));
  const allRefs=Array.from(refs.values());
  for(let index=0;index<allRefs.length;index+=450){
    const batch=writeBatch(db);
    allRefs.slice(index,index+450).forEach(ref=>batch.delete(ref));
    await batch.commit();
  }
}

export function subscribeAvailability(itemId: string, date: string, callback: (busyMinutes: number[]) => void) {
  if (!itemId || !date) { callback([]); return () => {}; }
  const q = query(collection(db, 'bookingLocks'), where('itemId', '==', itemId), where('date', '==', date));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => Number(d.data().minute)).filter(Number.isFinite));
  }, (err) => { console.error('Availability listener failed:', err); callback([]); });
}

export interface PendingAvailabilityRange {
  bookingId: string;
  startMinute: number;
  endMinute: number;
}

export interface BookingAvailabilitySnapshot {
  acceptedMinutes: number[];
  pendingRanges: PendingAvailabilityRange[];
}

export function subscribeBookingAvailability(
  itemId: string,
  date: string,
  callback: (availability: BookingAvailabilitySnapshot) => void
) {
  if (!itemId || !date) {
    callback({ acceptedMinutes: [], pendingRanges: [] });
    return () => {};
  }

  let acceptedMinutes: number[] = [];
  let pendingRanges: PendingAvailabilityRange[] = [];
  const emit = () => callback({ acceptedMinutes: [...acceptedMinutes], pendingRanges: [...pendingRanges] });
  const locksQuery = query(collection(db, 'bookingLocks'), where('itemId', '==', itemId), where('date', '==', date));
  const pendingQuery = query(collection(db, 'bookingAvailability'), where('itemId', '==', itemId), where('date', '==', date));

  const unsubscribeLocks = onSnapshot(locksQuery, (snap) => {
    acceptedMinutes = snap.docs.map((item) => Number(item.data().minute)).filter(Number.isFinite);
    emit();
  }, (error) => {
    console.error('Accepted availability listener failed:', error);
    acceptedMinutes = [];
    emit();
  });

  const unsubscribePending = onSnapshot(pendingQuery, (snap) => {
    pendingRanges = snap.docs.flatMap((item) => {
      const data = item.data();
      const startMinute = Number(data.startMinute);
      const endMinute = Number(data.endMinute);
      if (!pendingStatusValue(data.status) || !Number.isFinite(startMinute) || !Number.isFinite(endMinute) || endMinute <= startMinute) return [];
      return [{ bookingId: String(data.bookingId || item.id), startMinute, endMinute }];
    });
    emit();
  }, (error) => {
    console.error('Pending availability listener failed:', error);
    pendingRanges = [];
    emit();
  });

  return () => {
    unsubscribeLocks();
    unsubscribePending();
  };
}

function pendingStatusValue(status: unknown): boolean {
  return status === 'قيد المراجعة' || status === 'pending';
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
  const startsAt = getIraqBookingStartDate(bookingData.date, range.start, Math.floor(range.startMins / 1440));
  if (startsAt.getTime() <= Date.now()) throw new Error('لا يمكن حجز تاريخ أو وقت مضى. اختر موعداً لاحقاً.');
  const segments = lockSegments(bookingData.itemId, bookingData.date, range.startMins, range.endMins);

  const ref = doc(collection(db, 'bookings'));
  const availabilityRef = doc(db, 'bookingAvailability', ref.id);
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
  const firestoreSafeBooking = {
    ...removeUndefinedDeep(booking),
    startsAt: Timestamp.fromDate(startsAt),
  };
  try {
    await runTransaction(db, async (tx) => {
      const lockRefs = segments.map((segment) => doc(db, 'bookingLocks', segment.id));
      const lockSnaps = await Promise.all(lockRefs.map((lockRef) => tx.get(lockRef)));
      if (lockSnaps.some((lockSnap) => lockSnap.exists())) {
        throw new Error('هذا الموعد محجوز بحجز مقبول. يرجى اختيار وقت آخر.');
      }
      tx.set(ref, firestoreSafeBooking);
      tx.set(availabilityRef, {
        bookingId: ref.id,
        itemId: bookingData.itemId,
        date: bookingData.date,
        startMinute: range.startMins,
        endMinute: range.endMins,
        status: 'قيد المراجعة',
        createdAt: now,
      });
    });
    return booking;
  }
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
      const storedStartsAt = dateValueMillis((booking as Booking & { startsAt?: unknown }).startsAt);
      const startsAt = storedStartsAt || getIraqBookingStartDate(booking.date, range.start, Math.floor(range.startMins / 1440)).getTime();
      if (startsAt <= Date.now()) throw new Error('انتهى موعد هذا الطلب ولا يمكن قبوله. اطلب من الزبون اختيار موعد جديد.');
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
      tx.delete(doc(db, 'bookingAvailability', bookingId));
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
      tx.delete(doc(db, 'bookingAvailability', bookingId));
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
      tx.delete(doc(db, 'bookingAvailability', bookingId));
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

export function subscribeNotificationReadIds(
  uid: string,
  callback: (ids: string[]) => void,
  onError?: (message: string) => void
) {
  if (!uid) { callback([]); return () => {}; }
  const stateRef = doc(db, 'users', uid, 'notificationState', 'readState');
  return onSnapshot(stateRef,
    (snap) => {
      const ids = snap.exists() && Array.isArray(snap.data().readIds) ? snap.data().readIds : [];
      callback(Array.from(new Set(ids.filter((id: unknown): id is string => typeof id === 'string'))));
    },
    (err) => {
      console.error('Notification read-state listener failed:', err);
      onError?.(err instanceof Error ? err.message : String(err));
    });
}

export async function markNotificationReadInFirestore(uid: string, notificationId: string): Promise<void> {
  const user = await requireFirebaseUser();
  if (uid !== user.uid) throw new Error('لا يمكنك تعديل إشعارات حساب آخر.');
  if (!notificationId) return;
  const stateRef = doc(db, 'users', uid, 'notificationState', 'readState');
  try {
    await setDoc(stateRef, {
      readIds: arrayUnion(notificationId),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/notificationState/readState`);
  }
}

export async function markAllNotificationsReadInFirestore(uid: string, notificationIds: string[]): Promise<void> {
  const user = await requireFirebaseUser();
  if (uid !== user.uid) throw new Error('لا يمكنك تعديل إشعارات حساب آخر.');
  const cleanIds = Array.from(new Set(notificationIds.filter(Boolean))).slice(-500);
  const stateRef = doc(db, 'users', uid, 'notificationState', 'readState');
  try {
    await setDoc(stateRef, {
      readIds: cleanIds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/notificationState/readState`);
  }
}

export async function mergeLegacyNotificationReadIds(uid: string, notificationIds: string[]): Promise<void> {
  const user = await requireFirebaseUser();
  if (uid !== user.uid || notificationIds.length === 0) return;
  const stateRef = doc(db, 'users', uid, 'notificationState', 'readState');
  const cleanIds = Array.from(new Set(notificationIds.filter(Boolean))).slice(-500);
  try {
    for (let index = 0; index < cleanIds.length; index += 50) {
      await setDoc(stateRef, {
        readIds: arrayUnion(...cleanIds.slice(index, index + 50)),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/notificationState/readState`);
  }
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

export async function updateHallInFirestore(updatedHall: Hall): Promise<void> {
  const user = await requireFirebaseUser();
  const hallRef = doc(db, 'halls', updatedHall.id);
  const hallSnap = await getDoc(hallRef);
  const existingHall = hallSnap.exists() ? hallSnap.data() as Partial<Hall> : null;

  if (existingHall?.ownerId && existingHall.ownerId !== user.uid) {
    throw new Error('لا تملك صلاحية تعديل هذه القاعة.');
  }
  if (updatedHall.ownerId && updatedHall.ownerId !== user.uid && existingHall?.ownerId !== user.uid) {
    throw new Error('لا تملك صلاحية تعديل هذه القاعة.');
  }

  const savedHall = removeUndefinedDeep({
    ...updatedHall,
    ownerId: user.uid,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(hallRef, savedHall, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `halls/${updatedHall.id}`);
  }
}

export function subscribeServiceProviders(callback: (providers: ServiceProvider[]) => void) {
  return onSnapshot(collection(db, 'serviceProviders'),
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as ServiceProvider))),
    (err) => { console.error('Provider listener failed:', err); callback([]); });
}

export function subscribePosts(callback: (posts: FeedPost[]) => void) {
  return onSnapshot(collection(db, 'posts'), (snap) => {
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FeedPost));
    list.sort(newestFirst);
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

export async function updatePostDescriptionInFirestore(postId:string,caption:string):Promise<void>{
  const user=await requireFirebaseUser();const ref=doc(db,'posts',postId);const snap=await getDoc(ref);
  if(!snap.exists())throw new Error('العمل غير موجود.');
  if((snap.data() as FeedPost).authorId!==user.uid)throw new Error('لا يمكنك تعديل عمل لا تملكه.');
  await updateDoc(ref,{caption:caption.trim(),updatedAt:new Date().toISOString()});
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
