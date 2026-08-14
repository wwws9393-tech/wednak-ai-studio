import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Star, MapPin, Users, Sparkles, Heart, ArrowLeft, Shield, Calendar, Clock, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { formatAreaWithCity } from '../lib/location';
import { Hall, UserProfile, Booking, FeedPost, BusinessOffer } from '../types';
import { getIraqTodayDate, PendingAvailabilityRange, subscribeBookingAvailability } from '../lib/firebase';
import { MediaViewer } from './MediaViewer';
import { MediaThumbnail } from './MediaThumbnail';
import { HallMap } from './HallMap';
import { FeaturesDisplay } from './BusinessFeatures';
import { BusinessOffersShowcase } from './BusinessOffersShowcase';

interface HallDetailsModalProps {
  hall: Hall | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onBookHall: (hall: Hall) => void;
  currentUser?: UserProfile;
  bookings?: Booking[];
  posts?: FeedPost[];
  offers?: BusinessOffer[];
}

const FALLBACK_HALL_IMAGE = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80';

export const HallDetailsModal: React.FC<HallDetailsModalProps> = ({
  hall,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onBookHall,
  currentUser,
  posts = [],
  offers = [],
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => getIraqTodayDate());
  const [busyMinutes, setBusyMinutes] = useState<number[]>([]);
  const [pendingRanges, setPendingRanges] = useState<PendingAvailabilityRange[]>([]);
  const [viewingPost,setViewingPost]=useState<FeedPost|null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  const galleryImages = useMemo(() => {
    if (!hall) return [] as string[];
    const raw = [hall.coverImage, ...(Array.isArray(hall.images) ? hall.images : [])]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    return Array.from(new Set(raw));
  }, [hall]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveImageIndex(0);
    requestAnimationFrame(() => { if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0; });
  }, [hall?.id, isOpen]);

  useEffect(() => { if (activeImageIndex >= galleryImages.length) setActiveImageIndex(0); }, [galleryImages.length, activeImageIndex]);

  useEffect(() => {
    const itemId = hall?.id;
    if (!isOpen || !itemId || !selectedCalendarDate) { setBusyMinutes([]); setPendingRanges([]); return; }
    return subscribeBookingAvailability(itemId, selectedCalendarDate, (availability) => {
      setBusyMinutes(availability.acceptedMinutes);
      setPendingRanges(availability.pendingRanges);
    });
  }, [isOpen, hall?.id, selectedCalendarDate]);

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
  const slotIsPending = (slot: string) => slotMinutes(slot).some((minute) => pendingRanges.some((range) => minute >= range.startMinute && minute < range.endMinute));

  if (!isOpen || !hall) return null;

  const isSelfHall = currentUser && (currentUser.id === hall.ownerId || currentUser.ownedHallId === hall.id);
  const mainImage = galleryImages[activeImageIndex] || galleryImages[0] || FALLBACK_HALL_IMAGE;
  const safeRating = Number.isFinite(Number(hall.rating)) ? Number(hall.rating) : 0;
  const safeReviews = Number.isFinite(Number(hall.reviewsCount)) ? Number(hall.reviewsCount) : 0;
  const safePrice = Number.isFinite(Number(hall.price)) ? Number(hall.price) : 0;
  const safeDeposit = Number.isFinite(Number(hall.deposit)) ? Number(hall.deposit) : 0;
  const safeCapacity = Number.isFinite(Number(hall.capacity)) ? Number(hall.capacity) : 0;
  const priceText = `${safePrice.toLocaleString('en-US')} د.ع`;
  const depositText = `${safeDeposit.toLocaleString('en-US')} د.ع`;
  const hallPosts = posts.filter((post) => post.targetType === 'hall' && post.targetId === hall.id);

  const STANDARD_SLOTS = [
    'صباحي (10:00 ص - 2:00 ظ)',
    'مسائي (6:00 م - 11:00 م)',
    'ليلي سهرة (11:00 م - 2:00 ص)',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" id="hall-details-modal-overlay">
      <div ref={modalScrollRef} className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-100 my-auto">
        <div className="relative h-72 sm:h-80 w-full bg-black overflow-hidden rounded-t-3xl">
          <img src={mainImage} alt={hall.name} className="w-full h-full object-cover" decoding="async" onError={(e) => { e.currentTarget.src = FALLBACK_HALL_IMAGE; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          <button onClick={onClose} className="absolute top-4 left-4 z-10 p-2.5 rounded-full bg-black/55 text-white hover:bg-black/80 shadow-md" id="close-hall-modal-btn"><X className="w-5 h-5" /></button>
          <button onClick={() => onToggleFavorite(hall.id, 'hall')} className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md shadow-md ${isFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 text-gray-800 hover:text-rose-500'}`} id="favorite-btn-in-hall-modal"><Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} /></button>
          <div className="absolute bottom-0 right-0 left-0 p-5 pt-16 text-white" dir="rtl">
            {hall.category && <span className="bg-amber-500 text-black text-xs font-black px-3 py-1 rounded-lg inline-block mb-2">{hall.category}</span>}
            <h2 className="text-2xl sm:text-3xl font-black leading-tight drop-shadow-md">{hall.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-white/95">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber-300 shrink-0" /><span>{formatAreaWithCity(hall.location, hall.city)}</span></span>
              <span className="flex items-center gap-1.5 font-bold text-amber-300"><Star className="w-4 h-4 fill-current shrink-0" /><span>{safeRating.toFixed(1)} ({safeReviews} تقييم)</span></span>
            </div>
          </div>
        </div>

        {galleryImages.length > 1 && <div className="bg-white border-b border-gray-100 px-4 py-3" dir="rtl"><div className="flex items-center gap-2 overflow-x-auto pb-1">{galleryImages.map((img, idx) => <button key={`${img}-${idx}`} type="button" onClick={() => setActiveImageIndex(idx)} className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 bg-gray-100 transition-all ${activeImageIndex === idx ? 'border-emerald-600 shadow-sm' : 'border-gray-200 opacity-85 hover:opacity-100'}`} aria-label={`عرض الصورة ${idx + 1}`}><img src={img} alt={`صورة ${idx + 1} من ${hall.name}`} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = FALLBACK_HALL_IMAGE; }} />{activeImageIndex === idx && <span className="absolute inset-0 ring-2 ring-inset ring-emerald-600 rounded-lg" />}</button>)}</div></div>}

        <div className="p-5 space-y-5" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/80"><span className="text-[11px] text-emerald-800 font-semibold block">سعر الحجز الشامل</span><span className="text-base font-black text-emerald-900">{priceText}</span></div>
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100/80"><span className="text-[11px] text-amber-800 font-semibold block">العربون المطلوب للتأكيد</span><span className="text-base font-black text-amber-900">{depositText}</span></div>
            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100/80"><span className="text-[11px] text-blue-800 font-semibold block">سعة الضيوف</span><span className="text-base font-black text-blue-900 flex items-center gap-1"><Users className="w-4 h-4 text-blue-600" /> {safeCapacity} شخص</span></div>
          </div>

          <HallMap hallName={hall.name} coordinates={hall.mapLatitude != null && hall.mapLongitude != null ? { latitude: hall.mapLatitude, longitude: hall.mapLongitude } : null}/>

          <div><h3 className="text-sm font-bold text-gray-900 mb-1">عن القاعة:</h3><p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">{hall.description || 'لا يوجد وصف مضاف بعد.'}</p></div>

          <BusinessOffersShowcase offers={offers} targetId={hall.id} ownerName={hall.name} ownerImage={hall.profileImageUrl || hall.coverImage || mainImage} />

          {hallPosts.length > 0 && <div><h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500"/>معرض أعمال القاعة ({hallPosts.length})</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{hallPosts.map(post=><button onClick={()=>setViewingPost(post)} key={post.id} className="text-right rounded-2xl overflow-hidden border bg-gray-100 shadow-sm hover:shadow-lg transition"><div className="aspect-square relative"><MediaThumbnail url={post.mediaUrl} type={post.mediaType} thumbnailUrl={post.thumbnailUrl} alt={post.title} fallbackUrl={FALLBACK_HALL_IMAGE} /><div className="absolute bottom-0 inset-x-0 bg-black/65 text-white p-2"><b className="text-[11px] block">{post.title}</b><span className="text-[9px] line-clamp-1">{post.caption||'بدون وصف'}</span></div></div></button>)}</div></div>}

          <FeaturesDisplay features={hall.features} title="المميزات المشمولة في الحجز" />

          <div className="bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/60 p-4 rounded-3xl border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3"><div><h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-emerald-700" />جدول المواعيد والتوفر لـ ({hall.name})</h3><p className="text-[11px] text-gray-500">الأحمر محجوز، والبرتقالي قيد المراجعة، والأخضر متاح</p></div><input type="date" value={selectedCalendarDate} onChange={(e) => setSelectedCalendarDate(e.target.value)} min={getIraqTodayDate()} className="px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-gray-800" id="hall-calendar-date-picker" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{STANDARD_SLOTS.map((slot) => { const isBooked = slotIsBooked(slot); const isPending = !isBooked && slotIsPending(slot); return <div key={slot} className={`p-3 rounded-2xl border text-xs ${isBooked ? 'bg-rose-50/80 border-rose-200 text-rose-900' : isPending ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'}`}><div className="flex items-center justify-between mb-1"><span className="font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{slot.split(' ')[0]}</span>{isBooked ? <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1"><AlertCircle className="w-3 h-3" />غير متاح</span> : isPending ? <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1"><Clock className="w-3 h-3" />قيد المراجعة</span> : <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1"><Check className="w-3 h-3" />متاح</span>}</div><span className="text-[10px] text-gray-600">{slot}</span></div>; })}</div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium"><Shield className="w-5 h-5 text-amber-600 shrink-0" /><span>حجزك محمي وموثق بواسطة منصة Wedنك.</span></div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between gap-4 rounded-b-3xl" dir="rtl"><div><span className="text-[10px] text-gray-500 block">الإجمالي بالدينار العراقي:</span><span className="text-lg font-black text-emerald-900">{priceText}</span></div>{!isSelfHall ? <button onClick={() => { onClose(); onBookHall(hall); }} className="px-5 sm:px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-2 shrink-0" id="modal-direct-book-hall-btn"><Calendar className="w-4 h-4" /><span>تأكيد موعد الحجز</span><ArrowLeft className="w-4 h-4" /></button> : <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-amber-600" /><span>هذه قاعتك الخاصة</span></div>}</div>
      </div>{viewingPost&&<MediaViewer url={viewingPost.mediaUrl} type={viewingPost.mediaType} title={viewingPost.title} description={viewingPost.caption} onClose={()=>setViewingPost(null)} onPrevious={hallPosts.length>1?()=>{const i=hallPosts.findIndex(x=>x.id===viewingPost.id);setViewingPost(hallPosts[(i-1+hallPosts.length)%hallPosts.length])}:undefined} onNext={hallPosts.length>1?()=>{const i=hallPosts.findIndex(x=>x.id===viewingPost.id);setViewingPost(hallPosts[(i+1)%hallPosts.length])}:undefined}/>}
    </div>
  );
};
