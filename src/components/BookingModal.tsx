import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Phone, User, FileText, CheckCircle, AlertTriangle, Sparkles, ShieldCheck, AlertCircle, KeyRound, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { Hall, ServiceProvider, UserProfile, Booking } from '../types';
import { findUserByPhoneFromFirestore, saveUserToFirestore } from '../data/usersDatabase';

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
    guests?: number;
    totalPrice: number;
    depositAmount: number;
    notes: string;
    customerName: string;
    customerPhone: string;
    customerId: string;
    ownerId?: string;
  }) => void;
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
  if (!isOpen || !item) return null;

  const isHall = item.type === 'hall';
  const hallData = isHall ? (item.data as Hall) : null;
  const providerData = !isHall ? (item.data as ServiceProvider) : null;
  const itemId = item.data.id;

  // Booking details state
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    return tomorrow.toISOString().split('T')[0];
  });

  const [timeSlot, setTimeSlot] = useState('مسائي (6:00 م - 11:00 م)');
  const [guestsCount, setGuestsCount] = useState(hallData ? Math.min(300, hallData.capacity) : 100);
  const [customerName, setCustomerName] = useState(currentUser.isGuest ? '' : currentUser.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser.isGuest ? '' : currentUser.phone || '');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Guest Conversion OTP Flow State
  const [guestStep, setGuestStep] = useState<'details' | 'otp_form'>('details');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);

  const totalPrice = isHall ? hallData!.price : providerData!.priceStart;
  const depositAmount = isHall ? hallData!.deposit : Math.round(providerData!.priceStart * 0.2);

  // Check if target owner is current user
  const targetOwnerId = item.data.ownerId;
  const isSelfBooking = !currentUser.isGuest && currentUser.id === targetOwnerId;

  // Check which time slots are accepted for this item on the chosen date
  const isSlotBooked = (slot: string) => {
    return bookings.some(
      (b) =>
        b.itemId === itemId &&
        b.date === bookingDate &&
        b.timeSlot === slot &&
        b.status === 'مقبول'
    );
  };

  const isSelectedSlotBooked = isSlotBooked(timeSlot);

  // Direct Submission handler for Authenticated Users
  const handleFinalBookingSubmit = (authenticatedUser: UserProfile) => {
    // 1. Anti-Self Booking Guard
    if (authenticatedUser.id === targetOwnerId) {
      setErrorMsg('عذراً! لا يمكنك حجز قناتك أو حسابك الخاص كصاحب قاعة/مزود خدمة.');
      setGuestStep('details');
      setIsLoading(false);
      return;
    }

    // 2. Double-Booking Guard
    if (isSelectedSlotBooked) {
      setErrorMsg('عذراً، هذا الموعد محجوز بالكامل ومأكود لهذا اليوم. يرجى اختيار تاريخ أو فترة زمنية أخرى.');
      setGuestStep('details');
      setIsLoading(false);
      return;
    }

    onSubmitBooking({
      itemType: item.type,
      itemId: item.data.id,
      itemName: item.data.name,
      itemLocation: item.data.location,
      itemImage: isHall ? hallData!.images[0] : providerData!.coverImage,
      date: bookingDate,
      timeSlot,
      guests: isHall ? guestsCount : undefined,
      totalPrice,
      depositAmount,
      notes,
      customerName: authenticatedUser.name || customerName,
      customerPhone: authenticatedUser.phone || customerPhone,
      customerId: authenticatedUser.id,
      ownerId: targetOwnerId,
    });

    onClose();
  };

  // Main Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSelfBooking) {
      setErrorMsg('لا يمكنك حجز قناتك أو حسابك الخاص كصاحب قاعة/مزود خدمة.');
      return;
    }

    if (isSelectedSlotBooked) {
      setErrorMsg('عذراً، هذا الموعد محجوز بالكامل ومأكود لهذا اليوم. يرجى اختيار تاريخ أو فترة زمنية أخرى.');
      return;
    }

    // If Guest -> Move to Phone & OTP Verification Step
    if (currentUser.isGuest) {
      if (!customerName.trim() || !customerPhone.trim()) {
        setErrorMsg('يرجى إدخال اسمك ورقم هاتفك العراقي لإرسال رمز التحقق OTP.');
        return;
      }
      setGuestStep('otp_form');
      setOtpSent(true);
      return;
    }

    // Non-guest logged in user
    if (!customerName.trim() || !customerPhone.trim() || !bookingDate) {
      setErrorMsg('الرجاء كتابة الاسم الكامل ورقم الهاتف بشكل صحيح.');
      return;
    }

    handleFinalBookingSubmit(currentUser);
  };

  // Handle Guest OTP Verification
  const handleVerifyGuestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      setErrorMsg('رمز التحقق غير صحيح. الرمز الافتراضي للتجربة هو 123456');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const cleanPhone = customerPhone.trim();

      // Look up if user already exists with this phone!
      let userDoc = await findUserByPhoneFromFirestore(cleanPhone);

      if (!userDoc) {
        // Create new user with Guest Conversion flags
        const newUid = `user-phone-${Date.now().toString().slice(-6)}`;
        userDoc = {
          id: newUid,
          name: customerName.trim(),
          phone: cleanPhone,
          email: `${newUid}@wednak.app`,
          city: 'بغداد',
          accountType: 'زبون',
          isGuestConverted: true,
          profileCompleted: false,
          isGuest: false,
        };
        await saveUserToFirestore(userDoc);
      } else {
        // Updated name if provided
        if (customerName.trim() && userDoc.name !== customerName.trim()) {
          userDoc.name = customerName.trim();
          await saveUserToFirestore(userDoc);
        }
      }

      // Log in converted user
      if (onLoginSuccess) {
        onLoginSuccess(userDoc);
      }

      // Submit booking with real User ID!
      handleFinalBookingSubmit(userDoc);
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء التحقق من الرمز وتحويل حساب الضيف.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="booking-modal-overlay">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-100 flex flex-col justify-between my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-base font-bold">
                {currentUser.isGuest ? 'أكمل حجزك كضيف (تأكيد السريع)' : 'طلب حجز جديد'}
              </h2>
              <p className="text-xs text-amber-200">{item.data.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            id="close-booking-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Self Booking Alert Warning */}
        {isSelfBooking && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>تنبيه: لا يجوز حجز قاعتك أو خدماتك بنفسك! يرجى تبديل الحساب للزبون للقيام بالتجربة.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Details Entry */}
        {guestStep === 'details' && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            {/* Booking Summary Box */}
            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-600 block">العربون المطلوب للتأكيد:</span>
                <span className="text-base font-black text-amber-900">{depositAmount.toLocaleString()} د.ع</span>
              </div>
              <div className="text-left">
                <span className="text-gray-600 block">إجمالي السعر:</span>
                <span className="text-sm font-bold text-emerald-800">{totalPrice.toLocaleString()} د.ع</span>
              </div>
            </div>

            {/* Date Selector */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                تاريخ المناسبة:
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                required
                id="booking-date-input"
              />
            </div>

            {/* Time Slot Picker */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                الفترة الزمنية للحجز:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  'صباحي (10:00 ص - 2:00 ظ)',
                  'مسائي (6:00 م - 11:00 م)',
                  'ليلي سهرة (11:00 م - 2:00 ص)'
                ].map((slot) => {
                  const booked = isSlotBooked(slot);
                  const isSelected = timeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        booked
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300'
                      }`}
                      id={`slot-${slot}`}
                    >
                      <span>{slot.split(' ')[0]}</span>
                      {booked ? (
                        <span className="text-[9px] bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded font-black">
                          محجوز مؤكد
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-80">{slot.split(' ')[1]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {isSelectedSlotBooked && (
                <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  هذا الموعد محجوز في هذا التاريخ! اختر فترة أخرى أو غير التاريخ.
                </p>
              )}
            </div>

            {/* Guests Count (If Hall) */}
            {isHall && hallData && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    عدد الضيوف المتوقع:
                  </label>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {guestsCount} شخص
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={hallData.capacity}
                  step={10}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                  id="guests-count-slider"
                />
              </div>
            )}

            {/* Customer Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  الاسم الكامل:
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                  required
                  id="booking-customer-name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  رقم الهاتف العراقي:
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0770XXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 text-left dir-ltr focus:ring-2 focus:ring-emerald-600 outline-none font-mono"
                  required
                  id="booking-customer-phone"
                />
              </div>
            </div>

            {/* Special Notes */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                ملاحظات أو طلبات خاصة (اختياري):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: نرغب بكوشة باللون الذهبي، أو استفسار عن نوع العشاء..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 h-16 resize-none focus:ring-2 focus:ring-emerald-600 outline-none"
                id="booking-notes-textarea"
              />
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {currentUser.isGuest
                  ? 'سنرسل رمز تحقق OTP سريع إلى هاتفك لربط حجزك بشكل آمن وخاص.'
                  : 'سيتم تحويل الطلب لصاحب القاعة/الخدمة فوراً وإخطارك بحالة القبول.'}
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                id="cancel-booking-btn"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSelfBooking}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 ${
                  isSelfBooking
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
                }`}
                id="confirm-booking-submit-btn"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{currentUser.isGuest ? 'متابعة الحجز والتحقق بالهاتف' : 'تأكيد إرسال طلب الحجز'}</span>
              </button>
            </div>

          </form>
        )}

        {/* STEP 2: Guest OTP Verification Sheet */}
        {guestStep === 'otp_form' && (
          <form onSubmit={handleVerifyGuestOtp} className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-700" />
                رمز التحقق (OTP) لإكمال الحجز:
              </div>
              <p className="text-gray-600 text-[11px]">
                تم إرسال رمز التأكيد تلقائياً إلى رقمك <span className="font-bold font-mono text-emerald-900">{customerPhone}</span>
              </p>
              <p className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-1">
                رمز التحقق الافتراضي لتجربة الحجز السريع: 123456
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">أدخل رمز OTP المتكون من 6 أرقام:</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-center text-xl font-mono font-bold tracking-widest text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-600"
                maxLength={6}
                required
                id="guest-booking-otp-input"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuestStep('details')}
                className="text-xs font-bold text-gray-500 hover:text-emerald-800 flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>تغيير الاسم أو الهاتف</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                id="btn-verify-guest-otp-and-book"
              >
                <span>{isLoading ? 'جاري التأكيد والربط...' : 'تأكيد الموعد وإنشاء الحجز'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
