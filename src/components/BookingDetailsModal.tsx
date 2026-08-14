import React from 'react';
import { X, MapPin, Users, CheckCircle2, Clock, XCircle, AlertCircle, Trash2, UserRoundX } from 'lucide-react';
import { Booking, BookingStatus, UserProfile } from '../types';

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelBooking: (bookingId: string) => void;
  currentUser: UserProfile;
  onUpdateStatus: (bookingId: string, status: BookingStatus) => Promise<void> | void;
  onOpenRequester?: (userId:string)=>void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ booking, isOpen, onClose, onCancelBooking, currentUser, onUpdateStatus, onOpenRequester }) => {
  if (!isOpen || !booking) return null;

  const formatDateTime = (value?: string) => {
    if (!value) return 'غير مسجل';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'قيد المراجعة': case 'pending': return { bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: Clock, text: 'قيد المراجعة والتدقيق' };
      case 'مقبول': case 'accepted': return { bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: CheckCircle2, text: 'حجز مؤكد ومقبول' };
      case 'مرفوض': case 'rejected': return { bg: 'bg-rose-100 text-rose-900 border-rose-300', icon: XCircle, text: 'طلب مرفوض' };
      case 'ملغي': case 'cancelled': return { bg: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircle, text: 'تم إلغاء الحجز' };
      default: return { bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, text: status };
    }
  };

  const statusInfo = getStatusBadge(booking.status);
  const StatusIcon = statusInfo.icon;
  const isCancelled = booking.status === 'ملغي' || booking.status === 'cancelled';
  const isPending = booking.status === 'قيد المراجعة' || booking.status === 'pending';
  const isTargetOwner = booking.targetOwnerId === currentUser.id;
  const confirmStatus = async (status: BookingStatus) => {
    const label = status === 'مقبول' ? 'قبول وتأكيد' : 'رفض';
    if (!window.confirm(`هل تؤكد ${label} هذا الحجز؟`)) return;
    await onUpdateStatus(booking.id, status);
    onClose();
  };
  const cancellationActor = booking.cancelledByRole
    ? `${booking.cancelledByRole}${booking.cancelledByName ? ` — ${booking.cancelledByName}` : ''}`
    : 'غير محدد (حجز قديم قبل إضافة سجل الإلغاء)';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="booking-details-modal-overlay">
      <div className="wednak-booking-card bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-emerald-100 flex flex-col justify-between my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between rounded-t-3xl">
          <div>
            <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest block">كود الحجز المرجعي</span>
            <h2 className="text-lg font-black text-white">{booking.bookingId || booking.id}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" id="close-booking-details-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${statusInfo.bg}`}>
            <StatusIcon className="w-5 h-5 shrink-0" />
            <div><span className="text-xs font-bold block">{statusInfo.text}</span><span className="text-[10px] opacity-80">تاريخ إنشاء الطلب: {formatDateTime(booking.createdAt)}</span></div>
          </div>

          {isCancelled && (
            <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 flex items-start gap-2">
              <UserRoundX className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-rose-600 font-bold block">تم الإلغاء بواسطة</span>
                <strong className="text-xs block">{cancellationActor}</strong>
                {booking.cancelledAt && <span className="text-[10px] text-rose-500 block mt-1">وقت الإلغاء: {formatDateTime(booking.cancelledAt)}</span>}
                {booking.cancellationReason && <span className="text-[10px] text-rose-700 block mt-1">السبب: {booking.cancellationReason}</span>}
              </div>
            </div>
          )}

          <div className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
            <img src={booking.itemImage} alt={booking.itemName} className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'; }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md mb-1 inline-block">{booking.itemType === 'hall' ? 'قاعة أعراس' : 'مزود خدمة'}</span>
              <h3 className="text-sm font-bold text-gray-900 truncate">{booking.itemName}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-emerald-600" />{booking.itemLocation}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200"><span className="text-gray-500 text-[10px] block">تاريخ المناسبة</span><strong className="text-amber-900 text-sm font-bold">{booking.date}</strong></div>
            <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200"><span className="text-gray-500 text-[10px] block">الفترة</span><strong className="text-emerald-900 text-xs font-bold">{booking.timeSlot}</strong></div>
            {booking.guests && <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 col-span-2"><span className="text-gray-500 text-[10px] block">عدد الضيوف المتوقع</span><strong className="text-blue-900 text-xs font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-600" /> {booking.guests} شخص</strong></div>}
          </div>

          <div className="p-3 bg-emerald-950 text-white rounded-2xl flex items-center justify-between text-xs">
            <div><span className="text-emerald-300 text-[10px] block">العربون المسدد/المطلوب</span><strong className="text-amber-300 text-base font-black">{Number(booking.depositAmount || 0).toLocaleString()} د.ع</strong></div>
            <div className="text-left"><span className="text-emerald-300 text-[10px] block">السعر الإجمالي النهائي</span><strong className="text-white text-sm font-bold">{Number(booking.totalPrice || 0).toLocaleString()} د.ع</strong></div>
          </div>

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1 text-xs">
            <div className="flex justify-between text-gray-700"><span>صاحب الحجز:</span><button onClick={()=>booking.requesterId&&onOpenRequester?.(booking.requesterId)} className="font-bold text-emerald-800 underline">{booking.customerName}</button></div>
            <div className="flex justify-between text-gray-700"><span>رقم الهاتف:</span><strong className="text-emerald-800 text-left dir-ltr">{booking.customerPhone}</strong></div>
            <div className="flex justify-between text-gray-700"><span>نوع الحساب:</span><strong>{booking.requesterAccountType || 'زبون'}</strong></div>
            <div className="flex justify-between text-gray-700"><span>معرّف المستخدم:</span><strong className="text-[10px] font-mono dir-ltr">{booking.requesterId || booking.customerId || 'غير مسجل'}</strong></div>
            <div className="pt-2 border-t border-gray-200 text-gray-600"><span className="block text-[10px] font-bold text-gray-500">الملاحظات:</span><p className="text-xs bg-white p-2 rounded-lg border border-gray-200 mt-1">{booking.notes?.trim() || 'لا توجد ملاحظات مضافة'}</p></div>
            <div className="pt-2 border-t text-[11px] space-y-1"><div><b>حالة الدفع:</b> {booking.paymentStatus||'بانتظار الدفع'}</div><div><b>وسيلة الدفع:</b> {booking.paymentMethod||'غير محددة'}</div>{booking.paymentReference&&<div><b>مرجع العملية:</b> <span className="font-mono">{booking.paymentReference}</span></div>}<div><b>وقت الدفع:</b> {formatDateTime(booking.paidAt)}</div></div>
            <div className="pt-2 border-t text-[10px] text-gray-500 flex flex-wrap justify-between gap-2"><span>أُنشئ: {formatDateTime(booking.createdAt)}</span><span>آخر تحديث: {formatDateTime(booking.updatedAt)}</span></div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-3xl">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-300 transition-colors">إغلاق</button>
          <div className="flex items-center gap-2">
          {isTargetOwner && isPending && <><button onClick={()=>void confirmStatus('مقبول')} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>قبول وتأكيد</button><button onClick={()=>void confirmStatus('مرفوض')} className="px-4 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/>رفض</button></>}
          {!isCancelled && booking.status !== 'مرفوض' && booking.status !== 'rejected' && !isPending && (
            <button onClick={() => { if (window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) { onCancelBooking(booking.id); onClose(); } }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs" id="cancel-my-booking-btn"><Trash2 className="w-3.5 h-3.5" /><span>إلغاء الطلب</span></button>
          )}
          {!isTargetOwner && isPending && <button onClick={() => { if (window.confirm('هل تريد إلغاء طلب الحجز المعلّق؟')) { onCancelBooking(booking.id); onClose(); } }} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">إلغاء الطلب</button>}
          </div>
        </div>
      </div>
    </div>
  );
};
