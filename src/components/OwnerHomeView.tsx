import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Clock, Sparkles, Save, AlertCircle, Tag, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { Hall, Booking, UserProfile, FeedPost, BusinessOffer } from '../types';
import { saveOwnedHall } from '../lib/business';
import { uploadOwnerImage, uploadOwnerMedia } from '../lib/storage';
import { MediaViewer } from './MediaViewer';
import { CroppedImageInput } from './CroppedImageInput';
import { Coordinates, HallMap } from './HallMap';
import { BookingStatusSummaryDialog } from './BookingStatusSummaryDialog';
import { formatAreaWithCity } from '../lib/location';
import { BusinessOffersPanel } from './BusinessOffersPanel';
import { FeatureSelector, FeaturesDisplay } from './BusinessFeatures';

interface OwnerHomeViewProps {
  currentUser: UserProfile;
  halls: Hall[];
  bookings: Booking[];
  posts?: FeedPost[];
  offers?: BusinessOffer[];
  onUpdateHall: (updatedHall: Hall) => void;
  onOpenBookings: (filter: 'قيد المراجعة' | 'مقبول') => void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onUpdatePostMetadata?: (postId:string,title:string,caption:string)=>Promise<void>|void;
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

export const OwnerHomeView: React.FC<OwnerHomeViewProps> = ({ currentUser, halls, bookings, posts = [], offers = [], onUpdateHall, onOpenBookings, onCreatePost, onDeletePost, onUpdatePostMetadata }) => {
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
  const [postMediaType,setPostMediaType]=useState<'image'|'video'>('image');
  const [viewingPost,setViewingPost]=useState<FeedPost|null>(null);
  const [bookingDialog, setBookingDialog] = useState<'accepted' | 'pending' | null>(null);

  useEffect(() => { if (persistedHall) { setDraft(persistedHall); setIsEditing(false); } }, [persistedHall]);

  const hallBookings = bookings.filter((booking) => booking.targetOwnerId === currentUser.id && booking.itemType === 'hall');
  const pendingBookings = hallBookings.filter((booking) => booking.status === 'قيد المراجعة' || booking.status === 'pending');
  const acceptedBookings = hallBookings.filter((booking) => booking.status === 'مقبول' || booking.status === 'accepted');
  const ownPosts = posts.filter((post) => post.authorId === currentUser.id);
  const setField = <K extends keyof Hall>(key: K, value: Hall[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file: File, kind: 'cover' | 'profile' | 'post' | 'postVideo') => {
    setError(''); setIsUploading(true);
    try {
      const url = kind==='post'||kind==='postVideo' ? await uploadOwnerMedia(file,'post-media') : await uploadOwnerImage(file, kind === 'cover' ? 'hall-cover' : 'hall-profile');
      if (kind === 'cover') setDraft((prev) => ({ ...prev, coverImage: prev.coverImage||url, images: [...new Set([...(prev.images || []),url])] }));
      if (kind === 'profile') setDraft((prev) => ({ ...prev, profileImageUrl: url }));
      if (kind === 'post'||kind==='postVideo') {setPostMediaUrl(url);setPostMediaType(file.type.startsWith('video/')?'video':'image');}
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

  const saveMapLocation = async (coordinates: Coordinates) => {
    setError(''); setMessage(''); setIsSaving(true);
    try {
      const saved = await saveOwnedHall({ ...draft, ownerId: currentUser.id, mapLatitude: coordinates.latitude, mapLongitude: coordinates.longitude });
      setDraft(saved); onUpdateHall(saved); setMessage('تم حفظ موقع القاعة على الخريطة.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ الموقع.'); throw err; }
    finally { setIsSaving(false); }
  };

  const deleteMapLocation = async () => {
    setError(''); setMessage(''); setIsSaving(true);
    try {
      const saved = await saveOwnedHall({ ...draft, ownerId: currentUser.id, mapLatitude: null, mapLongitude: null });
      setDraft(saved); onUpdateHall(saved); setMessage('تم حذف موقع القاعة من الخريطة.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حذف الموقع.'); throw err; }
    finally { setIsSaving(false); }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const hall = persistedHall || (draft.id ? draft : null);
    if (!hall) return setError('احفظ صفحة القاعة أولاً قبل النشر.');
    if (!postTitle.trim()) return setError('عنوان العمل مطلوب، أما الوصف فاختياري.');
    if (!postMediaUrl && !hall.coverImage) return setError('اختر صورة للمنشور.');
    try {
      await onCreatePost({ authorId: currentUser.id, authorName: hall.name, authorAvatar: hall.profileImageUrl || hall.coverImage || '', authorRole: 'صاحب قاعة', targetType: 'hall', targetId: hall.id, title: postTitle.trim(), caption: postCaption.trim(), mediaType: postMediaType, mediaUrl: postMediaUrl || hall.coverImage || '', city: hall.city });
      setPostTitle(''); setPostCaption(''); setPostMediaUrl(''); setMessage('تم نشر المحتوى في Explore.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر النشر.'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 dir-rtl" id="owner-home-dashboard">
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 p-6 rounded-3xl text-white shadow-xl">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full">حساب صاحب قاعة</span><h1 className="text-2xl font-black text-amber-100 mt-2">أهلاً {currentUser.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <button type="button" onClick={()=>setBookingDialog('pending')} className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amber-300 p-3 rounded-2xl text-right transition" aria-label="عرض الطلبات المعلقة"><Clock className="w-4 h-4 text-amber-300"/><b className="block mt-1">{pendingBookings.length}</b><span className="text-[11px]">طلبات معلقة</span></button>
          <button type="button" onClick={()=>setBookingDialog('accepted')} className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-emerald-300 p-3 rounded-2xl text-right transition" aria-label="عرض الحجوزات المؤكدة"><CheckCircle2 className="w-4 h-4 text-emerald-300"/><b className="block mt-1">{acceptedBookings.length}</b><span className="text-[11px]">حجوزات مؤكدة</span></button>
          <div className="bg-white/10 p-3 rounded-2xl text-right"><Building2 className="w-4 h-4 text-blue-300"/><b className="block mt-1">{draft.capacity}</b><span className="text-[11px]">السعة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl text-right"><Tag className="w-4 h-4 text-amber-300"/><b className="block mt-1">{Number(draft.price || 0).toLocaleString('ar-IQ')}</b><span className="text-[11px]">السعر د.ع</span></div>
        </div>
      </div>
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">{message}</div>}

      <div className="grid grid-cols-1 gap-6">
        <section id="owner-hall-page" className="bg-white p-5 rounded-3xl border border-gray-200 space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-700"/>صفحة القاعة</h2>{persistedHall && <button onClick={() => setIsEditing((v) => !v)} className="text-xs font-bold text-emerald-800 underline">{isEditing ? 'إلغاء' : 'تعديل'}</button>}</div>
          {!isEditing && persistedHall ? <div className="space-y-3"><div className="h-44 bg-gray-100 rounded-2xl overflow-hidden">{persistedHall.coverImage ? <img src={persistedHall.coverImage} className="w-full h-full object-cover" alt={persistedHall.name}/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon/></div>}</div><h3 className="text-lg font-black">{persistedHall.name}</h3><p className="text-xs text-gray-600">{formatAreaWithCity(persistedHall.location, persistedHall.city)}</p><p className="text-xs text-gray-600">السعر: {Number(persistedHall.price||0).toLocaleString('ar-IQ')} د.ع • العربون: {Number(persistedHall.deposit||0).toLocaleString('ar-IQ')} د.ع • السعة: {persistedHall.capacity}</p><p className="text-xs text-gray-600">{persistedHall.description}</p><FeaturesDisplay features={persistedHall.features} /><HallMap hallName={persistedHall.name} coordinates={persistedHall.mapLatitude != null && persistedHall.mapLongitude != null ? {latitude:persistedHall.mapLatitude,longitude:persistedHall.mapLongitude}:null} editable onSave={saveMapLocation} onDelete={deleteMapLocation}/></div> : <form onSubmit={saveHall} className="space-y-3">
            <div><FieldLabel>اسم القاعة</FieldLabel><input value={draft.name} onChange={(e)=>setField('name',e.target.value)} placeholder="مثال: ليالي الطين" className="w-full px-3 py-2 border rounded-xl text-xs" required/></div>
            <div className="grid grid-cols-2 gap-2"><div><FieldLabel>العنوان</FieldLabel><input value={draft.location} onChange={(e)=>setField('location',e.target.value)} placeholder="المنطقة / الشارع" className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>المحافظة</FieldLabel><input value={draft.city} onChange={(e)=>setField('city',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div></div>
            {draft.id && <HallMap hallName={draft.name || 'القاعة'} coordinates={draft.mapLatitude != null && draft.mapLongitude != null ? {latitude:draft.mapLatitude,longitude:draft.mapLongitude}:null} editable onSave={saveMapLocation} onDelete={deleteMapLocation}/>}
            <div className="grid sm:grid-cols-2 gap-2"><div><FieldLabel>صور غلاف القاعة (يمكن إضافة أكثر من صورة)</FieldLabel><CroppedImageInput label="إضافة وضبط صورة غلاف" aspect={16/7} onReady={(f)=>void uploadImage(f,'cover')}/><div className="mt-2 grid grid-cols-3 gap-2">{[...new Set([draft.coverImage,...(draft.images||[])].filter(Boolean))].map(url=><div key={url} className="relative"><button type="button" onClick={()=>setDraft(prev=>({...prev,coverImage:url}))} className={`h-20 w-full rounded-xl overflow-hidden border-2 ${draft.coverImage===url?'border-emerald-600':'border-gray-200'}`}><img src={url} className="w-full h-full object-cover"/></button><button type="button" onClick={()=>setDraft(prev=>{const images=(prev.images||[]).filter(x=>x!==url);return {...prev,images,coverImage:prev.coverImage===url?(images[0]||''):prev.coverImage}})} className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded-full"><Trash2 className="w-3 h-3"/></button></div>)}</div></div><div><FieldLabel>صورة حساب القاعة</FieldLabel><CroppedImageInput label="اختيار وضبط صورة الحساب" aspect={1} onReady={(f)=>void uploadImage(f,'profile')}/>{draft.profileImageUrl && <img src={draft.profileImageUrl} alt="صورة الحساب" className="mt-2 h-20 w-20 object-cover rounded-full mx-auto"/>}</div></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><div><FieldLabel>السعر الكامل (د.ع)</FieldLabel><input type="number" min="0" value={draft.price || ''} onChange={(e)=>setField('price',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>مبلغ العربون (د.ع)</FieldLabel><input type="number" min="0" value={draft.deposit || ''} onChange={(e)=>setField('deposit',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>سعة القاعة (شخص)</FieldLabel><input type="number" min="1" value={draft.capacity || ''} onChange={(e)=>setField('capacity',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div></div>
            <FeatureSelector kind="hall" value={draft.features} onChange={(features) => setField('features', features)} />
            <div><FieldLabel>وصف القاعة</FieldLabel><textarea value={draft.description} onChange={(e)=>setField('description',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs h-20"/></div><button disabled={isSaving||isUploading} className="w-full py-2.5 bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-4 h-4"/>{isUploading?'جاري رفع الصورة...':isSaving?'جاري الحفظ...':persistedHall?'حفظ التعديلات':'إنشاء صفحة القاعة'}</button>
          </form>}
        </section>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={publishPost} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>معرض الأعمال ومنشورات Explore</h2><div><FieldLabel>عنوان العمل</FieldLabel><input value={postTitle} onChange={(e)=>setPostTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs"/></div><div><FieldLabel>الوصف (اختياري)</FieldLabel><textarea value={postCaption} onChange={(e)=>setPostCaption(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs"/></div><div><FieldLabel>صورة أو فيديو</FieldLabel><CroppedImageInput label="اختيار صورة وضبط حجمها" aspect={1} onReady={(f)=>void uploadImage(f,'post')}/><label className="mt-2 flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>أو اختيار فيديو<input type="file" accept="video/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];e.currentTarget.value='';if(f)void uploadImage(f,'postVideo')}}/></label>{postMediaUrl&&(postMediaType==='video'?<video src={postMediaUrl} controls className="mt-2 h-28 w-full object-cover rounded-xl"/>:<img src={postMediaUrl} alt="العمل" className="mt-2 h-28 w-full object-cover rounded-xl"/>)}</div><button disabled={isUploading} className="px-4 py-2 bg-amber-600 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold">إضافة وحفظ ونشر</button></form>
        <BusinessOffersPanel ownerId={currentUser.id} ownerType="صاحب قاعة" targetId={(persistedHall || (draft.id ? draft : null))?.id} originalPrice={(persistedHall || draft).price || 0} offers={offers} onMessage={setMessage} onError={setError}/>
      </div>

      {ownPosts.length > 0 && <section className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold">معرض أعمالي ({ownPosts.length})</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{ownPosts.map(post=><button key={post.id} onClick={()=>setViewingPost(post)} className="border rounded-2xl overflow-hidden text-right hover:shadow-lg transition"><div className="h-40 bg-gray-100">{post.mediaType==='video'?<video src={post.mediaUrl} poster={post.thumbnailUrl} muted playsInline preload="metadata" className="w-full h-full object-cover"/>:<img src={post.mediaUrl} className="w-full h-full object-cover"/>}</div><div className="p-3"><b className="text-xs">{post.title}</b><p className="text-[11px] text-gray-500 line-clamp-2">{post.caption||'بدون وصف'}</p></div></button>)}</div></section>}
      {viewingPost&&<MediaViewer url={viewingPost.mediaUrl} type={viewingPost.mediaType} title={viewingPost.title} description={viewingPost.caption} onClose={()=>setViewingPost(null)} onPrevious={ownPosts.length>1?()=>{const i=ownPosts.findIndex(x=>x.id===viewingPost.id);setViewingPost(ownPosts[(i-1+ownPosts.length)%ownPosts.length])}:undefined} onNext={ownPosts.length>1?()=>{const i=ownPosts.findIndex(x=>x.id===viewingPost.id);setViewingPost(ownPosts[(i+1)%ownPosts.length])}:undefined} onSaveMetadata={onUpdatePostMetadata?async value=>{await onUpdatePostMetadata(viewingPost.id,value.title,value.description);setViewingPost({...viewingPost,title:value.title,caption:value.description});setMessage('تم حفظ عنوان ووصف العمل.');}:undefined} onDelete={onDeletePost?async()=>{await onDeletePost(viewingPost.id);setViewingPost(null);setMessage('تم حذف العمل بنجاح.');}:undefined}/>}
      {bookingDialog && <BookingStatusSummaryDialog bookings={bookingDialog === 'accepted' ? acceptedBookings : pendingBookings} variant={bookingDialog} onClose={()=>setBookingDialog(null)} onManage={()=>{const filter=bookingDialog === 'accepted' ? 'مقبول' : 'قيد المراجعة';setBookingDialog(null);onOpenBookings(filter);}} />}
    </div>
  );
};
