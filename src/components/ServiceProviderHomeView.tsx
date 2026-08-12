import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Calendar, CheckCircle2, XCircle, Clock, Sparkles, Save, AlertCircle, Tag, Image as ImageIcon, Upload, Trash2, Video } from 'lucide-react';
import { ServiceProvider, Booking, UserProfile, FeedPost, ServiceCategory } from '../types';
import { createBusinessOffer, saveOwnedServiceProvider } from '../lib/business';
import { uploadOwnerMedia } from '../lib/storage';

interface ServiceProviderHomeViewProps {
  currentUser: UserProfile;
  serviceProviders: ServiceProvider[];
  bookings: Booking[];
  posts?: FeedPost[];
  onUpdateProvider?: (updatedProvider: ServiceProvider) => void;
  onUpdateServiceProvider?: (updatedProvider: ServiceProvider) => void;
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status']) => Promise<void> | void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
}

const CATEGORIES: ServiceCategory[] = ['تصوير وفيديو', 'تزيين وكوشة', 'فرقة وسنترال', 'سيارات زفاف', 'صالون ومكياج عرائس', 'ضيافة وبوفيه'];
const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const emptyProvider = (user: UserProfile): ServiceProvider => ({
  id: '', ownerId: user.id, name: user.name || '',
  serviceCategory: (CATEGORIES.includes(user.serviceCategory as ServiceCategory) ? user.serviceCategory : 'تصوير وفيديو') as ServiceCategory,
  city: user.city || 'بغداد', location: '', rating: 0, reviewsCount: 0,
  priceStart: 0, priceStartFormatted: '0 د.ع', avatar: user.profileImageUrl || '',
  coverImage: user.coverImageUrl || '', portfolio: [], description: '', phone: user.phone, isVerified: false,
});

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-bold text-gray-700 block mb-1">{children}</label>
);

export const ServiceProviderHomeView: React.FC<ServiceProviderHomeViewProps> = (props) => {
  const { currentUser, serviceProviders, bookings, posts = [], onUpdateBookingStatus, onCreatePost, onDeletePost } = props;
  const notifyUpdated = props.onUpdateProvider || props.onUpdateServiceProvider || (() => undefined);
  const persistedProvider = useMemo(
    () => serviceProviders.find((provider) => provider.ownerId === currentUser.id || (!!currentUser.ownedProviderId && provider.id === currentUser.ownedProviderId)),
    [serviceProviders, currentUser.id, currentUser.ownedProviderId]
  );
  const [draft, setDraft] = useState<ServiceProvider>(() => persistedProvider || emptyProvider(currentUser));
  const [isEditing, setIsEditing] = useState(!persistedProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerPrice, setOfferPrice] = useState(0);
  const [offerStart, setOfferStart] = useState('');
  const [offerEnd, setOfferEnd] = useState('');

  useEffect(() => {
    if (persistedProvider) {
      setDraft({ ...persistedProvider, portfolio: Array.isArray(persistedProvider.portfolio) ? persistedProvider.portfolio : [] });
      setIsEditing(false);
    }
  }, [persistedProvider]);

  const providerBookings = bookings.filter((booking) => booking.targetOwnerId === currentUser.id && booking.itemType === 'provider');
  const pendingBookings = providerBookings.filter((booking) => booking.status === 'قيد المراجعة' || booking.status === 'pending');
  const acceptedBookings = providerBookings.filter((booking) => booking.status === 'مقبول' || booking.status === 'accepted');
  const ownPosts = posts.filter((post) => post.authorId === currentUser.id);
  const setField = <K extends keyof ServiceProvider>(key: K, value: ServiceProvider[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const uploadSingle = async (file: File, kind: 'cover' | 'avatar' | 'portfolio' | 'post') => {
    setError(''); setIsUploading(true);
    try {
      const folder = kind === 'cover' ? 'provider-cover' : kind === 'avatar' ? 'provider-avatar' : kind === 'portfolio' ? 'portfolio' : 'post-media';
      const url = await uploadOwnerMedia(file, folder);
      if (kind === 'cover') setDraft((prev) => ({ ...prev, coverImage: url }));
      if (kind === 'avatar') setDraft((prev) => ({ ...prev, avatar: url }));
      if (kind === 'portfolio') setDraft((prev) => ({ ...prev, portfolio: [...(prev.portfolio || []), url] }));
      if (kind === 'post') { setPostMediaUrl(url); setPostMediaType(file.type.startsWith('video/') ? 'video' : 'image'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر رفع الملف.'); }
    finally { setIsUploading(false); }
  };

  const saveProvider = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!draft.name.trim() || !draft.location.trim()) return setError('اسم الخدمة والموقع مطلوبان.');
    if (draft.priceStart < 0) return setError('السعر غير صحيح.');
    setIsSaving(true);
    try {
      const saved = await saveOwnedServiceProvider({ ...draft, ownerId: currentUser.id, portfolio: draft.portfolio || [], phone: currentUser.phone || draft.phone });
      setDraft(saved); notifyUpdated(saved); setIsEditing(false); setMessage('تم حفظ صفحة الخدمة بنجاح.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ صفحة الخدمة.'); }
    finally { setIsSaving(false); }
  };

  const updateBooking = async (bookingId: string, status: Booking['status']) => {
    setError(''); setMessage('');
    try {
      await onUpdateBookingStatus(bookingId, status);
      setMessage(status === 'مقبول' ? 'تم قبول الحجز وتثبيت الموعد.' : 'تم رفض الحجز.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الحجز.'); }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const active = persistedProvider || (draft.id ? draft : null);
    if (!active) return setError('احفظ صفحة الخدمة أولاً قبل النشر.');
    if (!postTitle.trim() || !postCaption.trim()) return setError('عنوان المنشور والوصف مطلوبان.');
    if (!postMediaUrl) return setError('اختر صورة أو فيديو للمنشور.');
    try {
      await onCreatePost({ authorId: currentUser.id, authorName: active.name, authorAvatar: active.avatar || active.coverImage || '', authorRole: 'مزود خدمة', targetType: 'provider', targetId: active.id, title: postTitle.trim(), caption: postCaption.trim(), mediaType: postMediaType, mediaUrl: postMediaUrl, city: active.city });
      setPostTitle(''); setPostCaption(''); setPostMediaUrl(''); setPostMediaType('image'); setMessage('تم نشر العمل في Explore.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر النشر.'); }
  };

  const publishOffer = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const active = persistedProvider || (draft.id ? draft : null);
    if (!active) return setError('احفظ صفحة الخدمة أولاً قبل إنشاء العرض.');
    if (!offerStart || !offerEnd) return setError('حدد بداية العرض ونهايته.');
    try {
      await createBusinessOffer({ ownerType: 'مزود خدمة', targetId: active.id, title: offerTitle, description: offerDescription, originalPrice: active.priceStart, offerPrice, startDate: offerStart, endDate: offerEnd });
      setOfferTitle(''); setOfferDescription(''); setOfferPrice(0); setOfferStart(''); setOfferEnd(''); setMessage('تم إنشاء العرض بنجاح.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء العرض.'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 dir-rtl" id="service-provider-home-dashboard">
      <div className="bg-gradient-to-r from-emerald-950 via-amber-900 to-emerald-950 p-6 rounded-3xl text-white shadow-xl">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full">حساب مزود خدمة</span>
        <h1 className="text-2xl font-black text-amber-100 mt-2">أهلاً {currentUser.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-white/10 p-3 rounded-2xl"><Clock className="w-4 h-4 text-amber-300"/><b className="block mt-1">{pendingBookings.length}</b><span className="text-[11px]">طلبات جديدة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><CheckCircle2 className="w-4 h-4 text-emerald-300"/><b className="block mt-1">{acceptedBookings.length}</b><span className="text-[11px]">حجوزات مؤكدة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><Camera className="w-4 h-4 text-blue-300"/><b className="block mt-1">{draft.serviceCategory}</b><span className="text-[11px]">نوع الخدمة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><Tag className="w-4 h-4 text-amber-300"/><b className="block mt-1">{Number(draft.priceStart || 0).toLocaleString('ar-IQ')}</b><span className="text-[11px]">ابتداءً من د.ع</span></div>
        </div>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-700"/>صفحة الخدمة</h2>{persistedProvider && <button onClick={() => setIsEditing((v) => !v)} className="text-xs font-bold text-emerald-800 underline">{isEditing ? 'إلغاء' : 'تعديل'}</button>}</div>
          {!isEditing && persistedProvider ? (
            <div className="space-y-3">
              <div className="h-44 bg-gray-100 rounded-2xl overflow-hidden">{persistedProvider.coverImage ? <img src={persistedProvider.coverImage} className="w-full h-full object-cover" alt={persistedProvider.name}/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon/></div>}</div>
              <h3 className="text-lg font-black">{persistedProvider.name}</h3><p className="text-xs text-gray-600">{persistedProvider.serviceCategory} — {persistedProvider.location}</p><p className="text-xs text-gray-600">{persistedProvider.description}</p>
            </div>
          ) : (
            <form onSubmit={saveProvider} className="space-y-3">
              <div><FieldLabel>اسم الخدمة أو الاستوديو</FieldLabel><input value={draft.name} onChange={(e)=>setField('name', e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div>
              <div><FieldLabel>نوع الخدمة</FieldLabel><select value={draft.serviceCategory} onChange={(e)=>setField('serviceCategory', e.target.value as ServiceCategory)} className="w-full px-3 py-2 border rounded-xl text-xs">{CATEGORIES.map((category)=><option key={category}>{category}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2"><div><FieldLabel>العنوان</FieldLabel><input value={draft.location} onChange={(e)=>setField('location',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>المحافظة</FieldLabel><input value={draft.city} onChange={(e)=>setField('city',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div></div>
              <div className="grid grid-cols-2 gap-2">
                <div><FieldLabel>الصورة الرئيسية</FieldLabel><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>اختيار من المعرض<input type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadSingle(f,'cover');}}/></label>{draft.coverImage && <img src={draft.coverImage} className="mt-2 h-24 w-full object-cover rounded-xl" alt="الغلاف"/>}</div>
                <div><FieldLabel>صورة الحساب</FieldLabel><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>اختيار من المعرض<input type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadSingle(f,'avatar');}}/></label>{draft.avatar && <img src={draft.avatar} className="mt-2 h-20 w-20 object-cover rounded-full mx-auto" alt="الحساب"/>}</div>
              </div>
              <div><FieldLabel>السعر الابتدائي (د.ع)</FieldLabel><input type="number" min="0" value={draft.priceStart || ''} onChange={(e)=>setField('priceStart',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs"/></div>
              <div><FieldLabel>وصف الخدمة</FieldLabel><textarea value={draft.description} onChange={(e)=>setField('description',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs h-20"/></div>
              <button disabled={isSaving || isUploading} className="w-full py-2.5 bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-4 h-4"/>{isSaving ? 'جاري الحفظ...' : persistedProvider ? 'حفظ التعديلات' : 'إنشاء صفحة الخدمة'}</button>
            </form>
          )}
        </section>

        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-700"/>الحجوزات الواردة ({providerBookings.length})</h2>
          {providerBookings.length === 0 ? <div className="p-8 text-center text-xs text-gray-500 border border-dashed rounded-2xl">لا توجد حجوزات موجهة إلى خدمتك حالياً.</div> : providerBookings.map((booking)=><div key={booking.id} className="p-4 border rounded-2xl space-y-2"><div className="flex justify-between gap-2"><b className="text-xs">{booking.requesterName || booking.customerName}</b><span className={`text-[11px] font-bold ${booking.status === 'مقبول' ? 'text-emerald-700' : booking.status === 'مرفوض' ? 'text-rose-700' : 'text-amber-700'}`}>{booking.status}</span></div><div className="text-[11px] text-gray-600">{booking.date} • {booking.startTime || booking.timeSlot} {booking.endTime ? `- ${booking.endTime}` : ''}</div>{(booking.status === 'قيد المراجعة' || booking.status === 'pending') && <div className="flex gap-2"><button type="button" onClick={()=>void updateBooking(booking.id,'مقبول')} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold"><CheckCircle2 className="inline w-4 h-4 ml-1"/>قبول</button><button type="button" onClick={()=>void updateBooking(booking.id,'مرفوض')} className="px-3 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold"><XCircle className="inline w-4 h-4 ml-1"/>رفض</button></div>}</div>)}
        </section>
      </div>

      <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold flex gap-2"><Camera className="w-5 h-5 text-emerald-700"/>معرض الأعمال</h2><span className="text-[11px] text-gray-500">صور وفيديوهات تظهر للزبون داخل صفحتك</span></div>
        <label className="flex items-center justify-center gap-2 border border-dashed rounded-2xl p-4 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>إضافة صورة أو فيديو من المعرض<input type="file" accept="image/*,video/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadSingle(f,'portfolio');}}/></label>
        {(draft.portfolio || []).length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{(draft.portfolio || []).map((url,idx)=><div key={`${url}-${idx}`} className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-square border">{isVideoUrl(url) ? <video src={url} controls className="w-full h-full object-cover"/> : <img src={url} alt={`عمل ${idx+1}`} className="w-full h-full object-cover"/>}<button type="button" onClick={()=>setDraft((prev)=>({...prev,portfolio:prev.portfolio.filter((_,i)=>i!==idx)}))} className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white"><Trash2 className="w-3.5 h-3.5"/></button></div>)}</div> : <div className="text-xs text-gray-500 text-center p-5 border border-dashed rounded-2xl">لم تضف أعمالاً بعد.</div>}
        {persistedProvider && <button type="button" onClick={()=>void saveProvider({ preventDefault:()=>{} } as React.FormEvent)} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">حفظ معرض الأعمال</button>}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={publishPost} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>نشر أعمالك في Explore</h2><input value={postTitle} onChange={(e)=>setPostTitle(e.target.value)} placeholder="عنوان المنشور" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={postCaption} onChange={(e)=>setPostCaption(e.target.value)} placeholder="الوصف" className="w-full px-3 py-2 border rounded-xl text-xs"/><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>اختيار صورة أو فيديو<input type="file" accept="image/*,video/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadSingle(f,'post');}}/></label>{postMediaUrl && <div className="h-36 rounded-xl overflow-hidden bg-gray-100">{postMediaType === 'video' ? <video src={postMediaUrl} controls className="w-full h-full object-cover"/> : <img src={postMediaUrl} className="w-full h-full object-cover" alt="المنشور"/>}</div>}<button disabled={isUploading} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold">نشر</button></form>
        <form onSubmit={publishOffer} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Tag className="w-5 h-5 text-emerald-700"/>إنشاء عرض</h2><input value={offerTitle} onChange={(e)=>setOfferTitle(e.target.value)} placeholder="عنوان العرض" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={offerDescription} onChange={(e)=>setOfferDescription(e.target.value)} placeholder="تفاصيل العرض" className="w-full px-3 py-2 border rounded-xl text-xs"/><div className="grid grid-cols-3 gap-2"><input type="number" value={offerPrice || ''} onChange={(e)=>setOfferPrice(Number(e.target.value))} placeholder="سعر العرض" className="px-2 py-2 border rounded-xl text-xs"/><input type="date" value={offerStart} onChange={(e)=>setOfferStart(e.target.value)} className="px-2 py-2 border rounded-xl text-xs"/><input type="date" value={offerEnd} onChange={(e)=>setOfferEnd(e.target.value)} className="px-2 py-2 border rounded-xl text-xs"/></div><button className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">حفظ العرض</button></form>
      </div>

      {ownPosts.length > 0 && <section className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold">منشوراتي في Explore</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{ownPosts.map((post)=><div key={post.id} className="border rounded-2xl overflow-hidden"><div className="h-36 bg-gray-100">{post.mediaType === 'video' ? <video src={post.mediaUrl} controls className="w-full h-full object-cover"/> : <img src={post.mediaUrl} className="w-full h-full object-cover" alt={post.title}/>}</div><div className="p-3"><b className="text-xs block">{post.title}</b><p className="text-[11px] text-gray-500 line-clamp-2">{post.caption}</p>{onDeletePost && <button type="button" onClick={()=>{if(window.confirm('حذف هذا المنشور من Explore؟')) void onDeletePost(post.id);}} className="mt-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5"/>حذف المنشور</button>}</div></div>)}</div></section>}
    </div>
  );
};
