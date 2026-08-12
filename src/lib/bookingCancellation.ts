import { doc, runTransaction } from 'firebase/firestore';
import { auth, db, ensureFirebaseAuth, getSlotTimeRange } from './firebase';
import { Booking, UserProfile } from '../types';

function lockSegments(itemId: string, date: string, startMins: number, endMins: number) {
  const segments: { id: string; minute: number }[] = [];
  for (let minute = Math.floor(startMins / 30) * 30; minute < endMins; minute += 30) {
    const id = `${itemId}_${date}_${minute}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    segments.push({ id, minute });
  }
  return segments;
}

export async function cancelBookingWithActorInFirestore(bookingId: string, actor: UserProfile): Promise<void> {
  const firebaseUser = auth.currentUser || await ensureFirebaseAuth();
  if (!firebaseUser) throw new Error('يجب تسجيل الدخول أولاً.');
  if (actor.id !== firebaseUser.uid) throw new Error('هوية الحساب غير متطابقة.');

  const bookingRef = doc(db, 'bookings', bookingId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists()) throw new Error('الحجز غير موجود.');
    const booking = snap.data() as Booking;
    if (booking.requesterId !== firebaseUser.uid && booking.targetOwnerId !== firebaseUser.uid) {
      throw new Error('ليس لديك صلاحية إلغاء هذا الحجز.');
    }
    if (booking.status === 'ملغي' || booking.status === 'cancelled') return;

    const range = getSlotTimeRange(booking.timeSlot, booking.startTime, booking.endTime);
    const segments = lockSegments(booking.itemId, booking.date, range.startMins, range.endMins);
    const lockRefs = segments.map((segment) => doc(db, 'bookingLocks', segment.id));
    const lockSnaps = await Promise.all(lockRefs.map((lockRef) => tx.get(lockRef)));
    lockSnaps.forEach((lockSnap, index) => {
      if (lockSnap.exists() && lockSnap.data().bookingId === bookingId) tx.delete(lockRefs[index]);
    });

    const cancelledByRole = actor.accountType === 'صاحب قاعة'
      ? 'صاحب قاعة'
      : actor.accountType === 'مزود خدمة'
        ? 'مزود خدمة'
        : actor.accountType === 'مدير' || actor.accountType === 'مدير Admin'
          ? 'مدير'
          : 'زبون';

    tx.update(bookingRef, {
      status: 'ملغي',
      updatedAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString(),
      cancelledById: firebaseUser.uid,
      cancelledByRole,
      cancelledByName: actor.name || (cancelledByRole === 'زبون' ? booking.customerName : booking.itemName),
    });
  });
}
