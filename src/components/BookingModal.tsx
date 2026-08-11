import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Calendar, Clock, Users, Phone, User, FileText, CheckCircle, AlertTriangle, Sparkles, ShieldCheck, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Hall, ServiceProvider, UserProfile, Booking } from '../types';
import { auth, fetchUserFromFirestore, saveUserToFirestore, subscribeAvailability } from '../lib/firebase';

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
    customerId: string; ownerId?: string; requesterAccountType?: string;
  }) => Promise<void> | void;
}

type Slot = { label: string; startTime: string; endTime: string };
const SLOTS: Slot[] = [
  { label: 'صباحي (10:00 ص - 2:00 ظ)', startTime: '10:00', endTime: '14:00' },
  { label: 'مسائي (6:00 م - 11:00 م)', startTime: '18:00', endTime: '23:00' },
  { label: 'ليلي سهرة (11:00 م - 2:00 ص)', startTime: '23:00', endTime: '02:00' },
];

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

function minutesForSlot(slot: Slot): number[] {
  const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
  const start = toMinutes(slot.startTime);
  let end = toMinutes(slot.endTime);
  if (end <= start) end += 1440;
  const result: number[] = [];
  for (let minute = Math.floor(start / 30) * 30; minute < end; minute += 30) result.push(minute);
  return result;
}

export const BookingModal: React.FC<BookingModalProps> = ({ item, isOpen, onClose, currentUser, onLoginSuccess, onSubmitBooking }) => {
  const [bookingDate, setBookingDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; });
  const [timeSlot, setTimeSlot] = useState(SLOTS[1].label);
  const [guestsCount, setGuestsCount] = useState(100);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [guestStep, setGuestStep] = useState<'details' | 'otp_form'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [busyMinutes, setBusyMinutes] = useState<number[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(currentUser.isGuest ? '' : currentUser.name || '');
    setCustomerPhone(currentUser.isGuest ? '' : currentUser.phone || '');
    setGuestStep('details'); setOtpCode(''); setErrorMsg('');
  }, [isOpen, currentUser.id, currentUser.isGuest, currentUser.name, currentUser.phone]);

  useEffect(() => {
    if (!isOpen || !item?.data.id || !bookingDate) { setBusyMinutes([]); return; }
    setAvailabilityLoading(true);
    const unsubscribe = subscribeAvailability(item.data.id, bookingDate, (minutes) => {
      setBusyMinutes(minutes); setAvailabilityLoading(false);
    });
    return unsubscribe;
  }, [isOpen, item?.data.id, bookingDate]);

  useEffect(() => () => { recaptchaRef.current?.clear(); recaptchaRef.current = null; }, []);

  const selectedSlot = useMemo(() => SLOTS.find((s) => s.label === timeSlot) || SLOTS[1], [timeSlot]);
  const busySet = useMemo(() => new Set(busyMinutes), [busyMinutes]);
  const isSlotBooked = (slot: Slot) => minutesForSlot(slot).some((minute) => busySet.has(minute));
  const selectedBooked = isSlotBooked(selectedSlot);

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
    if (selectedBooked) throw new Error('هذا الموعد محجوز. اختر فترة أو تاريخاً آخر.');
    await onSubmitBooking({
      itemType: item.type, itemId: item.data.id, itemName: item.data.name, itemLocation: item.data.location,
      itemImage: isHall ? (hall!.coverImage || hall!.images[0] || '') : (provider!.coverImage || ''),
      date: bookingDate, timeSlot, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime,
      guests: isHall ? effectiveGuests : undefined, totalPrice, depositAmount, notes: notes.trim(),
      customerName: user.name || customerName.trim(), customerPhone: user.phone || customerPhone,
      customerId: user.id, ownerId: targetOwnerId, requesterAccountType: user.accountType,
    });
  };

  const sendGuestOtp = async () => {
    if (!customerName.trim()) throw new Error('اكتب اسمك لإكمال الحجز.');
    const phone = normalizeIraqiPhone(customerPhone);
    recaptchaRef.current?.clear();
    const verifier = new RecaptchaVerifier(auth, 'guest-booking-recaptcha', { size: 'invisible', callback: () => undefined });
    recaptchaRef.current = verifier;
    confirmationRef.current = await signInWithPhoneNumber(auth, phone, verifier);
    setCustomerPhone(phone); setGuestStep('otp_form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('');
    if (!bookingDate) return setErrorMsg('اختر تاريخ الحجز.');
    if (availabilityLoading) return setErrorMsg('انتظر حتى يكتمل فحص المواعيد.');
    if (isSelfBooking) return setErrorMsg('لا يمكنك حجز قاعتك أو خدمتك الخاصة.');
    if (selectedBooked) return setErrorMsg('هذا الموعد محجوز.');
    setIsLoading(true);
    try {
      if (currentUser.isGuest) await sendGuestOtp();
      else { await submitBooking(currentUser); onClose(); }
    } catch (err) { console.error('Booking failed:', err); setErrorMsg(err instanceof Error ? err.message : 'تعذر تنفيذ الحجز.'); }
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
      await submitBooking(profile);
      onClose();
    } catch (err) { console.error('OTP/booking failed:', err); setErrorMsg(err instanceof Error ? err.message : 'تعذر التحقق أو إنشاء الحجز.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl my-auto">
        <div id="guest-booking-recaptcha" />
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between rounded-t-3xl">
          <div className="flex gap-2"><Sparkles className="w-5 h-5 text-amber-300"/><div><h2 className="text-base font-bold">{currentUser.isGuest ? 'أكمل حجزك كضيف' : 'طلب حجز جديد'}</h2><p className="text-xs text-amber-200">{item.data.name}</p></div></div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10"><X className="w-5 h-5"/></button>
        </div>
        {isSelfBooking && <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex gap-2"><AlertTriangle className="w-5 h-5"/>لا يمكنك حجز نفسك.</div>}
        {errorMsg && <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex gap-2"><AlertCircle className="w-4 h-4"/>{errorMsg}</div>}

        {guestStep === 'details' ? <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between text-xs"><div>العربون <b className="block text-amber-900">{depositAmount.toLocaleString()} د.ع</b></div><div>السعر <b className="block text-emerald-800">{totalPrice.toLocaleString()} د.ع</b></div></div>
          <div><label className="text-xs font-bold flex gap-1 mb-1"><Calendar className="w-4 h-4"/>التاريخ</label><input type="date" value={bookingDate} onChange={(e)=>setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border rounded-xl text-xs"/></div>
          <div><label className="text-xs font-bold flex gap-1 mb-1"><Clock className="w-4 h-4"/>الفترة {availabilityLoading && <span className="text-gray-400">(جاري الفحص...)</span>}</label><div className="grid sm:grid-cols-3 gap-2">{SLOTS.map((slot)=>{const booked=isSlotBooked(slot);return <button key={slot.label} type="button" disabled={booked||availabilityLoading} onClick={()=>setTimeSlot(slot.label)} className={`p-2 rounded-xl border text-[11px] font-bold ${booked?'bg-rose-50 text-rose-700':timeSlot===slot.label?'bg-emerald-700 text-white':'bg-gray-50'}`}>{slot.label}<span className="block text-[9px]">{booked?'محجوز':'متاح'}</span></button>})}</div></div>
          {isHall && hall && <div><div className="flex justify-between text-xs font-bold"><span><Users className="inline w-4 h-4"/> عدد الضيوف</span><span>{effectiveGuests}</span></div><input type="range" min={1} max={hall.capacity} step={10} value={effectiveGuests} onChange={(e)=>setGuestsCount(Number(e.target.value))} className="w-full accent-emerald-700"/></div>}
          <div className="grid sm:grid-cols-2 gap-3"><div><label className="text-xs font-bold"><User className="inline w-4 h-4"/> الاسم</label><input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><label className="text-xs font-bold"><Phone className="inline w-4 h-4"/> الهاتف</label><input value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} placeholder="07701234567" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr" required/></div></div>
          <div><label className="text-xs font-bold"><FileText className="inline w-4 h-4"/> ملاحظات</label><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs h-16"/></div>
          <div className="p-2.5 bg-gray-50 border rounded-xl text-[11px] text-gray-600 flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600"/>{currentUser.isGuest?'سنرسل OTP حقيقي ونربط الحجز بهويتك.':'الحجز خاص بك وبالطرف المستلم فقط.'}</div>
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs">إلغاء</button><button disabled={isLoading||isSelfBooking||selectedBooked||availabilityLoading} className="px-5 py-2 bg-emerald-700 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex gap-1"><CheckCircle className="w-4 h-4"/>{isLoading?'جاري التنفيذ...':currentUser.isGuest?'إرسال OTP':'إرسال الحجز'}</button></div>
        </form> : <form onSubmit={verifyGuestOtp} className="p-5 space-y-4"><div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs"><KeyRound className="inline w-4 h-4"/> أدخل الرمز الحقيقي المرسل إلى {customerPhone}</div><input value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} inputMode="numeric" maxLength={6} className="w-full px-3 py-2 border rounded-xl text-center text-xl tracking-widest" placeholder="000000"/><div className="flex justify-between"><button type="button" onClick={()=>setGuestStep('details')} className="text-xs flex gap-1"><ArrowRight className="w-4 h-4"/>تغيير الرقم</button><button disabled={isLoading} className="px-5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold">{isLoading?'جاري التحقق...':'تأكيد الحجز'}</button></div></form>}
      </div>
    </div>
  );
};
