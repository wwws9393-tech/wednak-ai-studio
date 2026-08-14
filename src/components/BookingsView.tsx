import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, CheckCircle2, XCircle, Eye, ArrowRight, Loader2, Phone, User, X } from 'lucide-react';
import { Booking, BookingStatus, UserProfile } from '../types';
import { AccountType } from '../types';
import { BookingSchedule } from './BookingSchedule';

interface BookingsViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onSelectTab: (tab: string) => void;
  accountType?: AccountType;
  initialFilter?: string;
  onUpdateBookingStatus?: (bookingId: string, newStatus: Booking['status']) => Promise<void> | void;
  onLoadRequester?: (booking: Booking) => Promise<UserProfile | null>;
  onOpenRequester?: (booking: Booking) => Promise<void> | void;
}

const normalizeStatus = (status: BookingStatus): 'قيد المراجعة' | 'مقبول' | 'مرفوض' | 'ملغي' | 'مكتمل' => {
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'accepted') return 'مقبول';
  if (status === 'rejected') return 'مرفوض';
  if (status === 'cancelled') return 'ملغي';
  if (status === 'completed') return 'مكتمل';
  return status;
};

const requesterKey = (booking: Booking) => {
  const accountId = (booking.requesterId || booking.customerId || '').trim();
  if (accountId) return `id:${accountId}`;
  const phone = (booking.requesterPhone || booking.customerPhone || '').replace(/\D/g, '');
  return phone ? `phone:${phone}` : `booking:${booking.id}`;
};

const isSamePendingSlot = (first: Booking, second: Booking) =>
  first.itemId === second.itemId &&
  first.date === second.date &&
  normalizeStatus(second.status) === 'قيد المراجعة' &&
  (first.startTime || first.timeSlot) === (second.startTime || second.timeSlot) &&
  (first.endTime || '') === (second.endTime || '');

const groupPendingAccounts = (anchor: Booking, bookings: Booking[]) => {
  const grouped = new Map<string, Booking[]>();
  bookings.filter((booking) => isSamePendingSlot(anchor, booking)).forEach((booking) => {
    const key = requesterKey(booking);
    grouped.set(key, [...(grouped.get(key) || []), booking]);
  });
  return Array.from(grouped, ([key, requests]) => ({ key, requests }));
};

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookings = [],
  onSelectBooking,
  onSelectTab,
  accountType,
  initialFilter = 'الكل',
  onUpdateBookingStatus,
  onLoadRequester,
  onOpenRequester,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [updatingBookingId, setUpdatingBookingId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [conflictBooking, setConflictBooking] = useState<Booking | null>(null);
  const [conflictActionError, setConflictActionError] = useState('');
  const [requesterProfiles, setRequesterProfiles] = useState<Record<string, UserProfile | null>>({});
  const [profilesLoading, setProfilesLoading] = useState(false);
  const isBusinessAccount = accountType === 'صاحب قاعة' || accountType === 'مزود خدمة';

  useEffect(() => setActiveFilter(initialFilter), [initialFilter]);

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'الكل') return true;
    return normalizeStatus(b.status) === activeFilter;
  });

  const pendingConflicts = (booking: Booking) => {
    const currentRequester = requesterKey(booking);
    return new Set(
      bookings
        .filter((other) => other.id !== booking.id && isSamePendingSlot(booking, other) && requesterKey(other) !== currentRequester)
        .map(requesterKey)
    ).size;
  };

  const openConflictAccounts = async (booking: Booking) => {
    const groups = groupPendingAccounts(booking, bookings);
    setConflictBooking(booking);
    setConflictActionError('');
    setRequesterProfiles({});
    if (!onLoadRequester) return;
    setProfilesLoading(true);
    try {
      const loaded = await Promise.all(groups.map(async (group) => [group.key, await onLoadRequester(group.requests[0])] as const));
      setRequesterProfiles(Object.fromEntries(loaded));
    } finally {
      setProfilesLoading(false);
    }
  };

  const updateBooking = async (bookingId: string, status: Booking['status'], insideConflictDialog = false): Promise<boolean> => {
    if (!onUpdateBookingStatus || updatingBookingId) return false;
    setUpdatingBookingId(bookingId); setActionMessage(''); setActionError('');
    if (insideConflictDialog) setConflictActionError('');
    try {
      await onUpdateBookingStatus(bookingId, status);
      setActionMessage(status === 'مقبول' ? 'تم قبول الحجز وتثبيت الموعد.' : 'تم رفض الطلب بنجاح.');
      return true;
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      const message = raw.includes('محجوز') ? 'يتعارض هذا الطلب مع حجز مؤكد في نفس التاريخ والفترة.' : raw || 'تعذر تحديث الحجز.';
      if (insideConflictDialog) setConflictActionError(message);
      else setActionError(message);
      return false;
    } finally { setUpdatingBookingId(''); }
  };

  const confirmBookingUpdate = async (booking: Booking, status: Booking['status'], closeDialogAfterSuccess = false) => {
    const verb = status === 'مقبول' ? 'قبول' : 'رفض';
    if (!window.confirm(`هل أنت متأكد من ${verb} طلب ${booking.requesterName || booking.customerName || 'هذا المستخدم'}؟`)) return;
    const updated = await updateBooking(booking.id, status, closeDialogAfterSuccess);
    if (updated && closeDialogAfterSuccess) setConflictBooking(null);
  };

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case 'قيد المراجعة':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'مقبول':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'مرفوض':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'ملغي':
        return 'bg-slate-950 text-white border-slate-950';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  const getCardTone = (status: BookingStatus) => {
    switch (normalizeStatus(status)) {
      case 'مقبول': return { card: 'border-emerald-500 ring-emerald-100 hover:border-emerald-600 shadow-[0_12px_30px_rgba(5,150,105,0.10)] hover:shadow-[0_16px_38px_rgba(5,150,105,0.16)]', accent: 'via-emerald-500' };
      case 'قيد المراجعة': return { card: 'border-amber-400 ring-amber-100 hover:border-amber-500 shadow-[0_12px_30px_rgba(217,119,6,0.10)] hover:shadow-[0_16px_38px_rgba(217,119,6,0.16)]', accent: 'via-amber-400' };
      case 'مرفوض': return { card: 'border-rose-500 ring-rose-100 hover:border-rose-600 shadow-[0_12px_30px_rgba(244,63,94,0.10)] hover:shadow-[0_16px_38px_rgba(244,63,94,0.16)]', accent: 'via-rose-500' };
      case 'ملغي': return { card: 'border-slate-950 ring-slate-300 hover:border-black shadow-[0_12px_30px_rgba(15,23,42,0.14)] hover:shadow-[0_16px_38px_rgba(15,23,42,0.22)]', accent: 'via-slate-950' };
      default: return { card: 'border-gray-300 ring-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md', accent: 'via-gray-400' };
    }
  };
  const createdText=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'غير معروف':date.toLocaleString('ar-IQ',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});};
  const conflictAccounts = conflictBooking ? groupPendingAccounts(conflictBooking, bookings) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="bookings-view-container">

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 rounded-3xl text-white shadow-md">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-300" />
            {isBusinessAccount ? 'الحجوزات الواردة' : 'حجوزاتي'}
          </h1>
          <p className="text-xs text-amber-100 mt-1">{isBusinessAccount ? 'إدارة الطلبات والمواعيد من مكان واحد' : 'متابعة حالة طلباتك ومواعيد حجوزاتك'}</p>
        </div>

        <button
          onClick={() => onSelectTab('home')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-2xl shadow-xs transition-all self-start sm:self-auto flex items-center gap-1"
        >
          <span>تصفح القاعات والخدمات</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Filter Tabs */}
      {isBusinessAccount && <BookingSchedule bookings={bookings}/>}

      {actionMessage && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">{actionMessage}</div>}
      {actionError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">{actionError}</div>}

      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {['الكل', 'قيد المراجعة', 'مقبول', 'مرفوض', 'ملغي'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === filter
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50'
            }`}
            id={`filter-booking-${filter}`}
          >
            {filter} ({filter === 'الكل' ? bookings.length : bookings.filter(b => normalizeStatus(b.status) === filter).length})
          </button>
        ))}
      </div>

      {/* List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">لا توجد حجوزات ضمن هذا التبويب</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {isBusinessAccount ? 'ستظهر هنا كل الطلبات الموجهة إلى نشاطك عند وصولها.' : 'يمكنك حجز القاعات ومزودي الخدمات بكل سهولة واختيار الموعد المناسب لليلة زفافك.'}
          </p>
          <button
            onClick={() => onSelectTab('home')}
            className="px-5 py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-800 transition-colors inline-block mt-2"
          >
            استكشف القاعات الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const tone = getCardTone(b.status);
            return (
            <div
              key={b.id}
              className={`relative overflow-hidden bg-gradient-to-br from-white via-white to-amber-50/45 rounded-3xl border ring-1 p-4 transition-all flex flex-col justify-between space-y-3 cursor-pointer group ${tone.card}`}
              onClick={() => onSelectBooking(b)}
              id={`booking-card-${b.id}`}
            >
              <span className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${tone.accent}`} aria-hidden="true" />
              <div className="flex items-start gap-3">
                <img
                  src={b.itemImage}
                  alt={b.itemName}
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0 group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-gray-400">{b.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(normalizeStatus(b.status) as BookingStatus)}`}>
                      {normalizeStatus(b.status)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                    {b.itemName}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {b.itemLocation}
                  </p>
                </div>
              </div>

              {isBusinessAccount && <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs">
                <span className="text-[10px] text-gray-500 block">صاحب الطلب:</span>
                <b className="text-gray-900">{b.requesterName || b.customerName || 'غير معروف'}</b>
                {(b.requesterPhone || b.customerPhone) && <span className="text-gray-500 mr-2" dir="ltr">{b.requesterPhone || b.customerPhone}</span>}
              </div>}

              {isBusinessAccount && normalizeStatus(b.status) === 'قيد المراجعة' && pendingConflicts(b) > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); void openConflictAccounts(b); }} className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] font-bold text-amber-900 text-right hover:bg-amber-100 transition-colors">
                ⚠️ يوجد {pendingConflicts(b)} طلب آخر بنفس التاريخ والفترة.
                <span className="block mt-1 text-[9px] text-amber-700">اضغط لعرض الحسابات واتخاذ القرار</span>
              </button>}

              {isBusinessAccount && normalizeStatus(b.status) === 'قيد المراجعة' && onUpdateBookingStatus && <div className="grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
                <button type="button" disabled={!!updatingBookingId} onClick={() => void confirmBookingUpdate(b, 'مقبول')} className="py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold disabled:opacity-50">
                  <CheckCircle2 className="inline w-4 h-4 ml-1"/>{updatingBookingId === b.id ? 'جاري التنفيذ...' : 'قبول'}
                </button>
                <button type="button" disabled={!!updatingBookingId} onClick={() => void confirmBookingUpdate(b, 'مرفوض')} className="py-2.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold disabled:opacity-50">
                  <XCircle className="inline w-4 h-4 ml-1"/>رفض
                </button>
              </div>}

              {/* Date & Pricing Bar */}
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block">تاريخ المناسبة:</span>
                  <span className="font-extrabold text-emerald-900">{b.date}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-gray-500 block">العربون المسدد:</span>
                  <span className="font-black text-amber-700">{(b.depositAmount || 0).toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* Details Action */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500">الفترة: {b.timeSlot ? b.timeSlot.split(' ')[0] : 'غير محدد'}</span>
                <span className="font-bold text-emerald-700 group-hover:translate-x-[-2px] transition-transform flex items-center gap-1">
                  عرض التفاصيل <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="pt-2 border-t border-black text-[11px] font-medium text-black">تاريخ إنشاء الحجز: {createdText(b.createdAt)}</div>
            </div>
          );})}
        </div>
      )}

      {conflictBooking && conflictAccounts.length > 1 && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" dir="rtl" onClick={() => setConflictBooking(null)}>
        <section role="dialog" aria-modal="true" aria-label="الطلبات المتنافسة" onClick={(event) => event.stopPropagation()} className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl border border-amber-300 bg-white shadow-2xl">
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-3xl bg-gradient-to-l from-emerald-950 to-emerald-800 p-4 text-white">
            <div><h2 className="text-base font-black">طلبات بنفس التاريخ والفترة</h2><p className="mt-1 text-[10px] text-emerald-100">{conflictBooking.itemName} · {conflictBooking.date} · {conflictBooking.startTime || conflictBooking.timeSlot} — {conflictBooking.endTime || ''}</p></div>
            <button type="button" onClick={() => setConflictBooking(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10" aria-label="إغلاق"><X className="h-5 w-5" /></button>
          </header>
          <div className="space-y-3 p-4">
            {conflictActionError && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">{conflictActionError}</div>}
            {profilesLoading && <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-emerald-800"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل الحسابات…</div>}
            {conflictAccounts.map(({ key, requests }) => {
              const booking = requests[0];
              const profile = requesterProfiles[key];
              const name = profile?.name || booking.requesterName || booking.customerName || 'صاحب الطلب';
              const phone = profile?.phone || booking.requesterPhone || booking.customerPhone || '';
              return <article key={key} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/60 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-emerald-600 bg-emerald-50 text-emerald-800">{profile?.profileImageUrl ? <img src={profile.profileImageUrl} alt={name} className="h-full w-full object-cover" /> : <User className="h-5 w-5" />}</div>
                  <button type="button" onClick={() => { setConflictBooking(null); void onOpenRequester?.(booking); }} className="min-w-0 flex-1 text-right">
                    <b className="block truncate text-sm text-gray-950">{name}</b>
                    {phone && <span className="mt-1 flex items-center gap-1 text-[10px] text-gray-500" dir="ltr"><Phone className="h-3 w-3" />{phone}</span>}
                    <span className="mt-1 block text-[9px] font-bold text-emerald-700">عرض الملف الشخصي</span>
                  </button>
                  {requests.length > 1 && <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-600">{requests.length} طلبات من نفس الحساب</span>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={!!updatingBookingId} onClick={() => void confirmBookingUpdate(booking, 'مقبول', true)} className="rounded-xl bg-emerald-100 py-2.5 text-xs font-black text-emerald-800 disabled:opacity-50"><CheckCircle2 className="ml-1 inline h-4 w-4" />{updatingBookingId === booking.id ? 'جاري التنفيذ…' : 'قبول'}</button>
                  <button type="button" disabled={!!updatingBookingId} onClick={() => void confirmBookingUpdate(booking, 'مرفوض', true)} className="rounded-xl bg-rose-100 py-2.5 text-xs font-black text-rose-800 disabled:opacity-50"><XCircle className="ml-1 inline h-4 w-4" />رفض</button>
                </div>
              </article>;
            })}
          </div>
        </section>
      </div>}

    </div>
  );
};
