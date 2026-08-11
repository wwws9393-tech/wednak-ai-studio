import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Hall, ServiceProvider, UserProfile, Booking } from '../types';
import { auth, fetchUserFromFirestore, saveUserToFirestore } from '../lib/firebase';

interface BookingModalProps {
  item: { type: 'hall'; data: Hall } | { type: 'provider'; data: ServiceProvider } | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  bookings?: Booking[];
  onLoginSuccess?: (userDoc: UserProfile) => void;
  onSubmitBooking: (bookingData: {
    itemType: 'hall' | 'provider';
    itemId: string;
    itemName: string;
    itemLocation: string;
    itemImage: string;
    date: string;
    timeSlot: string;
    startTime?: string;
    endTime?: string;
    guests?: number;
    totalPrice: number;
    depositAmount: number;
    notes: string;
    customerName: string;
    customerPhone: string;
    customerId: string;
    ownerId?: string;
    requesterAccountType?: string;
  }) => Promise<void> | void;
}

type Slot = { label: string; startTime: string; endTime: string };
const SLOTS: Slot[] = [
  { label: 'صباحي (10:00 ص - 2:00 ظ)', startTime: '10:00', endTime: '14:00' },
  { label: 'مسائي (6:00 م - 11:00 م)', startTime: '18:00', endTime: '23:00' },
  { label: 'ليلي سهرة (11:00 م - 2:00 ص)', startTime: '23:00', endTime: '02:00' },
];

function toEnglishDigits(value: string): string {
  const ar = '٠١٢٣٤٥٦٧٨٩';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return value.split('').map((c) => {
    const ai = ar.indexOf(c);
    if (ai >= 0) return String(ai);
    const fi = fa.indexOf(c);
    return fi >= 0 ? String(fi) : c;
  }).join('');
}

function normalizeIraqiPhone(raw: string): string {
  let value = toEnglishDigits(raw).trim().replace(/[\s()-]/g, '');
  if (value.startsWith('00964')) value = `+964${value.slice(5)}`;
  if (/^07\d{9}$/.test(value)) return `+964${value.slice(1)}`;
  if (/^7\d{9}$/.test(value)) return `+964${value}`;
  if (/^\+9647\d{9}$/.test(value)) return value;
  throw new Error('أدخل رقم موبايل عراقي صحيح مثل 07701234567.');
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  let aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  let bEnd = timeToMinutes(endB);
  if (aEnd <= aStart) aEnd += 1440;
  if (bEnd <= bStart) bEnd += 1440;
  return aStart < bEnd && aEnd > bStart;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  item,
  isOpen,
  onClose,
  currentUser,
  bookings = [],
  onLoginSuccess,
  onSubmitBooking,
}) => {
  const [bookingDate, setBookingDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(SLOTS[1].label);
  const [guestsCount, setGuestsCount] = useState(100);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [guestStep, setGuestStep] = useState<'details' | 'otp_form'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(currentUser.isGuest ? '' : currentUser.name || '');
    setCustomerPhone(currentUser.isGuest ? '' : currentUser.phone || '');
    setGuestStep('details');
    setOtpCode('');
    setErrorMsg('');
  }, [isOpen, currentUser.id, currentUser.isGuest, currentUser.name, currentUser.phone]);

  useEffect(() => () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }, []);

  const selectedSlot = useMemo(() => SLOTS.find((slot) => slot.label === timeSlot) || SLOTS[1], [timeSlot]);

  if (!isOpen || !item) return null;

  const isHall = item.type === 'hall';
  const hallData = isHall ? item.data as Hall : null;
  const providerData = !isHall ? item.data as ServiceProvider : null;
  const targetOwnerId = item.data.ownerId;
  const totalPrice = isHall ? hallData!.price : providerData!.priceStart;
  const depositAmount = isHall ? hallData!.deposit : Math.round(providerData!.priceStart * 0.2);
  const capacity = hallData?.capacity || 100;
  const effectiveGuests = Math.min(Math.max(guestsCount, 1), capacity);
  const isSelfBooking = !currentUser.isGuest && !!targetOwnerId && currentUser.id === targetOwnerId;

  const isSlotBooked = (slot: Slot) => bookings.some((booking) => {
    if (booking.itemId !== item.data.id || booking.date !== bookingDate) return false;
    if (booking.status !== 'مقبول' && booking.status !== 'accepted') return false;
    const bookingStart = booking.startTime || (booking.timeSlot.includes('صباحي') ? '10:00' : booking.timeSlot.includes('ليلي') ? '23:00' : '18:00');
    const bookingEnd = booking.endTime || (booking.timeSlot.includes('صباحي') ? '14:00' : booking.timeSlot.includes('ليلي') ? '02:00' : '23:00');
    return rangesOverlap(slot.startTime, slot.endTime, bookingStart, bookingEnd);
  });

  const isSelectedSlotBooked = isSlotBooked(selectedSlot);

  const submitBooking = async (user: UserProfile) => {
    if (!targetOwnerId) throw new Error('بيانات مالك القاعة أو مزود الخدمة غير مكتملة، لذلك لا يمكن إنشاء الحجز.');
    if (user.id === targetOwnerId) throw new Error('لا يمكنك حجز قاعتك أو خدمتك الخاصة.');
    if (isSelectedSlotBooked) throw new Error('هذا الموعد محجوز. اختر فترة أو تاريخاً آخر.');

    await onSubmitBooking({
      itemType: item.type,
      itemId: item.data.id,
      itemName: item.data.name,
      itemLocation: item.data.location,
      itemImage: isHall ? (hallData!.images[0] || '') : (providerData!.coverImage || ''),
      date: bookingDate,
      timeSlot,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      guests: isHall ? effectiveGuests : undefined,
      totalPrice,
      depositAmount,
      notes: notes.trim(),
      customerName: user.name || customerName.trim(),
      customerPhone: user.phone || customerPhone,
      customerId: user.id,
      ownerId: targetOwnerId,
      requesterAccountType: user.accountType,
    });
  };

  const handleAuthenticatedSubmit = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await submitBooking(currentUser);
      onClose();
    } catch (error) {
      console.error('Booking submit failed:', error);
      setErrorMsg(error instanceof Error ? error.message : 'تعذر حفظ الحجز.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendGuestOtp = async () => {
    if (!customerName.trim()) throw new Error('اكتب اسمك لإكمال الحجز.');
    const normalizedPhone = normalizeIraqiPhone(customerPhone);
    recaptchaRef.current?.clear();
    const verifier = new RecaptchaVerifier(auth, 'guest-booking-recaptcha', {
      size: 'invisible',
      callback: () => undefined,
      'expired-callback': () => setErrorMsg('انتهت صلاحية التحقق الأمني. أعد إرسال الرمز.'),
    });
    recaptchaRef.current = verifier;
    confirmationRef.current = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
    setCustomerPhone(normalizedPhone);
    setGuestStep('otp_form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!bookingDate) return setErrorMsg('اختر تاريخ الحجز.');
    if (isSelfBooking) return setErrorMsg('لا يمكنك حجز قاعتك أو خدمتك الخاصة.');
    if (isSelectedSlotBooked) return setErrorMsg('هذا الموعد محجوز.');

    if (!currentUser.isGuest) {
      await handleAuthenticatedSubmit();
      return;
    }

    setIsLoading(true);
    try {
      await sendGuestOtp();
    } catch (error) {
      console.error('Guest OTP send failed:', error);
      setErrorMsg(error instanceof Error ? error.message : 'تعذر إرسال رمز التحقق.');
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyGuestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return setErrorMsg('أعد إرسال رمز التحقق أولاً.');
    const code = toEnglishDigits(otpCode);
    if (!/^\d{6}$/.test(code)) return setErrorMsg('رمز التحقق يجب أن يتكون من 6 أرقام.');

    setIsLoading(true);
    setErrorMsg('');
    try {
      const credential = await confirmationRef.current.confirm(code);
      let userDoc = await fetchUserFromFirestore(credential.user.uid);
      if (!userDoc) {
        userDoc = await saveUserToFirestore({
          id: credential.user.uid,
          name: customerName.trim(),
          phone: customerPhone,
          email: '',
          city: currentUser.city || 'بغداد',
          accountType: 'زبون',
          isGuest: false,
          isGuestConverted: true,
          profileCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      onLoginSuccess?.(userDoc);
      await submitBooking(userDoc);
      onClose();
    } catch (error) {
      console.error('Guest OTP verification/booking failed:', error);
      setErrorMsg(error instanceof Error ? error.message : 'تعذر التحقق أو إنشاء الحجز.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="booking-modal-overlay">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-100 my-auto">
        <div id="guest-booking-recaptcha" />
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-base font-bold">{currentUser.isGuest ? 'أكمل حجزك كضيف' : 'طلب حجز جديد'}</h2>
              <p className="text-xs text-amber-200">{item.data.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSelfBooking && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" /> لا يمكنك حجز قاعتك أو خدمتك بنفسك.
          </div>
        )}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {guestStep === 'details' ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
              <div><span className="text-gray-600 block">العربون</span><span className="text-base font-black text-amber-900">{depositAmount.toLocaleString()} د.ع</span></div>
              <div className="text-left"><span className="text-gray-600 block">السعر</span><span className="text-sm font-bold text-emerald-800">{totalPrice.toLocaleString()} د.ع</span></div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-700" /> تاريخ المناسبة</label>
              <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 rounded-xl border text-xs font-semibold" required />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-700" /> الفترة الزمنية</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SLOTS.map((slot) => {
                  const booked = isSlotBooked(slot);
                  const selected = timeSlot === slot.label;
                  return (
                    <button key={slot.label} type="button" disabled={booked} onClick={() => setTimeSlot(slot.label)} className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border ${booked ? 'bg-rose-50 text-rose-800 border-rose-300 cursor-not-allowed' : selected ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {slot.label}<span className="block text-[9px]">{booked ? 'محجوز' : 'متاح'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isHall && hallData && (
              <div>
                <div className="flex justify-between mb-1"><label className="text-xs font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-700" /> عدد الضيوف</label><span className="text-xs font-black">{effectiveGuests}</span></div>
                <input type="range" min={1} max={hallData.capacity} step={10} value={effectiveGuests} onChange={(e) => setGuestsCount(Number(e.target.value))} className="w-full accent-emerald-700" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-bold block mb-1"><User className="inline w-3.5 h-3.5 ml-1" />الاسم</label><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs" required /></div>
              <div><label className="text-xs font-bold block mb-1"><Phone className="inline w-3.5 h-3.5 ml-1" />رقم الهاتف</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07701234567" className="w-full px-3 py-2 rounded-xl border text-xs text-left dir-ltr" required /></div>
            </div>

            <div><label className="text-xs font-bold block mb-1"><FileText className="inline w-3.5 h-3.5 ml-1" />ملاحظات (اختياري)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs h-16 resize-none" /></div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              {currentUser.isGuest ? 'سنرسل OTP حقيقي لربط الحجز بهويتك وحفظه بأمان.' : 'الحجز سيُحفظ في حسابك ويظهر فقط لك وللطرف المستلم.'}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600">إلغاء</button>
              <button type="submit" disabled={isSelfBooking || isLoading || isSelectedSlotBooked} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 disabled:bg-gray-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> {isLoading ? 'جاري التنفيذ...' : currentUser.isGuest ? 'إرسال OTP والمتابعة' : 'إرسال طلب الحجز'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyGuestOtp} className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5"><KeyRound className="w-4 h-4" /> أدخل رمز التحقق الحقيقي</div>
              <p className="text-[11px] text-gray-600 mt-1">أرسلنا الرمز إلى <span className="font-mono font-bold">{customerPhone}</span></p>
            </div>
            <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="w-full px-3 py-2.5 rounded-xl border text-center text-xl font-mono font-bold tracking-widest" required />
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => { setGuestStep('details'); setOtpCode(''); confirmationRef.current = null; }} className="text-xs font-bold text-gray-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> تغيير الرقم</button>
              <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl disabled:opacity-50">{isLoading ? 'جاري التحقق...' : 'تأكيد وإنشاء الحجز'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
