import React, { useEffect } from 'react';
import { ArrowLeft, CalendarDays, Percent, Sparkles, Tag, X } from 'lucide-react';
import { BusinessOffer } from '../types';

interface OfferCardProps {
  offer: BusinessOffer;
  ownerName: string;
  ownerImage: string;
  onOpen: () => void;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer, ownerName, ownerImage, onOpen }) => {
  const discount = offer.originalPrice > 0 ? Math.max(0, Math.round((1 - offer.offerPrice / offer.originalPrice) * 100)) : 0;
  return <button type="button" onClick={onOpen} className="group text-right overflow-hidden rounded-3xl border border-lime-200/90 bg-gradient-to-br from-[#fbfff4] via-white to-emerald-50 shadow-[0_14px_38px_rgba(6,95,70,0.09)] ring-1 ring-emerald-800/10 hover:-translate-y-1 hover:shadow-xl transition-all">
    <div className="relative p-5 bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-800 text-white overflow-hidden">
      <span className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-lime-200/10"/>
      <div className="relative flex justify-between gap-3"><span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black text-emerald-950 flex items-center gap-1"><Sparkles className="w-3 h-3"/>عرض خاص</span>{discount > 0 && <span className="text-amber-200 font-black text-sm">خصم {discount}%</span>}</div>
      <h3 className="relative mt-4 text-lg font-black text-amber-100 line-clamp-1">{offer.title}</h3>
    </div>
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3"><img src={ownerImage} alt={ownerName} className="w-11 h-11 rounded-full object-cover border-2 border-lime-200 bg-white"/><div className="min-w-0"><b className="block truncate text-sm text-gray-900">{ownerName}</b><span className="text-[10px] text-emerald-700">{offer.ownerType}</span></div></div>
      <p className="text-xs text-gray-600 line-clamp-2 min-h-10">{offer.description || 'تفاصيل العرض متاحة عند فتح البطاقة.'}</p>
      <div className="flex items-end justify-between gap-3 border-t border-lime-100 pt-3"><div><span className="text-[10px] text-gray-400 line-through">{Number(offer.originalPrice).toLocaleString('ar-IQ')} د.ع</span><b className="block text-lg text-emerald-800">{Number(offer.offerPrice).toLocaleString('ar-IQ')} د.ع</b></div><span className="text-xs font-black text-emerald-800 flex items-center gap-1">عرض التفاصيل<ArrowLeft className="w-4 h-4"/></span></div>
    </div>
  </button>;
};

export const OfferDetailsModal: React.FC<Omit<OfferCardProps, 'onOpen'> & { onClose: () => void; onOpenOwner: () => void }> = ({ offer, ownerName, ownerImage, onClose, onOpenOwner }) => {
  const discount = offer.originalPrice > 0 ? Math.max(0, Math.round((1 - offer.offerPrice / offer.originalPrice) * 100)) : 0;
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); }; }, [onClose]);
  return <div className="fixed inset-0 z-[130] bg-slate-950/75 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
    <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-lime-200 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
      <header className="relative bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-800 p-5 text-white"><button type="button" onClick={onClose} className="absolute left-4 top-4 w-10 h-10 rounded-full bg-white/10 grid place-items-center"><X className="w-5 h-5"/></button><span className="inline-flex rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black text-emerald-950"><Percent className="w-3 h-3 ml-1"/>عرض ويدنك {discount}%</span><h2 className="mt-4 text-xl font-black text-amber-100 pl-12">{offer.title}</h2></header>
      <div className="p-5 space-y-5">
        <button type="button" onClick={onOpenOwner} className="w-full rounded-2xl border border-lime-200 bg-lime-50/50 p-3 flex items-center gap-3 text-right"><img src={ownerImage} alt={ownerName} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-700"/><span className="min-w-0 flex-1"><b className="block truncate">{ownerName}</b><small className="text-emerald-700">{offer.ownerType} · اضغط لزيارة الصفحة</small></span><ArrowLeft className="w-5 h-5 text-emerald-700"/></button>
        <p className="text-sm leading-7 text-gray-700">{offer.description || 'لا توجد تفاصيل إضافية لهذا العرض.'}</p>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3"><Tag className="w-4 h-4 text-emerald-700"/><small className="block mt-2 text-gray-500">سعر العرض</small><b className="text-emerald-800">{Number(offer.offerPrice).toLocaleString('ar-IQ')} د.ع</b></div><div className="rounded-2xl bg-amber-50 border border-amber-200 p-3"><CalendarDays className="w-4 h-4 text-amber-700"/><small className="block mt-2 text-gray-500">مدة العرض</small><b className="text-[11px] text-amber-900" dir="ltr">{offer.startDate} — {offer.endDate}</b></div></div>
      </div>
    </div>
  </div>;
};
