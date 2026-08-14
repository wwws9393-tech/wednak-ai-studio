import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarDays, Clock3, Eye, X } from 'lucide-react';
import { Booking } from '../types';
import { getIraqTodayDate } from '../lib/firebase';

const SLOTS = [
  { name: 'صباحي', start: '10:00', end: '14:00' },
  { name: 'مسائي', start: '18:00', end: '23:00' },
  { name: 'ليلي', start: '23:00', end: '02:00' },
];

const normalize = (value: string) => value?.slice(0, 5) || '';
const minutes = (value: string) => {
  const [hour, minute] = normalize(value).split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : Number.NaN;
};
const range = (start: string, end: string) => {
  const from = minutes(start);
  let to = minutes(end);
  if (to <= from) to += 1440;
  return [from, to] as const;
};

export const BookingSchedule: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const today = getIraqTodayDate();
  const [date, setDate] = useState(today);
  const [showReservedDetails, setShowReservedDetails] = useState(false);
  const accepted = useMemo(() => bookings.filter((booking) => ['مقبول', 'accepted'].includes(booking.status)), [bookings]);
  const pending = useMemo(() => bookings.filter((booking) => ['قيد المراجعة', 'pending'].includes(booking.status)), [bookings]);
  const upcomingAccepted = useMemo(() => accepted
    .filter((booking) => booking.date >= today)
    .sort((first, second) => {
      const dateOrder = first.date.localeCompare(second.date);
      if (dateOrder !== 0) return dateOrder;
      const firstStart = minutes(first.startTime || '00:00');
      const secondStart = minutes(second.startTime || '00:00');
      return (Number.isNaN(firstStart) ? 0 : firstStart) - (Number.isNaN(secondStart) ? 0 : secondStart);
    }), [accepted, today]);

  useEffect(() => {
    if (!showReservedDetails) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowReservedDetails(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showReservedDetails]);

  const overlapsSlot = (booking: Booking, slot: typeof SLOTS[number]) => {
    if (booking.date !== date) return false;
    const label = booking.timeSlot || booking.period || '';
    if (label.includes(slot.name)) return true;
    if (!booking.startTime || !booking.endTime) return false;
    const [slotStart, slotEnd] = range(slot.start, slot.end);
    const [bookingStart, bookingEnd] = range(booking.startTime, booking.endTime);
    return slotStart < bookingEnd && bookingStart < slotEnd;
  };

  return (
    <section className="bg-gradient-to-br from-white via-lime-50/30 to-amber-50/40 p-5 rounded-3xl border border-amber-300/40 shadow-sm space-y-4" dir="rtl">
      <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-800 px-4 py-3 text-white shadow-md">
        <CalendarDays className="w-5 h-5 text-amber-300" />
        <div><h2 className="font-black text-amber-100">المواعيد والأوقات</h2><p className="text-[10px] text-emerald-100">متابعة التوفر والحجوزات من مكان واحد</p></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-300/60 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-4 space-y-3 shadow-lg">
          <div className="flex justify-between gap-3">
            <div>
              <b className="text-sm text-amber-100 block">حالة المواعيد والأوقات</b>
              <span className="text-[9px] text-emerald-100">الأحمر مقبول، البرتقالي قيد المراجعة</span>
            </div>
            <input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} className="border border-amber-300 rounded-xl px-2 py-2 text-xs bg-white text-emerald-950" />
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            {SLOTS.map((slot) => {
              const booked = accepted.some((booking) => overlapsSlot(booking, slot));
              const underReview = !booked && pending.some((booking) => overlapsSlot(booking, slot));
              return (
                <div key={slot.name} className={`p-3 rounded-xl border ${booked ? 'bg-rose-50 border-rose-300' : underReview ? 'bg-amber-50 border-amber-300' : 'bg-white border-emerald-300'}`}>
                  <b className="text-xs block">{slot.name}</b>
                  <span className="text-[10px]">{slot.start} - {slot.end}</span>
                  <span className={`block mt-1 text-[10px] font-bold ${booked ? 'text-rose-700' : underReview ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {booked ? 'محجوز' : underReview ? 'قيد المراجعة' : 'متاح'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-900/40 bg-gradient-to-br from-rose-50 via-white to-rose-100/60 p-4 min-h-40 flex flex-col shadow-[0_12px_28px_rgba(15,23,42,0.10)]" style={{ touchAction: 'manipulation' }}>
          <b className="text-sm text-rose-950 flex gap-2"><CalendarCheck2 className="w-4 h-4 text-rose-500" />المواعيد والأوقات المحجوزة</b>
          <button
            type="button"
            onClick={() => setShowReservedDetails(true)}
            className="m-auto min-w-40 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 border border-slate-900/30 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Eye className="w-4 h-4" />عرض التفاصيل
          </button>
        </div>
      </div>

      {showReservedDetails && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowReservedDetails(false)}
          role="presentation"
          style={{ touchAction: 'pan-y' }}
        >
          <div
            className="w-full max-w-xl max-h-[82dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserved-bookings-title"
            onClick={(event) => event.stopPropagation()}
            style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
          >
            <div className="shrink-0 bg-gradient-to-l from-rose-700 via-rose-600 to-rose-500 text-white px-4 py-4 flex items-center justify-between gap-3 border-b border-slate-900/30">
              <div>
                <h3 id="reserved-bookings-title" className="font-black text-base flex items-center gap-2"><CalendarCheck2 className="w-5 h-5" />المواعيد والأوقات المحجوزة</h3>
                <p className="text-[10px] text-rose-100 mt-1">مرتبة من أقرب موعد إلى الأبعد</p>
              </div>
              <button type="button" onClick={() => setShowReservedDetails(false)} className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center" aria-label="إغلاق تفاصيل المواعيد">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain p-3 sm:p-4">
              {upcomingAccepted.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarDays className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-800">لا توجد مواعيد مؤكدة قادمة</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-[0.9fr_1.1fr_1fr] bg-gray-100 px-3 py-2.5 text-[10px] sm:text-xs font-black text-gray-700">
                    <span>التاريخ</span><span>الوقت</span><span>صاحب الحجز</span>
                  </div>
                  {upcomingAccepted.map((booking, index) => (
                    <div key={booking.id} className={`grid grid-cols-[0.9fr_1.1fr_1fr] items-center gap-2 px-3 py-3 text-[10px] sm:text-xs ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-100`}>
                      <b className="text-gray-900 break-words" dir="ltr">{booking.date}</b>
                      <span className="font-bold text-rose-900 flex items-center gap-1 min-w-0"><Clock3 className="w-3.5 h-3.5 shrink-0"/><span className="break-words">{booking.startTime || booking.timeSlot}{booking.endTime ? ` - ${booking.endTime}` : ''}</span></span>
                      <span className="text-gray-600 break-words">{booking.requesterName || booking.customerName || 'غير معروف'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
