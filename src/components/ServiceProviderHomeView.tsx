import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Clock, Sparkles, Save, AlertCircle, Tag, Image as ImageIcon, Upload, Trash2, Video } from 'lucide-react';
import { ServiceProvider, Booking, UserProfile, FeedPost, ServiceCategory, BusinessOffer } from '../types';
import { saveOwnedServiceProvider } from '../lib/business';
import { uploadOwnerMedia, uploadOwnerMediaAsset } from '../lib/storage';
import { CroppedImageInput } from './CroppedImageInput';
import { MediaViewer } from './MediaViewer';
import { MediaThumbnail } from './MediaThumbnail';
import { BookingStatusSummaryDialog } from './BookingStatusSummaryDialog';
import { BusinessOffersPanel } from './BusinessOffersPanel';
import { FeatureSelector, FeaturesDisplay } from './BusinessFeatures';

interface ServiceProviderHomeViewProps {
  currentUser: UserProfile;
  serviceProviders: ServiceProvider[];
  bookings: Booking[];
  posts?: FeedPost[];
  offers?: BusinessOffer[];
  onUpdateProvider?: (updatedProvider: ServiceProvider) => void;
  onUpdateServiceProvider?: (updatedProvider: ServiceProvider) => void;
  onOpenBookings: (filter: 'قيد المراجعة' | 'مقبول') => void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onUpdatePostMetadata?: (postId:string,title:string,caption:string)=>Promise<void>|void;
}

const CATEGORIES: ServiceCategory[] = ['تصوير وفيديو', 'تزيين وكوشة', 'فرقة وسنترال', 'دي جي وموسيقى', 'زهور وباقات عرائس', 'سيارات زفاف', 'صالون ومكياج عرائس', 'ضيافة وبوفيه'];
const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const emptyProvider = (user: UserProfile): ServiceProvider => ({
  id: '', ownerId: user.id, name: user.name || '',
  serviceCategory: (CATEGORIES.includes(user.serviceCategory as ServiceCategory) ? user.serviceCategory : 'تصوير وفيديو') as ServiceCategory,
  city: user.city || 'بغداد', location: '', rating: 0, reviewsCount: 0,
  priceStart: 0, priceStartFormatted: '0 د.ع', avatar: user.profileImageUrl || '',
  coverImage: user.coverImageUrl || '', portfolio: [], features: [], description: '', phone: user.phone, isVerified: false,
});

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-bold text-gray-700 block mb-1">{children}</label>
);

export const ServiceProviderHomeView: React.FC<ServiceProviderHomeViewProps> = (props) => {
  const { currentUser, serviceProviders, bookings, posts = [], offers = [], onOpenBookings, onCreatePost, onDeletePost, onUpdatePostMetadata } = props;
  const notifyUpdated = props.onUpdateProvider || props.onUpdateServiceProvider || (() => undefined);
  const persistedProvider = useMemo(
    () => serviceProviders.find((provider) => provider.ownerId === currentUser.id || (!!currentUser.ownedProviderId && provider.id === currentUser.ownedProviderId)),
    [serviceProviders, currentUser.id, currentUser.ownedProviderId]
  );
  const [draft, setDraft] = useState<ServiceProvider>(() => persistedProvider || emptyProvider(currentUser));
  const [isEditing, setIsEditing] = useState(!persistedProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [portfolioDirty, setPortfolioDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewingPortfolioUrl,setViewingPortfolioUrl]=useState('');
  const [viewingPost,setViewingPost]=useState<FeedPost|null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postThumbnailUrl, setPostThumbnailUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [bookingDialog, setBookingDialog] = useState<'accepted' | 'pending' | null>(null);

  useEffect(() => {
    if (persistedProvider && !portfolioDirty) {
      setDraft({ ...persistedProvider, portfolio: Array.isArray(persistedProvider.portfolio) ? persistedProvider.portfolio : [] });
      setIsEditing(false);
    }
  }, [persistedProvider, portfolioDirty]);

  const providerBookings = bookings.filter((booking) => booking.targetOwnerId === currentUser.id && booking.itemType === 'provider');
  const pendingBookings = providerBookings.filter((booking) => booking.status === 'قيد المراجعة' || booking.status === 'pending');
  const acceptedBookings = providerBookings.filter((booking) => booking.status === 'مقبول' || booking.status === 'accepted');
  const ownPosts = posts.filter((post) => post.authorId === currentUser.id);
  const exploreThumbnailByUrl = new Map<string,string | undefined>([
    ...Object.entries(draft.portfolioThumbnails || {}),
    ...ownPosts.map((post) => [post.mediaUrl, post.thumbnailUrl] as [string,string | undefined]),
  ]);
  const unifiedWorks=[...(draft.portfolio||[]).map(url=>({kind:'portfolio' as const,url,type:isVideoUrl(url)?'video' as const:'image' as const,title:draft.portfolioTitles?.[url]||'عمل من المعرض',description:draft.portfolioDescriptions?.[url],thumbnailUrl:exploreThumbnailByUrl.get(url)})),...ownPosts.map(post=>({kind:'post' as const,url:post.mediaUrl,type:post.mediaType,title:post.title,description:post.caption,thumbnailUrl:post.thumbnailUrl,post}))];
  const setField = <K extends keyof ServiceProvider>(key: K, value: ServiceProvider[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const uploadSingle = async (file: File, kind: 'cover' | 'avatar' | 'portfolio' | 'post') => {
    setError(''); setMessage(''); setIsUploading(true);
    try {
      const folder = kind === 'cover' ? 'provider-cover' : kind === 'avatar' ? 'provider-avatar' : kind === 'portfolio' ? 'portfolio' : 'post-media';
      const asset = kind === 'post' || kind === 'portfolio' ? await uploadOwnerMediaAsset(file, folder) : null;
      const url = asset?.mediaUrl || await uploadOwnerMedia(file, folder);
      if (kind === 'cover') setDraft((prev) => ({ ...prev, coverImage: url }));
      if (kind === 'avatar') setDraft((prev) => ({ ...prev, avatar: url }));
      if (kind === 'portfolio') {
        const description=window.prompt('أضف وصفاً لهذا العمل (اختياري):','')||'';
        setDraft((prev) => ({ ...prev, portfolio: [...(prev.portfolio || []), url], portfolioDescriptions:{...(prev.portfolioDescriptions||{}),[url]:description}, portfolioThumbnails: asset?.thumbnailUrl ? {...(prev.portfolioThumbnails||{}),[url]:asset.thumbnailUrl} : prev.portfolioThumbnails }));
        setPortfolioDirty(true);
        setMessage('تم رفع الملف. اضغط «حفظ معرض الأعمال» لتثبيته في صفحتك.');
      }
      if (kind === 'post') { setPostMediaUrl(url); setPostThumbnailUrl(asset?.thumbnailUrl || ''); setPostMediaType(file.type.startsWith('video/') ? 'video' : 'image'); }
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
      setDraft(saved); notifyUpdated(saved); setIsEditing(false); setPortfolioDirty(false); setMessage('تم حفظ صفحة الخدمة بنجاح.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ صفحة الخدمة.'); }
    finally { setIsSaving(false); }
  };

  const savePortfolio = async () => {
    setError(''); setMessage('');
    const base = persistedProvider || (draft.id ? draft : null);
    if (!base) return setError('أنشئ صفحة الخدمة أولاً ثم احفظ معرض الأعمال.');
    setIsSaving(true);
    try {
      const saved = await saveOwnedServiceProvider({
        ...base,
        ...draft,
        id: base.id,
        ownerId: currentUser.id,
        phone: currentUser.phone || draft.phone || base.phone,
        portfolio: Array.isArray(draft.portfolio) ? draft.portfolio : [],
      });
      setDraft(saved);
      notifyUpdated(saved);
      setPortfolioDirty(false);
      setMessage('تم حفظ معرض الأعمال بنجاح وظهر في صفحة مزود الخدمة.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ معرض الأعمال.');
    } finally {
      setIsSaving(false);
    }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const active = persistedProvider || (draft.id ? draft : null);
    if (!active) return setError('احفظ صفحة الخدمة أولاً قبل النشر.');
    if (!postTitle.trim() || !postCaption.trim()) return setError('عنوان المنشور والوصف مطلوبان.');
    if (!postMediaUrl) return setError('اختر صورة أو فيديو للمنشور.');
    try {
      await onCreatePost({ authorId: currentUser.id, authorName: active.name, authorAvatar: active.avatar || active.coverImage || '', authorRole: 'مزود خدمة', targetType: 'provider', targetId: active.id, title: postTitle.trim(), caption: postCaption.trim(), mediaType: postMediaType, mediaUrl: postMediaUrl, thumbnailUrl: postThumbnailUrl || undefined, city: active.city });
      setPostTitle(''); setPostCaption(''); setPostMediaUrl(''); setPostThumbnailUrl(''); setPostMediaType('image'); setMessage('تم نشر العمل في Explore.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر النشر.'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 dir-rtl" id="service-provider-home-dashboard">
      <div className="bg-gradient-to-r from-emerald-950 via-amber-900 to-emerald-950 p-6 rounded-3xl text-white shadow-xl">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full">حساب مزود خدمة</span>
        <h1 className="text-2xl font-black text-amber-100 mt-2">أهلاً {currentUser.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <button type="button" onClick={()=>setBookingDialog('pending')} className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amber-300 p-3 rounded-2xl text-right transition" aria-label="عرض الطلبات الجديدة"><Clock className="w-4 h-4 text-amber-300"/><b className="block mt-1">{pendingBookings.length}</b><span className="text-[11px]">طلبات جديدة</span></button>
          <button type="button" onClick={()=>setBookingDialog('accepted')} className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-emerald-300 p-3 rounded-2xl text-right transition" aria-label="عرض الحجوزات المؤكدة"><CheckCircle2 className="w-4 h-4 text-emerald-300"/><b className="block mt-1">{acceptedBookings.length}</b><span className="text-[11px]">حجوزات مؤكدة</span></button>
          <button type="button" onClick={()=>document.getElementById('provider-business-page')?.scrollIntoView({behavior:'smooth',block:'start'})} className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-blue-300 p-3 rounded-2xl text-right transition" aria-label="فتح صفحة الخدمة"><Camera className="w-4 h-4 text-blue-300"/><b className="block mt-1">{draft.serviceCategory}</b><span className="text-[11px]">نوع الخدمة</span></button>
          <div className="bg-white/10 p-3 rounded-2xl text-right" aria-label="سعر الخدمة غير قابل للضغط"><Tag className="w-4 h-4 text-amber-300"/><b className="block mt-1">{Number(draft.priceStart || 0).toLocaleString('ar-IQ')}</b><span className="text-[11px]">ابتداءً من د.ع</span></div>
        </div>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">{message}</div>}

      <div className="grid grid-cols-1 gap-6">
        <section id="provider-business-page" className="bg-white p-5 rounded-3xl border border-gray-200 space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-700"/>صفحة الخدمة</h2>{persistedProvider && <button onClick={() => setIsEditing((v) => !v)} className="text-xs font-bold text-emerald-800 underline">{isEditing ? 'إلغاء' : 'تعديل'}</button>}</div>
          {!isEditing && persistedProvider ? (
            <div className="space-y-3">
              <div className="h-44 bg-gray-100 rounded-2xl overflow-hidden">{persistedProvider.coverImage ? <img src={persistedProvider.coverImage} className="w-full h-full object-cover" alt={persistedProvider.name}/> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon/></div>}</div>
              <h3 className="text-lg font-black">{persistedProvider.name}</h3><p className="text-xs text-gray-600">{persistedProvider.serviceCategory} — {persistedProvider.location}</p><p className="text-xs text-gray-600">{persistedProvider.description}</p><FeaturesDisplay features={persistedProvider.features} title="المميزات المشمولة في الخدمة" />
            </div>
          ) : (
            <form onSubmit={saveProvider} className="space-y-3">
              <div><FieldLabel>اسم الخدمة أو الاستوديو</FieldLabel><input value={draft.name} onChange={(e)=>setField('name', e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div>
              <div><FieldLabel>نوع الخدمة</FieldLabel><select value={draft.serviceCategory} onChange={(e)=>setField('serviceCategory', e.target.value as ServiceCategory)} className="w-full px-3 py-2 border rounded-xl text-xs">{CATEGORIES.map((category)=><option key={category}>{category}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2"><div><FieldLabel>العنوان</FieldLabel><input value={draft.location} onChange={(e)=>setField('location',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div><div><FieldLabel>المحافظة</FieldLabel><input value={draft.city} onChange={(e)=>setField('city',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" required/></div></div>
              <div className="grid grid-cols-2 gap-2">
                <div><FieldLabel>الصورة الرئيسية</FieldLabel><CroppedImageInput label="اختيار وضبط الغلاف" aspect={16/7} onReady={(f)=>void uploadSingle(f,'cover')}/>{draft.coverImage && <img src={draft.coverImage} className="mt-2 h-24 w-full object-cover rounded-xl" alt="الغلاف"/>}</div>
                <div><FieldLabel>صورة الحساب</FieldLabel><CroppedImageInput label="اختيار وضبط صورة الحساب" aspect={1} onReady={(f)=>void uploadSingle(f,'avatar')}/>{draft.avatar && <img src={draft.avatar} className="mt-2 h-20 w-20 object-cover rounded-full mx-auto" alt="الحساب"/>}</div>
              </div>
              <div><FieldLabel>السعر الابتدائي (د.ع)</FieldLabel><input type="number" min="0" value={draft.priceStart || ''} onChange={(e)=>setField('priceStart',Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs"/></div>
              <FeatureSelector kind="provider" value={draft.features} onChange={(features) => setField('features', features)} />
              <div><FieldLabel>وصف الخدمة</FieldLabel><textarea value={draft.description} onChange={(e)=>setField('description',e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs h-20"/></div>
              <button disabled={isSaving || isUploading} className="w-full py-2.5 bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-4 h-4"/>{isSaving ? 'جاري الحفظ...' : persistedProvider ? 'حفظ التعديلات' : 'إنشاء صفحة الخدمة'}</button>
            </form>
          )}
        </section>

      </div>

      <section className="hidden">
        <div className="flex items-center justify-between"><h2 className="font-bold flex gap-2"><Camera className="w-5 h-5 text-emerald-700"/>معرض الأعمال</h2><span className="text-[11px] text-gray-500">صور وفيديوهات تظهر للزبون داخل صفحتك</span></div>
        <label className="flex items-center justify-center gap-2 border border-dashed rounded-2xl p-4 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>إضافة صورة أو فيديو من المعرض<input type="file" accept="image/*,video/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadSingle(f,'portfolio');}}/></label>
        {(draft.portfolio || []).length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{(draft.portfolio || []).map((url,idx)=><button type="button" onClick={()=>setViewingPortfolioUrl(url)} key={`${url}-${idx}`} className="text-right relative rounded-2xl overflow-hidden bg-gray-100 aspect-square border shadow-sm hover:shadow-lg"><MediaThumbnail url={url} type={isVideoUrl(url)?'video':'image'} thumbnailUrl={exploreThumbnailByUrl.get(url)} alt={`عمل ${idx+1}`} /><span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-2 line-clamp-1">{draft.portfolioDescriptions?.[url]||'بدون وصف'}</span></button>)}</div> : <div className="text-xs text-gray-500 text-center p-5 border border-dashed rounded-2xl">لم تضف أعمالاً بعد.</div>}
        {persistedProvider && <button type="button" disabled={isSaving || isUploading} onClick={()=>void savePortfolio()} className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4"/>{isUploading ? 'انتظر اكتمال الرفع...' : isSaving ? 'جاري الحفظ...' : portfolioDirty ? 'حفظ معرض الأعمال' : 'حفظ معرض الأعمال'}</button>}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={publishPost} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>نشر أعمالك في Explore</h2><input value={postTitle} onChange={(e)=>setPostTitle(e.target.value)} placeholder="عنوان المنشور" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={postCaption} onChange={(e)=>setPostCaption(e.target.value)} placeholder="الوصف" className="w-full px-3 py-2 border rounded-xl text-xs"/><label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50"><Upload className="w-4 h-4"/>اختيار صورة أو فيديو<input type="file" accept="image/*,video/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void uploadSingle(f,'post');}}/></label>{postMediaUrl && <div className="h-36 rounded-xl overflow-hidden bg-gray-100">{postMediaType === 'video' ? <video src={postMediaUrl} controls className="w-full h-full object-cover"/> : <img src={postMediaUrl} className="w-full h-full object-cover" alt="المنشور"/>}</div>}<button disabled={isUploading} className="px-4 py-2 bg-amber-600 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold">نشر</button></form>
        <BusinessOffersPanel ownerId={currentUser.id} ownerType="مزود خدمة" targetId={(persistedProvider || (draft.id ? draft : null))?.id} originalPrice={(persistedProvider || draft).priceStart || 0} offers={offers} onMessage={setMessage} onError={setError}/>
      </div>

      {unifiedWorks.length>0&&<section className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>معرض أعمالي ومنشوراتي في Explore ({unifiedWorks.length})</h2><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{unifiedWorks.map((work,index)=><button type="button" key={`${work.kind}-${work.url}-${index}`} onClick={()=>work.kind==='post'?setViewingPost(work.post):setViewingPortfolioUrl(work.url)} className="border rounded-2xl overflow-hidden bg-gray-50 text-right"><div className="aspect-square bg-gray-100"><MediaThumbnail url={work.url} type={work.type} thumbnailUrl={work.thumbnailUrl} alt={work.title} /></div><div className="p-3"><b className="text-xs block">{work.title}</b><p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{work.description||'بدون وصف'}</p></div></button>)}</div></section>}
      {viewingPost&&<MediaViewer url={viewingPost.mediaUrl} type={viewingPost.mediaType} title={viewingPost.title} description={viewingPost.caption} onClose={()=>setViewingPost(null)} onPrevious={unifiedWorks.length>1?()=>{const i=unifiedWorks.findIndex(x=>x.kind==='post'&&x.post.id===viewingPost.id);const work=unifiedWorks[(i-1+unifiedWorks.length)%unifiedWorks.length];work.kind==='post'?setViewingPost(work.post):(setViewingPost(null),setViewingPortfolioUrl(work.url))}:undefined} onNext={unifiedWorks.length>1?()=>{const i=unifiedWorks.findIndex(x=>x.kind==='post'&&x.post.id===viewingPost.id);const work=unifiedWorks[(i+1)%unifiedWorks.length];work.kind==='post'?setViewingPost(work.post):(setViewingPost(null),setViewingPortfolioUrl(work.url))}:undefined} onSaveMetadata={onUpdatePostMetadata?async value=>{await onUpdatePostMetadata(viewingPost.id,value.title,value.description);setViewingPost({...viewingPost,title:value.title,caption:value.description});setMessage('تم حفظ عنوان ووصف العمل.');}:undefined} onDelete={onDeletePost?async()=>{await onDeletePost(viewingPost.id);setViewingPost(null);setMessage('تم حذف العمل بنجاح.');}:undefined}/>}
      {viewingPortfolioUrl&&<MediaViewer url={viewingPortfolioUrl} type={isVideoUrl(viewingPortfolioUrl)?'video':'image'} title={draft.portfolioTitles?.[viewingPortfolioUrl]||'عمل من المعرض'} description={draft.portfolioDescriptions?.[viewingPortfolioUrl]} onClose={()=>setViewingPortfolioUrl('')} onPrevious={unifiedWorks.length>1?()=>{const i=unifiedWorks.findIndex(x=>x.url===viewingPortfolioUrl);const work=unifiedWorks[(i-1+unifiedWorks.length)%unifiedWorks.length];work.kind==='post'?(setViewingPortfolioUrl(''),setViewingPost(work.post)):(setViewingPost(null),setViewingPortfolioUrl(work.url))}:undefined} onNext={unifiedWorks.length>1?()=>{const i=unifiedWorks.findIndex(x=>x.url===viewingPortfolioUrl);const work=unifiedWorks[(i+1)%unifiedWorks.length];work.kind==='post'?(setViewingPortfolioUrl(''),setViewingPost(work.post)):(setViewingPost(null),setViewingPortfolioUrl(work.url))}:undefined} onSaveMetadata={async value=>{const base=persistedProvider||draft;const next={...draft,portfolioTitles:{...(draft.portfolioTitles||{}),[viewingPortfolioUrl]:value.title},portfolioDescriptions:{...(draft.portfolioDescriptions||{}),[viewingPortfolioUrl]:value.description}};const saved=await saveOwnedServiceProvider({...base,...next,id:base.id,ownerId:currentUser.id});setDraft(saved);notifyUpdated(saved);setMessage('تم حفظ عنوان ووصف العمل.')}} onDelete={async()=>{const base=persistedProvider||draft;const next={...draft,portfolio:(draft.portfolio||[]).filter(x=>x!==viewingPortfolioUrl)};const saved=await saveOwnedServiceProvider({...base,...next,id:base.id,ownerId:currentUser.id});setDraft(saved);setViewingPortfolioUrl('');setMessage('تم حذف العمل وحفظ التغيير.')}}/>}
      {bookingDialog && <BookingStatusSummaryDialog bookings={bookingDialog === 'accepted' ? acceptedBookings : pendingBookings} variant={bookingDialog} onClose={()=>setBookingDialog(null)} onManage={()=>{const filter=bookingDialog === 'accepted' ? 'مقبول' : 'قيد المراجعة';setBookingDialog(null);onOpenBookings(filter);}} />}
    </div>
  );
};
