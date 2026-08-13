import React, { useMemo, useState } from 'react';
import { CalendarCheck2, CalendarDays, Clock3 } from 'lucide-react';
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
  const accepted = useMemo(() => bookings.filter((booking) => ['مقبول', 'accepted'].includes(booking.status)), [bookings]);
  const pending = useMemo(() => bookings.filter((booking) => ['قيد المراجعة', 'pending'].includes(booking.status)), [bookings]);

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
    <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-emerald-700" />
        <h2 className="font-black">المواعيد والأوقات</h2>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
          <div className="flex justify-between gap-3">
            <div>
              <b className="text-sm text-emerald-950 block">حالة المواعيد والأوقات</b>
              <span className="text-[9px] text-gray-500">الأحمر مقبول، البرتقالي قيد المراجعة</span>
            </div>
            <input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} className="border rounded-lg px-2 py-1 text-xs bg-white" />
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
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
          <b className="text-sm text-rose-950 flex gap-2"><CalendarCheck2 className="w-4 h-4" />المواعيد والأوقات المحجوزة</b>
          {accepted.length === 0 ? (
            <p className="text-xs text-gray-500 mt-4">لا توجد مواعيد مؤكدة محجوزة.</p>
          ) : (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {accepted.map((booking) => (
                <div key={booking.id} className="bg-white border rounded-xl p-3 flex justify-between gap-3">
                  <div><b className="text-xs">{booking.date}</b><span className="text-[10px] text-gray-500 block">{booking.requesterName || booking.customerName}</span></div>
                  <span className="text-xs font-bold flex gap-1"><Clock3 className="w-3.5 h-3.5" />{booking.startTime || booking.timeSlot}{booking.endTime ? ` - ${booking.endTime}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
