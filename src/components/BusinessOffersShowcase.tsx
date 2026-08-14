import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Percent, Sparkles, Tag } from 'lucide-react';
import { BusinessOffer } from '../types';
import { getIraqTodayDate } from '../lib/firebase';
import { OfferDetailsModal } from './OfferCard';

interface BusinessOffersShowcaseProps {
  offers?: BusinessOffer[];
  targetId: string;
  ownerName: string;
  ownerImage: string;
}

export const BusinessOffersShowcase: React.FC<BusinessOffersShowcaseProps> = ({ offers = [], targetId, ownerName, ownerImage }) => {
  const [selectedOffer, setSelectedOffer] = useState<BusinessOffer | null>(null);
  const activeOffers = useMemo(() => {
    const today = getIraqTodayDate();
    return offers.filter((offer) => offer.targetId === targetId && offer.isActive !== false && offer.startDate <= today && offer.endDate >= today)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [offers, targetId]);

  if (activeOffers.length === 0) return null;
  return <section className="overflow-hidden rounded-3xl border border-lime-200 bg-gradient-to-br from-[#fbfff5] via-white to-emerald-50 shadow-[0_14px_38px_rgba(6,95,70,0.09)]" dir="rtl">
    <header className="relative overflow-hidden bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-800 px-4 py-4 text-white">
      <span className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-lime-200/10" />
      <div className="relative flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-300 text-emerald-950"><Sparkles className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-amber-100">العروض الحالية</h3><p className="text-[10px] text-white/70">عروض خاصة متاحة للحجز الآن</p></div><span className="mr-auto rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black">{activeOffers.length}</span></div>
    </header>
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {activeOffers.map((offer) => {
        const discount = offer.originalPrice > 0 ? Math.max(0, Math.round((1 - offer.offerPrice / offer.originalPrice) * 100)) : 0;
        return <button key={offer.id} type="button" onClick={() => setSelectedOffer(offer)} className="group rounded-2xl border border-lime-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-900"><Percent className="h-3.5 w-3.5" />عرض ويدنك {discount}%</span></div>
          <h4 className="mt-3 line-clamp-1 text-sm font-black text-gray-950">{offer.title}</h4>
          <p className="mt-1 line-clamp-2 min-h-9 text-[10px] leading-5 text-gray-500">{offer.description || 'اضغط لعرض جميع تفاصيل العرض.'}</p>
          <div className="mt-3 flex items-end justify-between border-t border-lime-100 pt-3"><div><span className="block text-[9px] text-gray-400 line-through">{Number(offer.originalPrice).toLocaleString('ar-IQ')} د.ع</span><b className="inline-flex items-center gap-1 text-sm text-emerald-800"><Tag className="h-3.5 w-3.5" />{Number(offer.offerPrice).toLocaleString('ar-IQ')} د.ع</b></div><span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800">التفاصيل<ArrowLeft className="h-3.5 w-3.5" /></span></div>
          <span className="mt-2 flex items-center gap-1 text-[9px] text-gray-500" dir="ltr"><CalendarDays className="h-3 w-3" />{offer.startDate} — {offer.endDate}</span>
        </button>;
      })}
    </div>
    {selectedOffer && <OfferDetailsModal offer={selectedOffer} ownerName={ownerName} ownerImage={ownerImage} onClose={() => setSelectedOffer(null)} onOpenOwner={() => setSelectedOffer(null)} />}
  </section>;
};
