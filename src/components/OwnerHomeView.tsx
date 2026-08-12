import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, CheckCircle2, XCircle, Clock, Sparkles, Save, AlertCircle, Tag, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { Hall, Booking, UserProfile, FeedPost } from '../types';
import { createBusinessOffer, saveOwnedHall } from '../lib/business';
import { uploadOwnerImage } from '../lib/storage';

interface OwnerHomeViewProps {
  currentUser: UserProfile;
  halls: Hall[];
  bookings: Booking[];
  posts?: FeedPost[];
  onUpdateHall: (updatedHall: Hall) => void;
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status']) => Promise<void> | void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
}

const emptyHall = (user: UserProfile): Hall => ({
  id: '', ownerId: user.id, name: user.hallName || '', location: '', city: user.city || 'بغداد',
  price: 0, priceFormatted: '0 د.ع', capacity: 100, rating: 0, reviewsCount: 0, images: [],
  coverImage: '', profileImageUrl: user.profileImageUrl || '', phone: user.phone, description: '',
  deposit: 0, depositFormatted: '0 د.ع', features: [], category: 'قاعات متوسطة',
});

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-bold text-gray-700 block mb-1">{children}</label>
);

export const OwnerHomeView: React.FC<OwnerHomeViewProps> = ({ currentUser, halls, bookings, posts = [], onUpdateHall, onUpdateBookingStatus, onCreatePost, onDeletePost }) => {
  const persistedHall = useMemo(
    () => halls.find((hall) => hall.ownerId === currentUser.id || (!!currentUser.ownedHallId && hall.id === currentUser.ownedHallId)),
    [halls, currentUser.id, currentUser.ownedHallId]
  );
  const [draft, setDraft] = useState<Hall>(() => persistedHall || emptyHall(currentUser));
  const [isEditing, setIsEditing] = useState(!persistedHall);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  useEffect(() => { if (persistedHall) { setDraft(persistedHall); setIsEditing(false); } }, [persistedHall]);

  const hallBookings = bookings.filter((booking) => booking.targetOwnerId === currentUser.id && booking.itemType === 'hall');
  const pendingBookings = hallBookings.filter((booking) => booking.status === 'قيد المراجعة' || booking.status === 'pending');
  const acceptedBookings = hallBookings.filter((booking) => booking.status === 'مقبول' || booking.status === 'accepted');
  const ownPosts = posts.filter((post) => post.authorId === currentUser.id);
  const setField = <K extends keyof Hall>(key: K, value: Hall[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file: File, kind: 'cover' | 'profile' | 'post') => {
    setError(''); setIsUploading(true);
    try {
      const url = await uploadOwnerImage(file, kind === 'cover' ? 'hall-cover' : kind === 'profile' ? 'hall-profile' : 'post-media');
      if (kind === 'cover') setDraft((prev) => ({ ...prev, coverImage: url, images: [url, ...(prev.images || []).filter((v) => v !== url)] }));
      if (kind === 'profile') setDraft((prev) => ({ ...prev, profileImageUrl: url }));
      if (kind === 'post') setPostMediaUrl(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر رفع الصورة.'); }
    finally { setIsUploading(false); }
  };

  const saveHall = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!draft.name.trim() || !draft.location.trim()) return setError('اسم القاعة والعنوان مطلوبان.');
    if (draft.price <= 0) return setError('أدخل سعر القاعة.');
    if (draft.deposit < 0) return setError('مبلغ العربون غير صحيح.');
    if (draft.capacity <= 0) return setError('أدخل سعة القاعة.');
    setIsSaving(true);
    try {
      const saved = await saveOwnedHall({ ...draft, ownerId: currentUser.id, phone: currentUser.phone, images: [draft.coverImage || '', ...(draft.images || [])].filter(Boolean) });
      setDraft(saved); onUpdateHall(saved); setIsEditing(false); setMessage('تم حفظ القاعة بنجاح.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ القاعة.'); }
    finally { setIsSaving(false); }
  };

  const updateBooking = async (bookingId: string, status: Booking['status']) => {
    setError(''); setMessage('');
    try { await onUpdateBookingStatus(bookingId, status); setMessage(status === 'مقبول' ? 'تم قبول الحجز وتثبيت الموعد.' : 'تم رفض الحجز.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الحجز.'); }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const hall = persistedHall || (draft.id ? draft : null);
    if (!hall) return setError('احفظ صفحة القاعة أولاً قبل النشر.');
    if (!postTitle.trim() || !postCaption.trim()) return setError('عنوان المنشور والوصف مطلوبان.');
    if (!postMediaUrl && !hall.coverImage) return setError('اختر صورة للمنشور.');
    try {
      await onCreatePost({ authorId: currentUser.id, authorName: hall.name, authorAvatar: hall.profileImageUrl || hall.coverImage || '', authorRole: 'صاحب قاعة', targetType: 'hall', targetId: hall.id, title: postTitle.trim(), caption: postCaption.trim(), mediaType: 'image', mediaUrl: postMediaUrl || hall.coverImage || '', city: hall.city });
      setPostTitle(''); setPostCaption(''); setPostMediaUrl(''); setMessage('تم نشر المحتوى في Explore.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر النشر.'); }
  };

  const publishOffer = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const hall = persistedHall || (draft.id ? draft : null);
    if (!hall) return setError('احفظ صفحة القاعة أولاً قبل إنشاء العرض.');
    if (!offerStart || !offerEnd) return setError('حدد تاريخ بداية العرض ونهايته.');
    try {
      await createBusinessOffer({ ownerType: 'صاحب قاعة', targetId: hall.id, title: offerTitle, description: offerDescription, originalPrice: hall.price, offerPrice, startDate: offerStart, endDate: offerEnd });
      setOfferTitle(''); setOfferDescription(''); setOfferPrice(0); setOfferStart(''); setOfferEnd(''); setMessage('تم إنشاء العرض بنجاح.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء العرض.'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 dir-rtl" id="owner-home-dashboard">
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 p-6 rounded-3xl text-white shadow-xl">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full">حساب صاحب قاعة</span><h1 className="text-2xl font-black text-amber-100 mt-2">أهلاً {currentUser.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5"><div className="bg-white/10 p-3 rounded-2xl"><Clock className="w-4 h-4 text-amber-300"/><b className="block mt-1">{pendingBookings.length}</b><span className="text-[11px]">طلبات معلقة</span></div><div className="bg-white/10 p-3 rounded-2xl"><CheckCircle2 className="w-4 h-4 text-emerald-300"/><b className="block mt-1">{acceptedBookings.length}</b><span className="text-[11px]">حجوزات مؤكدة</span></div><div className="bg-white/10 p-3 rounded-2xl"><Building2 className="w-4 h-4 text-blue-300"/><b className="block mt-1">{draft.capacity}</b><span className="text-[11px]">السعة</span></div><div className="bg-white/10 p-3 rounded-2xl"><Tag className="w-4 h-4 text-amber-300"/><b className="block mt-1">{Number(draft.price || 0).toLocaleString('ar-IQ')}</b><span className="text-[11px]">السعر د.ع</span></div></div>
      </div>
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-700"/>صفحة القاعة</h2>{persistedHall && <button onClick={() => setIsEditing((v) => !v)} className="text-xs font-bold text-emerald-800 underline">{isEditing ? 'إلغاء' : 'تعديل'}</button>}</div>
          {!isEditing && persistedHall ? <div className="space-y-3"><div className="h-44 bg-gray-100 rounded-2xl overflow-hidden">{persistedHall.coverImage ? <img src={persistedHall.coverImage} className="w-full h-full object-cover" alt={persistedHall.name}/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon/></div>}</div><h3 className="text-lg font-black">{persistedHall.name}</h3><p className="text-xs text-gray-600">{persistedHall.location} — {persistedHall.city}</p><p className="text-xs text-gray-600">السعر: {Number(persistedHall.price||0).toLocaleString('ar-IQ')} د.ع • العربون: {Number(persistedHall.deposit||0).toLocaleString('ar-IQ')} د.ع • السعة: {persistedHall.capacity}</p><p className="text-xs text-gray-600">{persistedHall.description}</p></div> : <form onSubmit={saveHall} className="space-y-3">
            <div><FieldLabel>اسم القاعة</FieldLabel><input value={draft.name} onChange={(e)=>setField('name',e.target.value)} placeholder="مثال: ليالي الطين" className="w-full px-3 py-2 border rounded-xl text-xs" required/></div>
            <div className="grid grid-cols-2 gap-2"><div><FieldLabel>العنوان</FieldLabel><input value={draft.location} onChange={(e)=>setField('location',e.target.value)} placeholder="المنطقة / الشارع" className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>المحافظة</FieldLabel><input value={draft.city} onChange={(e)=>setField('city',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div></div>
            <div className="grid sm:grid-cols-2 gap-2"><div><FieldLabel>الصورة الرئيسية للقاعة</FieldLabel><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>{draft.coverImage ? 'تغيير الصورة من المعرض' : 'اختيار صورة من المعرض'}<input type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadImage(f,'cover');}}/></label>{draft.coverImage && <img src={draft.coverImage} alt="الصورة الرئيسية" className="mt-2 h-24 w-full object-cover rounded-xl"/>}</div><div><FieldLabel>صورة حساب القاعة</FieldLabel><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>{draft.profileImageUrl ? 'تغيير صورة الحساب' : 'اختيار صورة الحساب'}<input type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadImage(f,'profile');}}/></label>{draft.profileImageUrl && <img src={draft.profileImageUrl} alt="صورة الحساب" className="mt-2 h-20 w-20 object-cover rounded-full mx-auto"/>}</div></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><div><FieldLabel>السعر الكامل (د.ع)</FieldLabel><input type="number" min="0" value={draft.price || ''} onChange={(e)=>setField('price',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>مبلغ العربون (د.ع)</FieldLabel><input type="number" min="0" value={draft.deposit || ''} onChange={(e)=>setField('deposit',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>سعة القاعة (شخص)</FieldLabel><input type="number" min="1" value={draft.capacity || ''} onChange={(e)=>setField('capacity',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div></div>
            <div><FieldLabel>وصف القاعة</FieldLabel><textarea value={draft.description} onChange={(e)=>setField('description',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs h-20"/></div><button disabled={isSaving||isUploading} className="w-full py-2.5 bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-4 h-4"/>{isUploading?'جاري رفع الصورة...':isSaving?'جاري الحفظ...':persistedHall?'حفظ التعديلات':'إنشاء صفحة القاعة'}</button>
          </form>}
        </section>

        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3"><h2 className="font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-700"/>الحجوزات الواردة ({hallBookings.length})</h2>{hallBookings.length===0 ? <div className="p-8 text-center text-xs text-gray-500 border border-dashed rounded-2xl">لا توجد حجوزات موجهة إلى قاعتك حالياً.</div> : hallBookings.map((booking)=><div key={booking.id} className="p-4 border rounded-2xl space-y-2"><div className="flex justify-between gap-2"><b className="text-xs">{booking.requesterName||booking.customerName}</b><span className={`text-[11px] font-bold ${booking.status==='مقبول'?'text-emerald-700':booking.status==='مرفوض'?'text-rose-700':'text-amber-700'}`}>{booking.status}</span></div><div className="text-[11px] text-gray-600">{booking.date} • {booking.startTime||booking.timeSlot} {booking.endTime?`- ${booking.endTime}`:''}</div>{(booking.status==='قيد المراجعة'||booking.status==='pending')&&<div className="flex gap-2"><button type="button" onClick={()=>void updateBooking(booking.id,'مقبول')} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold"><CheckCircle2 className="inline w-4 h-4 ml-1"/>قبول</button><button type="button" onClick={()=>void updateBooking(booking.id,'مرفوض')} className="px-3 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold"><XCircle className="inline w-4 h-4 ml-1"/>رفض</button></div>}</div>)}</section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={publishPost} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>نشر في Explore</h2><div><FieldLabel>عنوان المنشور</FieldLabel><input value={postTitle} onChange={(e)=>setPostTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs"/></div><div><FieldLabel>الوصف</FieldLabel><textarea value={postCaption} onChange={(e)=>setPostCaption(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs"/></div><div><FieldLabel>صورة المنشور</FieldLabel><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>{postMediaUrl?'تغيير الصورة':'اختيار صورة من المعرض'}<input type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadImage(f,'post');}}/></label>{postMediaUrl&&<img src={postMediaUrl} alt="المنشور" className="mt-2 h-28 w-full object-cover rounded-xl"/>}</div><button disabled={isUploading} className="px-4 py-2 bg-amber-600 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold">نشر</button></form>
        <form onSubmit={publishOffer} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Tag className="w-5 h-5 text-emerald-700"/>إنشاء عرض</h2><div><FieldLabel>عنوان العرض</FieldLabel><input value={offerTitle} onChange={(e)=>setOfferTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>تفاصيل العرض</FieldLabel><textarea value={offerDescription} onChange={(e)=>setOfferDescription(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs"/></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><div><FieldLabel>سعر العرض (د.ع)</FieldLabel><input type="number" min="0" value={offerPrice||''} onChange={(e)=>setOfferPrice(Number(e.target.value))} className="w-full px-2 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>بداية العرض</FieldLabel><input type="date" value={offerStart} onChange={(e)=>setOfferStart(e.target.value)} className="w-full px-2 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>نهاية العرض</FieldLabel><input type="date" value={offerEnd} onChange={(e)=>setOfferEnd(e.target.value)} className="w-full px-2 py-2 border rounded-xl text-xs" required/></div></div><button className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">حفظ العرض</button></form>
      </div>

      {ownPosts.length > 0 && <section className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold">منشوراتي في Explore</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{ownPosts.map((post)=><div key={post.id} className="border rounded-2xl overflow-hidden"><div className="h-36 bg-gray-100">{post.mediaType==='video'?<video src={post.mediaUrl} controls className="w-full h-full object-cover"/>:<img src={post.mediaUrl} className="w-full h-full object-cover" alt={post.title}/>}</div><div className="p-3"><b className="text-xs block">{post.title}</b><p className="text-[11px] text-gray-500 line-clamp-2">{post.caption}</p>{onDeletePost&&<button type="button" onClick={()=>{if(window.confirm('حذف هذا المنشور من Explore؟')) void onDeletePost(post.id);}} className="mt-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5"/>حذف المنشور</button>}</div></div>)}</div></section>}
    </div>
  );
};
