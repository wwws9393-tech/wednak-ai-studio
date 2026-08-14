import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Calendar, Clock, Users, Phone, User, FileText, CheckCircle, AlertTriangle, ShieldCheck, AlertCircle, KeyRound, ArrowRight, CreditCard, WalletCards } from 'lucide-react';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Hall, ServiceProvider, UserProfile, Booking } from '../types';
import {
  assertBookingSelectionAvailable,
  auth,
  fetchUserFromFirestore,
  getIraqDateAfterDays,
  getIraqTodayDate,
  isIraqDateInPast,
  isIraqBookingStartInFuture,
  PendingAvailabilityRange,
  saveUserToFirestore,
  subscribeBookingAvailability,
} from '../lib/firebase';
import { WednakLogo } from './WednakLogo';
import { formatAreaWithCity } from '../lib/location';

interface BookingModalProps {
  item: { type: 'hall'; data: Hall } | { type: 'provider'; data: ServiceProvider } | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  bookings?: Booking[];
  onLoginSuccess?: (userDoc: UserProfile) => void;
  onSubmitBooking: (bookingData: {
    itemType: 'hall' | 'provider'; itemId: string; itemName: string; itemLocation: string; itemImage: string;
    date: string; timeSlot: string; startTime?: string; endTime?: string; guests?: number;
    totalPrice: number; depositAmount: number; notes: string; customerName: string; customerPhone: string;
    customerId: string; ownerId?: string; requesterAccountType?: string; paymentStatus?: Booking['paymentStatus']; paymentMethod?: Booking['paymentMethod']; paymentReference?: string;
  }) => Promise<void> | void;
}

type PeriodKey = 'morning' | 'evening' | 'night';
type Period = { key: PeriodKey; label: string; start: number; end: number };
const PERIODS: Period[] = [
  { key: 'morning', label: 'صباحي', start: 10, end: 14 },
  { key: 'evening', label: 'مسائي', start: 18, end: 23 },
  { key: 'night', label: 'ليلي', start: 23, end: 26 },
];

function hourToTime(hour: number): string {
  const normalized = hour % 24;
  return `${String(normalized).padStart(2, '0')}:00`;
}

function hourLabel(hour: number): string {
  const h = hour % 24;
  const suffix = h < 12 ? 'ص' : 'م';
  const display = h % 12 || 12;
  return `${display}:00 ${suffix}`;
}

function minuteLabel(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour < 12 ? 'ص' : 'م';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function mergeBusyMinutes(minutes: number[]): Array<{ start: number; end: number }> {
  const sorted = Array.from(new Set(minutes.filter(Number.isFinite))).sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let end = start + 30;

  for (const minute of sorted.slice(1)) {
    if (minute === end) {
      end += 30;
      continue;
    }
    ranges.push({ start, end });
    start = minute;
    end = minute + 30;
  }

  ranges.push({ start, end });
  return ranges;
}

function minutesForRange(startTime: string, endTime: string, period?: PeriodKey): number[] {
  const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
  let start = toMinutes(startTime);
  if (period === 'night' && start < 360) start += 1440;
  let end = toMinutes(endTime);
  if (end <= start) end += 1440;
  const result: number[] = [];
  for (let minute = Math.floor(start / 30) * 30; minute < end; minute += 30) result.push(minute);
  return result;
}

function toEnglishDigits(value: string): string {
  const ar = '٠١٢٣٤٥٦٧٨٩', fa = '۰۱۲۳۴۵۶۷۸۹';
  return value.split('').map((c) => {
    const a = ar.indexOf(c); if (a >= 0) return String(a);
    const f = fa.indexOf(c); return f >= 0 ? String(f) : c;
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


export const BookingModal: React.FC<BookingModalProps> = ({ item, isOpen, onClose, currentUser, onLoginSuccess, onSubmitBooking }) => {
  const [bookingDate, setBookingDate] = useState(() => getIraqDateAfterDays(7));
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('evening');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestsCount, setGuestsCount] = useState(100);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [guestStep, setGuestStep] = useState<'details' | 'otp_form' | 'payment'>('details');
  const [bookingUser,setBookingUser]=useState<UserProfile|null>(null);
  const [paymentMethod,setPaymentMethod]=useState<Booking['paymentMethod']>('زين كاش');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedMinutes, setAcceptedMinutes] = useState<number[]>([]);
  const [pendingRanges, setPendingRanges] = useState<PendingAvailabilityRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(currentUser.isGuest ? '' : currentUser.name || '');
    setCustomerPhone(currentUser.isGuest ? '' : currentUser.phone || '');
    setGuestStep('details'); setOtpCode(''); setErrorMsg('');
  }, [isOpen, currentUser.id, currentUser.isGuest, currentUser.name, currentUser.phone]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !item?.data.id || !bookingDate) {
      setAcceptedMinutes([]);
      setPendingRanges([]);
      return;
    }
    setAvailabilityLoading(true);
    const unsubscribe = subscribeBookingAvailability(item.data.id, bookingDate, (availability) => {
      setAcceptedMinutes(availability.acceptedMinutes);
      setPendingRanges(availability.pendingRanges);
      setAvailabilityLoading(false);
    });
    return unsubscribe;
  }, [isOpen, item?.data.id, bookingDate]);

  useEffect(() => {
    if (!isOpen) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const disposeRecaptcha = () => {
    try { recaptchaRef.current?.clear(); } catch (error) { console.warn('Guest reCAPTCHA clear skipped:', error); }
    recaptchaRef.current = null;
    recaptchaContainerRef.current?.remove();
    recaptchaContainerRef.current = null;
  };

  useEffect(() => () => disposeRecaptcha(), []);

  const selectedPeriodConfig = useMemo(() => PERIODS.find((p) => p.key === selectedPeriod) || PERIODS[1], [selectedPeriod]);
  const acceptedSet = useMemo(() => new Set(acceptedMinutes), [acceptedMinutes]);
  const acceptedRanges = useMemo(() => mergeBusyMinutes(acceptedMinutes), [acceptedMinutes]);
  const visiblePendingRanges = useMemo(() => {
    const ranges = new Map<string, { startMinute: number; endMinute: number; count: number }>();
    pendingRanges.forEach((range) => {
      const key = `${range.startMinute}-${range.endMinute}`;
      const current = ranges.get(key);
      ranges.set(key, { startMinute: range.startMinute, endMinute: range.endMinute, count: (current?.count || 0) + 1 });
    });
    return Array.from(ranges.values()).sort((a, b) => a.startMinute - b.startMinute);
  }, [pendingRanges]);
  const selectedMinutes = useMemo(() => minutesForRange(startTime, endTime, selectedPeriod), [startTime, endTime, selectedPeriod]);
  const selectedBooked = selectedMinutes.some((minute) => acceptedSet.has(minute));
  const selectedPending = pendingRanges.some((range) => selectedMinutes.some((minute) => minute >= range.startMinute && minute < range.endMinute));
  const timeSlot = `${selectedPeriodConfig.label} (${hourLabel(Number(startTime.slice(0, 2)))} - ${hourLabel(Number(endTime.slice(0, 2)) || 24)})`;
  const selectedStartHour = Number(startTime.slice(0, 2)) + (selectedPeriod === 'night' && Number(startTime.slice(0, 2)) < 6 ? 24 : 0);
  const isFutureStartHour = (hour: number) => isIraqBookingStartInFuture(bookingDate, hourToTime(hour), nowMs, Math.floor(hour / 24));
  const startOptionsForPeriod = (period: Period) => Array.from({ length: period.end - period.start }, (_, i) => period.start + i).filter(isFutureStartHour);
  const startOptions = startOptionsForPeriod(selectedPeriodConfig);
  const endOptions = Array.from({ length: selectedPeriodConfig.end - selectedStartHour }, (_, i) => selectedStartHour + i + 1);
  const selectedDatePast = isIraqDateInPast(bookingDate, new Date(nowMs));
  const selectedPast = selectedDatePast || !isFutureStartHour(selectedStartHour);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    try { input.showPicker?.(); } catch { /* Native picker is already opening. */ }
  };

  const changeBookingDate = (value: string) => {
    const today = getIraqTodayDate();
    if (!value) {
      setErrorMsg('اختر تاريخ الحجز.');
      return;
    }
    setBookingDate(value);
    if (value < today) {
      setErrorMsg('الأيام السابقة مقفلة. اختر اليوم أو تاريخاً لاحقاً.');
      return;
    }
    setErrorMsg('');
  };

  useEffect(() => {
    if (!isOpen || !bookingDate) return;
    const currentPeriod = PERIODS.find((period) => period.key === selectedPeriod) || PERIODS[1];
    const availableHours = startOptionsForPeriod(currentPeriod);
    if (availableHours.includes(selectedStartHour)) return;
    const nextPeriod = availableHours.length > 0
      ? currentPeriod
      : PERIODS.find((period) => startOptionsForPeriod(period).length > 0);
    if (!nextPeriod) return;
    const nextStart = startOptionsForPeriod(nextPeriod)[0];
    setSelectedPeriod(nextPeriod.key);
    setStartTime(hourToTime(nextStart));
    setEndTime(hourToTime(nextPeriod.end));
  }, [bookingDate, isOpen, nowMs, selectedPeriod, selectedStartHour]);

  const choosePeriod = (period: Period) => {
    const availableHours = startOptionsForPeriod(period);
    if (availableHours.length === 0) return;
    setSelectedPeriod(period.key);
    setStartTime(hourToTime(availableHours[0]));
    setEndTime(hourToTime(period.end));
  };

  if (!isOpen || !item) return null;
  const isHall = item.type === 'hall';
  const hall = isHall ? item.data as Hall : null;
  const provider = !isHall ? item.data as ServiceProvider : null;
  const targetOwnerId = item.data.ownerId;
  const totalPrice = isHall ? hall!.price : provider!.priceStart;
  const depositAmount = isHall ? hall!.deposit : Math.round(provider!.priceStart * 0.2);
  const effectiveGuests = Math.min(Math.max(guestsCount, 1), hall?.capacity || 100);
  const isSelfBooking = !currentUser.isGuest && !!targetOwnerId && currentUser.id === targetOwnerId;

  const submitBooking = async (user: UserProfile) => {
    if (!targetOwnerId) throw new Error('بيانات مالك القاعة أو مزود الخدمة غير مكتملة.');
    if (user.id === targetOwnerId) throw new Error('لا يمكنك حجز قاعتك أو خدمتك الخاصة.');
    if (isIraqDateInPast(bookingDate)) throw new Error('لا يمكن الحجز في يوم سابق. اختر اليوم أو تاريخاً لاحقاً.');
    if (!isIraqBookingStartInFuture(bookingDate, startTime, Date.now(), Math.floor(selectedStartHour / 24))) throw new Error('هذه الفترة انتهت حسب توقيت بغداد. اختر فترة لاحقة.');
    if (selectedBooked) throw new Error('هذا الموعد محجوز. اختر فترة أو تاريخاً آخر.');
    await assertBookingSelectionAvailable(item.data.id, bookingDate, timeSlot, startTime, endTime);
    await onSubmitBooking({
      itemType: item.type, itemId: item.data.id, itemName: item.data.name, itemLocation: isHall ? formatAreaWithCity(hall!.location, hall!.city) : item.data.location,
      itemImage: isHall ? (hall!.coverImage || hall!.images[0] || '') : (provider!.avatar || provider!.coverImage || ''),
      date: bookingDate, timeSlot, startTime, endTime,
      guests: isHall ? effectiveGuests : undefined, totalPrice, depositAmount, notes: notes.trim(),
      customerName: user.name || customerName.trim(), customerPhone: user.phone || customerPhone,
      customerId: user.id, ownerId: targetOwnerId, requesterAccountType: user.accountType,
      paymentStatus: 'بانتظار الدفع', paymentMethod, paymentReference:`PAY-${Date.now().toString().slice(-8)}`,
    });
  };

  const sendGuestOtp = async () => {
    if (!customerName.trim()) throw new Error('اكتب اسمك لإكمال الحجز.');
    const phone = normalizeIraqiPhone(customerPhone);
    disposeRecaptcha();
    const container = document.createElement('div');
    container.id = `guest-booking-recaptcha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    document.body.appendChild(container);
    recaptchaContainerRef.current = container;
    const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible', callback: () => undefined, 'expired-callback': disposeRecaptcha });
    recaptchaRef.current = verifier;
    confirmationRef.current = await signInWithPhoneNumber(auth, phone, verifier);
    setCustomerPhone(phone); setGuestStep('otp_form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('');
    if (!bookingDate) return setErrorMsg('اختر تاريخ الحجز.');
    if (availabilityLoading) return setErrorMsg('انتظر حتى يكتمل فحص المواعيد.');
    if (isSelfBooking) return setErrorMsg('لا يمكنك حجز قاعتك أو خدمتك الخاصة.');
    if (selectedDatePast) return setErrorMsg('لا يمكن الحجز في يوم سابق. اختر اليوم أو تاريخاً لاحقاً.');
    if (selectedPast) return setErrorMsg('هذه الفترة انتهت حسب توقيت بغداد. اختر فترة لاحقة.');
    if (selectedBooked) return setErrorMsg('هذا الموعد محجوز.');
    setIsLoading(true);
    try {
      await assertBookingSelectionAvailable(item.data.id, bookingDate, timeSlot, startTime, endTime);
      if (currentUser.isGuest) await sendGuestOtp();
      else { setBookingUser(currentUser); setGuestStep('payment'); }
    } catch (err: any) { console.error('Booking failed:', err); const code = err?.code || ''; const msg = code === 'auth/operation-not-allowed' ? 'تسجيل الدخول برقم الهاتف غير مفعّل في Firebase. فعّل Phone provider من Firebase Authentication.' : code === 'auth/invalid-app-credential' || code === 'auth/captcha-check-failed' ? 'فشل تحقق reCAPTCHA. تأكد أن localhost مضاف إلى Authorized domains في Firebase Authentication.' : code === 'auth/too-many-requests' ? 'تم إرسال محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.' : code === 'auth/invalid-phone-number' ? 'رقم الهاتف غير صحيح. اكتب 11 رقماً عراقياً يبدأ بـ 07.' : (err instanceof Error ? err.message : 'تعذر تنفيذ الحجز.'); setErrorMsg(msg); }
    finally { setIsLoading(false); }
  };

  const verifyGuestOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('');
    if (!confirmationRef.current) return setErrorMsg('أعد إرسال رمز التحقق أولاً.');
    const code = toEnglishDigits(otpCode);
    if (!/^\d{6}$/.test(code)) return setErrorMsg('رمز التحقق يجب أن يتكون من 6 أرقام.');
    setIsLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(code);
      let profile = await fetchUserFromFirestore(credential.user.uid);
      if (!profile) {
        profile = await saveUserToFirestore({ id: credential.user.uid, name: customerName.trim(), phone: customerPhone, email: '', city: currentUser.city || 'بغداد', accountType: 'زبون', isGuest: false, isGuestConverted: true, profileCompleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      onLoginSuccess?.(profile);
      setBookingUser(profile); setGuestStep('payment');
    } catch (err) { console.error('OTP/booking failed:', err); setErrorMsg(err instanceof Error ? err.message : 'تعذر التحقق أو إنشاء الحجز.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div
      className="wednak-booking-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-2 backdrop-blur-sm sm:p-3"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="wednak-booking-sheet max-h-[calc(100dvh-1rem)] w-full max-w-lg min-w-0 overflow-x-hidden overflow-y-auto rounded-3xl bg-white shadow-2xl sm:max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-label="طلب حجز جديد"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="guest-booking-recaptcha" />
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between rounded-t-3xl">
          <div className="flex gap-2"><WednakLogo className="w-10 h-10"/><div><h2 className="text-base font-bold">{currentUser.isGuest ? 'أكمل حجزك كضيف' : 'طلب حجز جديد'}</h2><p className="text-xs text-amber-200">{item.data.name}</p></div></div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10"><X className="w-5 h-5"/></button>
        </div>
        {isSelfBooking && <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex gap-2"><AlertTriangle className="w-5 h-5"/>لا يمكنك حجز نفسك.</div>}
        {errorMsg && <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex gap-2"><AlertCircle className="w-4 h-4"/>{errorMsg}</div>}

        {guestStep === 'details' ? <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between text-xs"><div>العربون <b className="block text-amber-900">{depositAmount.toLocaleString()} د.ع</b></div><div>السعر <b className="block text-emerald-800">{totalPrice.toLocaleString()} د.ع</b></div></div>
          <div>
            <label htmlFor="booking-date" className="text-xs font-bold flex gap-1 mb-1 cursor-pointer" onClick={openDatePicker}><Calendar className="w-4 h-4"/>التاريخ</label>
            <div className="wednak-booking-date-control relative min-w-0 max-w-full cursor-pointer overflow-hidden rounded-xl">
              <div className={`pointer-events-none flex h-12 w-full items-center justify-between rounded-xl border px-3 transition-colors ${selectedDatePast ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-700 bg-white text-slate-900'}`}>
                <Calendar className={`h-5 w-5 shrink-0 ${selectedDatePast ? 'text-rose-600' : 'text-emerald-800'}`} />
                <span className="font-bold tabular-nums" dir="ltr">{bookingDate}</span>
              </div>
              <input
                ref={dateInputRef}
                id="booking-date"
                type="date"
                value={bookingDate}
                onChange={(e)=>changeBookingDate(e.target.value)}
                min={getIraqTodayDate()}
                step={1}
                aria-label="اختر تاريخ الحجز؛ الأيام السابقة غير متاحة"
                className="wednak-booking-date-native absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <p className={`mt-1.5 flex items-center gap-1 text-[9px] font-bold ${selectedDatePast ? 'text-rose-700' : 'text-slate-500'}`}><ShieldCheck className={`h-3.5 w-3.5 ${selectedDatePast ? 'text-rose-600' : 'text-emerald-700'}`} />{selectedDatePast ? 'هذا تاريخ سابق؛ الحجز مقفل ولا يمكن إرسال الطلب.' : 'الأيام السابقة والأوقات المنتهية مقفلة تلقائياً حسب توقيت بغداد.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                حالة المواعيد والأوقات
              </label>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {bookingDate}
              </span>
            </div>
            {selectedDatePast ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                هذا اليوم مضى ولا يمكن إنشاء حجز فيه.
              </div>
            ) : availabilityLoading ? (
              <p className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-gray-500">جاري تحميل المواعيد...</p>
            ) : acceptedRanges.length === 0 && visiblePendingRanges.length === 0 ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                <CheckCircle className="w-4 h-4 shrink-0" />
                لا توجد حجوزات مقبولة أو طلبات قيد المراجعة في هذا التاريخ.
              </div>
            ) : (
              <div className="grid gap-1.5">
                {acceptedRanges.map((range) => (
                  <div key={`${range.start}-${range.end}`} className="flex items-center justify-between gap-2 rounded-xl border border-rose-300 bg-white px-3 py-2 text-[11px] font-black text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      {minuteLabel(range.start)} - {minuteLabel(range.end)}
                    </span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">محجوز</span>
                  </div>
                ))}
                {visiblePendingRanges.map((range) => (
                  <div key={`${range.startMinute}-${range.endMinute}`} className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      {minuteLabel(range.startMinute)} - {minuteLabel(range.endMinute)}
                    </span>
                    <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[9px] text-amber-800">قيد المراجعة{range.count > 1 ? ` (${range.count})` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px] leading-4 text-slate-500">الأحمر محجوز نهائياً ولا يقبل طلباً آخر. البرتقالي قيد المراجعة ويمكن إرسال طلب منافس إلى أن يقبل المالك أحد الطلبات.</p>
          </div>
          <div>
  <label className="text-xs font-bold flex gap-1 mb-2"><Clock className="w-4 h-4"/>الفترة {availabilityLoading && <span className="text-gray-400">(جاري الفحص...)</span>}</label>
  <div className="grid grid-cols-3 gap-2 mb-3">
    {PERIODS.map((period) => {
      const periodPast = selectedDatePast || startOptionsForPeriod(period).length === 0;
      return (
      <button key={period.key} type="button" disabled={availabilityLoading || periodPast} onClick={() => choosePeriod(period)} className={`p-2.5 rounded-xl border text-xs font-bold ${periodPast ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : selectedPeriod === period.key ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-gray-50 text-gray-800'}`}>
        {period.label}
        <span className="block text-[9px] mt-0.5 opacity-80">{hourLabel(period.start)} - {hourLabel(period.end)}</span>
        {periodPast && <span className="block text-[8px] mt-0.5">انتهت</span>}
      </button>
    )})}
  </div>
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="text-[11px] font-bold text-gray-600 block mb-1">من الساعة</label>
      <select disabled={selectedDatePast || startOptions.length === 0} value={startTime} onChange={(e) => { const next = e.target.value; setStartTime(next); const h = Number(next.slice(0,2)) + (selectedPeriod === 'night' && Number(next.slice(0,2)) < 6 ? 24 : 0); if (endOptions.length === 0 || minutesForRange(next, endTime, selectedPeriod).length === 0) setEndTime(hourToTime(h + 1)); }} className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
        {startOptions.map((h) => <option key={h} value={hourToTime(h)}>{hourLabel(h)}</option>)}
      </select>
    </div>
    <div>
      <label className="text-[11px] font-bold text-gray-600 block mb-1">إلى الساعة</label>
      <select disabled={selectedDatePast || endOptions.length === 0} value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
        {endOptions.map((h) => <option key={h} value={hourToTime(h)}>{hourLabel(h)}</option>)}
      </select>
    </div>
  </div>
  <div className={`mt-2 p-2 rounded-xl text-[10px] font-bold ${selectedPast ? 'bg-gray-100 text-gray-600 border border-gray-300' : selectedBooked ? 'bg-rose-50 text-rose-700 border border-rose-200' : selectedPending ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
    {selectedPast ? 'هذا الوقت مضى حسب توقيت بغداد ولا يمكن حجزه.' : selectedBooked ? 'الوقت المختار يتداخل مع حجز مقبول. اختر وقتاً آخر.' : selectedPending ? 'يوجد طلب قيد المراجعة لهذا الوقت، ويمكنك إرسال طلبك أيضاً.' : 'الوقت المختار متاح حالياً.'}
  </div>
</div>
{isHall && hall && <div><div className="flex justify-between text-xs font-bold"><span><Users className="inline w-4 h-4"/> عدد الضيوف</span><span>{effectiveGuests}</span></div><input type="range" min={1} max={hall.capacity} step={10} value={effectiveGuests} onChange={(e)=>setGuestsCount(Number(e.target.value))} className="w-full accent-emerald-700"/></div>}
          <div className="grid sm:grid-cols-2 gap-3"><div><label className="text-xs font-bold"><User className="inline w-4 h-4"/> الاسم</label><input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><label className="text-xs font-bold"><Phone className="inline w-4 h-4"/> الهاتف</label><input type="tel" inputMode="numeric" maxLength={11} value={customerPhone} onChange={(e)=>setCustomerPhone(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 11))} placeholder="07701234567" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr" required/></div></div>
          <div><label className="text-xs font-bold"><FileText className="inline w-4 h-4"/> ملاحظات</label><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs h-16"/></div>
          <div className="p-2.5 bg-gray-50 border rounded-xl text-[11px] text-gray-600 flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600"/>{currentUser.isGuest?'سنرسل OTP حقيقي ونربط الحجز بهويتك.':'الحجز خاص بك وبالطرف المستلم فقط.'}</div>
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs">إلغاء</button><button disabled={isLoading||isSelfBooking||selectedBooked||selectedPast||availabilityLoading} className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex gap-1 transition-opacity disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35"><WalletCards className="w-4 h-4"/>{isLoading?'جاري التنفيذ...':currentUser.isGuest?'إرسال OTP':'دفع العربون'}</button></div>
        </form> : guestStep==='otp_form' ? <form onSubmit={verifyGuestOtp} className="p-5 space-y-4"><div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs"><KeyRound className="inline w-4 h-4"/> أدخل الرمز الحقيقي المرسل إلى {customerPhone}</div><input value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} inputMode="numeric" maxLength={6} className="w-full px-3 py-2 border rounded-xl text-center text-xl tracking-widest" placeholder="000000"/><div className="flex justify-between"><button type="button" onClick={()=>setGuestStep('details')} className="text-xs flex gap-1"><ArrowRight className="w-4 h-4"/>تغيير الرقم</button><button disabled={isLoading} className="px-5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold">{isLoading?'جاري التحقق...':'الانتقال للدفع'}</button></div></form> : <div className="p-5 space-y-4"><div className="text-center"><WalletCards className="w-10 h-10 mx-auto text-emerald-700"/><h3 className="font-black mt-2">دفع العربون</h3><p className="text-2xl font-black text-amber-700">{depositAmount.toLocaleString()} د.ع</p></div><div className="grid grid-cols-2 gap-3">{(['زين كاش','Qi Card'] as const).map(method=><button key={method} onClick={()=>setPaymentMethod(method)} className={`p-4 border-2 rounded-2xl font-bold text-sm ${paymentMethod===method?'border-emerald-700 bg-emerald-50':'border-gray-200'}`}><CreditCard className="w-5 h-5 mx-auto mb-2"/>{method}</button>)}</div><div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">سيُسجل الطلب بانتظار الدفع إلى أن يتم ربط حساب التاجر الرسمي ببوابة {paymentMethod}. لن نعتبر العربون مدفوعاً دون تأكيد حقيقي من بوابة الدفع.</div><button disabled={isLoading||!bookingUser} onClick={async()=>{if(!bookingUser)return;setIsLoading(true);try{await submitBooking(bookingUser);onClose()}catch(err){setErrorMsg(err instanceof Error?err.message:'تعذر إرسال الحجز')}finally{setIsLoading(false)}}} className="w-full py-3 bg-emerald-700 text-white rounded-xl font-bold text-xs">{isLoading?'جاري إرسال الطلب...':`اختيار ${paymentMethod} وإرسال الطلب`}</button></div>}
      </div>
    </div>
  );
};
