import React, { useEffect, useMemo, useState } from 'react';
import { X, Star, MapPin, Phone, Heart, CheckCircle2, Camera, Calendar, Shield, Clock, Check, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { ServiceProvider, UserProfile, Booking, FeedPost } from '../types';
import { subscribeAvailability } from '../lib/firebase';
import { MediaViewer } from './MediaViewer';

interface ServiceProviderDetailsModalProps {
  provider: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onBookProvider: (provider: ServiceProvider) => void;
  currentUser?: UserProfile;
  bookings?: Booking[];
  posts?: FeedPost[];
}

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

export const ServiceProviderDetailsModal: React.FC<ServiceProviderDetailsModalProps> = ({
  provider,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onBookProvider,
  currentUser,
  posts = [],
}) => {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [busyMinutes, setBusyMinutes] = useState<number[]>([]);
  const [viewing,setViewing]=useState<{url:string,type:'image'|'video',title?:string,description?:string}|null>(null);

  useEffect(() => {
    const itemId = provider?.id;
    if (!isOpen || !itemId || !selectedCalendarDate) { setBusyMinutes([]); return; }
    return subscribeAvailability(itemId, selectedCalendarDate, setBusyMinutes);
  }, [isOpen, provider?.id, selectedCalendarDate]);

  const busySet = useMemo(() => new Set(busyMinutes), [busyMinutes]);
  const slotMinutes = (slot: string) => {
    let start = 1080, end = 1380;
    if (slot.includes('صباحي')) { start = 600; end = 840; }
    else if (slot.includes('ليلي')) { start = 1380; end = 1560; }
    const result: number[] = [];
    for (let minute = start; minute < end; minute += 30) result.push(minute);
    return result;
  };
  const slotIsBooked = (slot: string) => slotMinutes(slot).some((minute) => busySet.has(minute));

  if (!isOpen || !provider) return null;

  const isSelfProvider = currentUser && (currentUser.id === provider.ownerId || currentUser.ownedProviderId === provider.id);
  const providerPosts = posts.filter((post) => post.targetType === 'provider' && post.targetId === provider.id);
  const portfolio = Array.isArray(provider.portfolio) ? provider.portfolio : [];
  const allMedia=[...portfolio.map(url=>({url,type:isVideoUrl(url)?'video' as const:'image' as const,description:provider.portfolioDescriptions?.[url]})),...providerPosts.map(post=>({url:post.mediaUrl,type:post.mediaType,title:post.title,description:post.caption}))];
  const safePrice = Number.isFinite(Number(provider.priceStart)) ? Number(provider.priceStart) : 0;
  const priceText = `${safePrice.toLocaleString('en-US')} د.ع`;
  const safeRating = Number.isFinite(Number(provider.rating)) ? Number(provider.rating) : 0;
  const safeReviews = Number.isFinite(Number(provider.reviewsCount)) ? Number(provider.reviewsCount) : 0;

  const STANDARD_SLOTS = [
    'صباحي (10:00 ص - 2:00 ظ)',
    'مسائي (6:00 م - 11:00 م)',
    'ليلي سهرة (11:00 م - 2:00 ص)',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" id="provider-details-modal-overlay">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-gray-200 flex flex-col justify-between my-auto">
        <div className="relative h-56 sm:h-72 w-full bg-black rounded-t-3xl overflow-visible mb-16">
          <img src={provider.coverImage || provider.avatar} alt={provider.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button onClick={onClose} className="absolute top-4 left-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/80 shadow-md" id="close-provider-modal-btn"><X className="w-5 h-5" /></button>
          <button onClick={() => onToggleFavorite(provider.id, 'provider')} className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md shadow-md ${isFavorite ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-800 hover:text-rose-500'}`} id="favorite-btn-in-provider-modal"><Heart className={`w-5 h-5 ${isFavorite ? 'fill-current text-white' : ''}`} /></button>
          <div className="absolute -bottom-14 right-5 left-5 flex items-end gap-4" dir="rtl">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-xl shrink-0"><img src={provider.avatar || provider.coverImage} alt={provider.name} className="w-full h-full object-cover" /></div>
            <div className="min-w-0 pb-2 text-gray-900"><span className="bg-emerald-700 text-white text-[10px] font-black px-2.5 py-1 rounded-full mb-1 inline-block">{provider.serviceCategory}</span><h2 className="text-xl sm:text-2xl font-black flex items-center gap-1.5">{provider.name}{provider.isVerified && <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />}</h2><div className="flex flex-wrap items-center gap-3 text-xs text-gray-600"><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-700" />{provider.location || provider.city}</span><span className="flex items-center gap-1 text-amber-700 font-bold"><Star className="w-3.5 h-3.5 fill-current" />{safeRating.toFixed(1)} ({safeReviews} تقييم)</span></div></div>
          </div>
        </div>

        <div className="p-5 space-y-5" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100"><span className="text-[11px] text-emerald-800 font-semibold block">تبدأ العروض من:</span><span className="text-base font-black text-emerald-900">{priceText}</span></div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex items-center justify-between"><div><span className="text-[11px] text-gray-500 block">الهاتف المباشر:</span><span className="text-xs font-bold text-gray-900 text-left dir-ltr block">{provider.phone || 'غير مضاف'}</span></div>{provider.phone && <a href={`tel:${provider.phone}`} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700" title="اتصال"><Phone className="w-4 h-4" /></a>}</div>
          </div>

          <div><h3 className="text-sm font-bold text-gray-900 mb-1">تفاصيل الخدمة:</h3><p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">{provider.description || 'لم يضف مزود الخدمة وصفاً بعد.'}</p></div>

          {(portfolio.length > 0 || providerPosts.length > 0) && <div><h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5"><Camera className="w-4 h-4 text-emerald-600" />معرض الأعمال ({portfolio.length + providerPosts.length})</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{portfolio.map((url, idx) => <button onClick={()=>setViewing({url,type:isVideoUrl(url)?'video':'image',description:provider.portfolioDescriptions?.[url]})} key={`portfolio-${idx}`} className="text-right aspect-square rounded-xl overflow-hidden border bg-gray-100 relative">{isVideoUrl(url) ? <video src={url} muted className="w-full h-full object-cover" /> : <img src={url} alt={`عمل ${idx + 1}`} className="w-full h-full object-cover" />}<span className="absolute bottom-0 inset-x-0 bg-black/60 text-white p-2 text-[10px]">{provider.portfolioDescriptions?.[url]||'بدون وصف'}</span></button>)}{providerPosts.map(post => <button onClick={()=>setViewing({url:post.mediaUrl,type:post.mediaType,title:post.title,description:post.caption})} key={post.id} className="text-right aspect-square rounded-xl overflow-hidden border bg-gray-100 relative">{post.mediaType === 'video' ? <video src={post.mediaUrl} muted className="w-full h-full object-cover" /> : <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />}<div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 text-white text-[10px] line-clamp-1">{post.title}</div></button>)}</div></div>}

          <div className="bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/60 p-4 rounded-3xl border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3"><div><h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-emerald-700" />جدول مواعيد الخدمة والتوفر لـ ({provider.name})</h3><p className="text-[11px] text-gray-500">اختر التاريخ للتحقق من الأوقات المتاحة للحجز المؤكد</p></div><input type="date" value={selectedCalendarDate} onChange={(e) => setSelectedCalendarDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-gray-800" id="provider-calendar-date-picker" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{STANDARD_SLOTS.map((slot) => { const isBooked = slotIsBooked(slot); return <div key={slot} className={`p-3 rounded-2xl border text-xs ${isBooked ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'}`}><div className="flex items-center justify-between mb-1"><span className="font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{slot.split(' ')[0]}</span>{isBooked ? <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1"><AlertCircle className="w-3 h-3" />غير متاح</span> : <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1"><Check className="w-3 h-3" />متاح</span>}</div><span className="text-[10px] text-gray-600">{slot}</span></div>; })}</div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900"><Shield className="w-5 h-5 text-amber-600 shrink-0" /><span>صفحة مزود الخدمة موثقة داخل منصة Wedنك.</span></div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between rounded-b-3xl" dir="rtl"><div><span className="text-[10px] text-gray-500 block">السعر الأساسي:</span><span className="text-base font-black text-emerald-900">{priceText}</span></div>{!isSelfProvider ? <button onClick={() => { onClose(); onBookProvider(provider); }} className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-2" id="modal-direct-book-provider-btn"><Calendar className="w-4 h-4" /><span>إرسال طلب حجز</span></button> : <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-amber-600" /><span>هذه خدمتك الخاصة</span></div>}</div>
      </div>{viewing&&<MediaViewer {...viewing} onClose={()=>setViewing(null)} onPrevious={allMedia.length>1?()=>{const i=allMedia.findIndex(x=>x.url===viewing.url);setViewing(allMedia[(i-1+allMedia.length)%allMedia.length])}:undefined} onNext={allMedia.length>1?()=>{const i=allMedia.findIndex(x=>x.url===viewing.url);setViewing(allMedia[(i+1)%allMedia.length])}:undefined}/>}
    </div>
  );
};
