import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, CheckCircle2, XCircle, Clock, Sparkles, Save, AlertCircle, Tag, Image as ImageIcon } from 'lucide-react';
import { Hall, Booking, UserProfile, FeedPost } from '../types';
import { createBusinessOffer, saveOwnedHall } from '../lib/business';

interface OwnerHomeViewProps {
  currentUser: UserProfile;
  halls: Hall[];
  bookings: Booking[];
  onUpdateHall: (updatedHall: Hall) => void;
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status']) => Promise<void> | void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => Promise<void> | void;
}

const emptyHall = (user: UserProfile): Hall => ({
  id: '',
  ownerId: user.id,
  name: user.hallName || '',
  location: '',
  city: user.city || 'بغداد',
  price: 0,
  priceFormatted: '0 د.ع',
  capacity: 100,
  rating: 0,
  reviewsCount: 0,
  images: [],
  coverImage: '',
  profileImageUrl: user.profileImageUrl || '',
  phone: user.phone,
  description: '',
  deposit: 0,
  depositFormatted: '0 د.ع',
  features: [],
  category: 'قاعات متوسطة',
});

export const OwnerHomeView: React.FC<OwnerHomeViewProps> = ({
  currentUser,
  halls,
  bookings,
  onUpdateHall,
  onUpdateBookingStatus,
  onCreatePost,
}) => {
  const persistedHall = useMemo(
    () => halls.find((hall) => hall.ownerId === currentUser.id || (!!currentUser.ownedHallId && hall.id === currentUser.ownedHallId)),
    [halls, currentUser.id, currentUser.ownedHallId]
  );

  const [draft, setDraft] = useState<Hall>(() => persistedHall || emptyHall(currentUser));
  const [isEditing, setIsEditing] = useState(!persistedHall);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerPrice, setOfferPrice] = useState(0);
  const [offerStart, setOfferStart] = useState('');
  const [offerEnd, setOfferEnd] = useState('');

  useEffect(() => {
    if (persistedHall) {
      setDraft(persistedHall);
      setIsEditing(false);
    }
  }, [persistedHall]);

  const hallBookings = bookings.filter((booking) => booking.targetOwnerId === currentUser.id && booking.itemType === 'hall');
  const pendingBookings = hallBookings.filter((booking) => booking.status === 'قيد المراجعة' || booking.status === 'pending');
  const acceptedBookings = hallBookings.filter((booking) => booking.status === 'مقبول' || booking.status === 'accepted');

  const setField = <K extends keyof Hall>(key: K, value: Hall[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const saveHall = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!draft.name.trim() || !draft.location.trim()) return setError('اسم القاعة والموقع مطلوبان.');
    if (draft.price <= 0 || draft.deposit < 0 || draft.capacity <= 0) return setError('تحقق من السعر والعربون والسعة.');

    setIsSaving(true);
    try {
      const saved = await saveOwnedHall({
        ...draft,
        ownerId: currentUser.id,
        images: [draft.coverImage || draft.images[0] || ''].filter(Boolean),
        phone: currentUser.phone,
      });
      setDraft(saved);
      onUpdateHall(saved);
      setIsEditing(false);
      setMessage('تم حفظ صفحة القاعة في Firestore بنجاح.');
    } catch (err) {
      console.error('Owner hall save failed:', err);
      setError(err instanceof Error ? err.message : 'تعذر حفظ القاعة.');
    } finally {
      setIsSaving(false);
    }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const activeHall = persistedHall || (draft.id ? draft : null);
    if (!activeHall) return setError('احفظ صفحة القاعة أولاً قبل النشر.');
    if (!postTitle.trim() || !postCaption.trim()) return setError('عنوان المنشور والوصف مطلوبان.');
    try {
      await onCreatePost({
        authorId: currentUser.id,
        authorName: activeHall.name,
        authorAvatar: activeHall.profileImageUrl || activeHall.coverImage || activeHall.images[0] || '',
        authorRole: 'صاحب قاعة',
        targetType: 'hall',
        targetId: activeHall.id,
        title: postTitle.trim(),
        caption: postCaption.trim(),
        mediaType: 'image',
        mediaUrl: postMediaUrl.trim() || activeHall.coverImage || activeHall.images[0] || '',
        city: activeHall.city,
      });
      setPostTitle(''); setPostCaption(''); setPostMediaUrl('');
      setMessage('تم نشر المحتوى في Explore.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر النشر.');
    }
  };

  const publishOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const activeHall = persistedHall || (draft.id ? draft : null);
    if (!activeHall) return setError('احفظ صفحة القاعة أولاً قبل إنشاء العرض.');
    try {
      await createBusinessOffer({
        ownerType: 'صاحب قاعة',
        targetId: activeHall.id,
        title: offerTitle,
        description: offerDescription,
        originalPrice: activeHall.price,
        offerPrice,
        startDate: offerStart,
        endDate: offerEnd,
      });
      setOfferTitle(''); setOfferDescription(''); setOfferPrice(0); setOfferStart(''); setOfferEnd('');
      setMessage('تم إنشاء العرض بنجاح.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء العرض.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 dir-rtl" id="owner-home-dashboard">
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 p-6 rounded-3xl text-white shadow-xl">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full">حساب صاحب قاعة</span>
        <h1 className="text-2xl font-black text-amber-100 mt-2">أهلاً {currentUser.name}</h1>
        <p className="text-xs text-gray-200 mt-1">بيانات القاعة والحجوزات هنا خاصة بحسابك فقط.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-white/10 p-3 rounded-2xl"><Clock className="w-4 h-4 text-amber-300"/><b className="block mt-1">{pendingBookings.length}</b><span className="text-[11px]">طلبات معلقة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><CheckCircle2 className="w-4 h-4 text-emerald-300"/><b className="block mt-1">{acceptedBookings.length}</b><span className="text-[11px]">حجوزات مؤكدة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><Building2 className="w-4 h-4 text-blue-300"/><b className="block mt-1">{draft.capacity}</b><span className="text-[11px]">السعة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><Tag className="w-4 h-4 text-amber-300"/><b className="block mt-1">{draft.price.toLocaleString('ar-IQ')}</b><span className="text-[11px]">السعر د.ع</span></div>
        </div>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-700"/>صفحة القاعة</h2>{persistedHall && <button onClick={() => setIsEditing((v) => !v)} className="text-xs font-bold text-emerald-800 underline">{isEditing ? 'إلغاء' : 'تعديل'}</button>}</div>

          {!isEditing && persistedHall ? (
            <div className="space-y-3">
              <div className="h-44 bg-gray-100 rounded-2xl overflow-hidden">{(persistedHall.coverImage || persistedHall.images[0]) ? <img src={persistedHall.coverImage || persistedHall.images[0]} className="w-full h-full object-cover" alt={persistedHall.name}/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon/></div>}</div>
              <h3 className="text-lg font-black">{persistedHall.name}</h3><p className="text-xs text-gray-600">{persistedHall.location} — {persistedHall.city}</p><p className="text-xs text-gray-600">{persistedHall.description}</p>
            </div>
          ) : (
            <form onSubmit={saveHall} className="space-y-3">
              <input value={draft.name} onChange={(e) => setField('name', e.target.value)} placeholder="اسم القاعة" className="w-full px-3 py-2 border rounded-xl text-xs" required/>
              <div className="grid grid-cols-2 gap-2"><input value={draft.location} onChange={(e) => setField('location', e.target.value)} placeholder="العنوان" className="px-3 py-2 border rounded-xl text-xs" required/><input value={draft.city} onChange={(e) => setField('city', e.target.value)} placeholder="المحافظة" className="px-3 py-2 border rounded-xl text-xs" required/></div>
              <input value={draft.coverImage || ''} onChange={(e) => setField('coverImage', e.target.value)} placeholder="رابط الصورة الرئيسية" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr"/>
              <input value={draft.profileImageUrl || ''} onChange={(e) => setField('profileImageUrl', e.target.value)} placeholder="رابط صورة الحساب" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr"/>
              <div className="grid grid-cols-3 gap-2"><input type="number" value={draft.price} onChange={(e) => setField('price', Number(e.target.value))} placeholder="السعر" className="px-2 py-2 border rounded-xl text-xs"/><input type="number" value={draft.deposit} onChange={(e) => setField('deposit', Number(e.target.value))} placeholder="العربون" className="px-2 py-2 border rounded-xl text-xs"/><input type="number" value={draft.capacity} onChange={(e) => setField('capacity', Number(e.target.value))} placeholder="السعة" className="px-2 py-2 border rounded-xl text-xs"/></div>
              <textarea value={draft.description} onChange={(e) => setField('description', e.target.value)} placeholder="وصف القاعة" className="w-full px-3 py-2 border rounded-xl text-xs h-20"/>
              <button disabled={isSaving} className="w-full py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-4 h-4"/>{isSaving ? 'جاري الحفظ...' : persistedHall ? 'حفظ التعديلات' : 'إنشاء صفحة القاعة'}</button>
            </form>
          )}
        </section>

        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-700"/>الحجوزات الواردة ({hallBookings.length})</h2>
          {hallBookings.length === 0 ? <div className="p-8 text-center text-xs text-gray-500 border border-dashed rounded-2xl">لا توجد حجوزات موجهة إلى قاعتك حالياً.</div> : hallBookings.map((booking) => (
            <div key={booking.id} className="p-4 border rounded-2xl space-y-2">
              <div className="flex justify-between gap-2"><b className="text-xs">{booking.requesterName || booking.customerName}</b><span className="text-[11px]">{booking.status}</span></div>
              <div className="text-[11px] text-gray-600">{booking.date} • {booking.startTime || booking.timeSlot} {booking.endTime ? `- ${booking.endTime}` : ''}</div>
              {(booking.status === 'قيد المراجعة' || booking.status === 'pending') && <div className="flex gap-2"><button onClick={() => onUpdateBookingStatus(booking.id, 'مقبول')} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold"><CheckCircle2 className="inline w-4 h-4 ml-1"/>قبول</button><button onClick={() => onUpdateBookingStatus(booking.id, 'مرفوض')} className="px-3 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold"><XCircle className="inline w-4 h-4 ml-1"/>رفض</button></div>}
            </div>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={publishPost} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>نشر في Explore</h2><input value={postTitle} onChange={(e)=>setPostTitle(e.target.value)} placeholder="عنوان المنشور" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={postCaption} onChange={(e)=>setPostCaption(e.target.value)} placeholder="الوصف" className="w-full px-3 py-2 border rounded-xl text-xs"/><input value={postMediaUrl} onChange={(e)=>setPostMediaUrl(e.target.value)} placeholder="رابط الصورة أو الوسائط" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr"/><button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold">نشر</button></form>
        <form onSubmit={publishOffer} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Tag className="w-5 h-5 text-emerald-700"/>إنشاء عرض</h2><input value={offerTitle} onChange={(e)=>setOfferTitle(e.target.value)} placeholder="عنوان العرض" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={offerDescription} onChange={(e)=>setOfferDescription(e.target.value)} placeholder="تفاصيل العرض" className="w-full px-3 py-2 border rounded-xl text-xs"/><div className="grid grid-cols-3 gap-2"><input type="number" value={offerPrice} onChange={(e)=>setOfferPrice(Number(e.target.value))} placeholder="سعر العرض" className="px-2 py-2 border rounded-xl text-xs"/><input type="date" value={offerStart} onChange={(e)=>setOfferStart(e.target.value)} className="px-2 py-2 border rounded-xl text-xs"/><input type="date" value={offerEnd} onChange={(e)=>setOfferEnd(e.target.value)} className="px-2 py-2 border rounded-xl text-xs"/></div><button className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">حفظ العرض</button></form>
      </div>
    </div>
  );
};
