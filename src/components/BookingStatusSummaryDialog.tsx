import React, { useEffect, useMemo } from 'react';
import { CalendarCheck2, CalendarClock, Clock3, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Booking } from '../types';

interface BookingStatusSummaryDialogProps {
  bookings: Booking[];
  variant: 'accepted' | 'pending';
  onClose: () => void;
  onManage: () => void;
}

const timeMinutes = (value?: string) => {
  const [hour, minute] = (value || '00:00').slice(0, 5).split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
};

export const BookingStatusSummaryDialog: React.FC<BookingStatusSummaryDialogProps> = ({ bookings, variant, onClose, onManage }) => {
  const accepted = variant === 'accepted';
  const sortedBookings = useMemo(() => [...bookings].sort((first, second) => {
    const dateOrder = (first.date || '').localeCompare(second.date || '');
    if (dateOrder !== 0) return dateOrder;
    return timeMinutes(first.startTime) - timeMinutes(second.startTime);
  }), [bookings]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
      style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
    >
      <div
        className={`flex max-h-[84dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border bg-white shadow-2xl ${accepted ? 'border-emerald-300' : 'border-orange-300'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${variant}-booking-summary-title`}
        onClick={(event) => event.stopPropagation()}
        style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        <div className={`flex shrink-0 items-center justify-between gap-3 px-4 py-4 text-white ${accepted ? 'bg-emerald-800' : 'bg-orange-600'}`}>
          <div>
            <h3 id={`${variant}-booking-summary-title`} className="flex items-center gap-2 text-base font-black">
              {accepted ? <CalendarCheck2 className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
              {accepted ? 'الحجوزات المؤكدة' : 'الطلبات قيد المراجعة'}
            </h3>
            <p className={`mt-1 text-[10px] ${accepted ? 'text-emerald-100' : 'text-orange-50'}`}>مرتبة من أقرب تاريخ ووقت إلى الأبعد</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="إغلاق التفاصيل">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-3 sm:p-4">
          {sortedBookings.length === 0 ? (
            <div className="py-12 text-center">
              {accepted ? <CalendarCheck2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" /> : <CalendarClock className="mx-auto mb-3 h-10 w-10 text-orange-500" />}
              <p className="text-sm font-bold text-gray-800">{accepted ? 'لا توجد حجوزات مؤكدة' : 'لا توجد طلبات قيد المراجعة'}</p>
            </div>
          ) : (
            <div className={`overflow-hidden rounded-2xl border ${accepted ? 'border-emerald-200' : 'border-orange-200'}`}>
              <div className={`grid grid-cols-[0.9fr_1.1fr_1fr] px-3 py-2.5 text-[10px] font-black sm:text-xs ${accepted ? 'bg-emerald-50 text-emerald-950' : 'bg-orange-50 text-orange-950'}`}>
                <span>التاريخ</span><span>الوقت</span><span>صاحب الحجز</span>
              </div>
              {sortedBookings.map((booking, index) => (
                <div key={`${booking.id}-${index}`} className={`grid grid-cols-[0.9fr_1.1fr_1fr] items-center gap-2 border-t px-3 py-3 text-[10px] sm:text-xs ${index % 2 === 0 ? 'bg-white' : accepted ? 'bg-emerald-50/40' : 'bg-orange-50/50'} ${accepted ? 'border-emerald-100' : 'border-orange-100'}`}>
                  <b className="break-words text-gray-900" dir="ltr">{booking.date}</b>
                  <span className={`flex min-w-0 items-center gap-1 font-bold ${accepted ? 'text-emerald-800' : 'text-orange-700'}`} dir="ltr">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{booking.startTime || booking.timeSlot}{booking.endTime ? ` - ${booking.endTime}` : ''}</span>
                  </span>
                  <span className="break-words text-gray-600">{booking.requesterName || booking.customerName || 'غير معروف'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-3">
          <button type="button" onClick={onManage} className={`w-full rounded-xl px-4 py-3 text-xs font-black text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 ${accepted ? 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-400' : 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-400'}`}>
            {accepted ? 'إدارة الحجوزات المؤكدة' : 'مراجعة الطلبات واتخاذ إجراء'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
