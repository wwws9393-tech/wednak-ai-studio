import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Calendar, CheckCircle2, XCircle, Clock, Sparkles, Save, AlertCircle, Tag, Image as ImageIcon } from 'lucide-react';
import { ServiceProvider, Booking, UserProfile, FeedPost, ServiceCategory } from '../types';
import { createBusinessOffer, saveOwnedServiceProvider } from '../lib/business';

interface ServiceProviderHomeViewProps {
  currentUser: UserProfile;
  serviceProviders: ServiceProvider[];
  bookings: Booking[];
  onUpdateProvider: (updatedProvider: ServiceProvider) => void;
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status']) => Promise<void> | void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => Promise<void> | void;
}

const CATEGORIES: ServiceCategory[] = ['تصوير وفيديو', 'تزيين وكوشة', 'فرقة وسنترال', 'سيارات زفاف', 'صالون ومكياج عرائس', 'ضيافة وبوفيه'];

const emptyProvider = (user: UserProfile): ServiceProvider => ({
  id: '',
  ownerId: user.id,
  name: user.name || '',
  serviceCategory: (CATEGORIES.includes(user.serviceCategory as ServiceCategory) ? user.serviceCategory : 'تصوير وفيديو') as ServiceCategory,
  city: user.city || 'بغداد',
  location: '',
  rating: 0,
  reviewsCount: 0,
  priceStart: 0,
  priceStartFormatted: '0 د.ع',
  avatar: user.profileImageUrl || '',
  coverImage: user.coverImageUrl || '',
  portfolio: [],
  description: '',
  phone: user.phone,
  isVerified: false,
});

export const ServiceProviderHomeView: React.FC<ServiceProviderHomeViewProps> = ({
  currentUser,
  serviceProviders,
  bookings,
  onUpdateProvider,
  onUpdateBookingStatus,
  onCreatePost,
}) => {
  const persistedProvider = useMemo(
    () => serviceProviders.find((provider) => provider.ownerId === currentUser.id || (!!currentUser.ownedProviderId && provider.id === currentUser.ownedProviderId)),
    [serviceProviders, currentUser.id, currentUser.ownedProviderId]
  );

  const [draft, setDraft] = useState<ServiceProvider>(() => persistedProvider || emptyProvider(currentUser));
  const [isEditing, setIsEditing] = useState(!persistedProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [portfolioText, setPortfolioText] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerPrice, setOfferPrice] = useState(0);
  const [offerStart, setOfferStart] = useState('');
  const [offerEnd, setOfferEnd] = useState('');

  useEffect(() => {
    if (persistedProvider) {
      setDraft(persistedProvider);
      setPortfolioText(persistedProvider.portfolio.join('\n'));
      setIsEditing(false);
    }
  }, [persistedProvider]);

  const providerBookings = bookings.filter((booking) => booking.targetOwnerId === currentUser.id && booking.itemType === 'provider');
  const pendingBookings = providerBookings.filter((booking) => booking.status === 'قيد المراجعة' || booking.status === 'pending');
  const acceptedBookings = providerBookings.filter((booking) => booking.status === 'مقبول' || booking.status === 'accepted');

  const setField = <K extends keyof ServiceProvider>(key: K, value: ServiceProvider[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const saveProvider = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (!draft.name.trim() || !draft.location.trim()) return setError('اسم الخدمة والموقع مطلوبان.');
    if (draft.priceStart < 0) return setError('السعر غير صحيح.');

    setIsSaving(true);
    try {
      const saved = await saveOwnedServiceProvider({
        ...draft,
        ownerId: currentUser.id,
        portfolio: portfolioText.split('\n').map((value) => value.trim()).filter(Boolean),
        phone: currentUser.phone || draft.phone,
      });
      setDraft(saved);
      onUpdateProvider(saved);
      setIsEditing(false);
      setMessage('تم حفظ صفحة الخدمة في Firestore بنجاح.');
    } catch (err) {
      console.error('Provider save failed:', err);
      setError(err instanceof Error ? err.message : 'تعذر حفظ صفحة الخدمة.');
    } finally {
      setIsSaving(false);
    }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const activeProvider = persistedProvider || (draft.id ? draft : null);
    if (!activeProvider) return setError('احفظ صفحة الخدمة أولاً قبل النشر.');
    if (!postTitle.trim() || !postCaption.trim()) return setError('عنوان المنشور والوصف مطلوبان.');
    try {
      await onCreatePost({
        authorId: currentUser.id,
        authorName: activeProvider.name,
        authorAvatar: activeProvider.avatar || activeProvider.coverImage || '',
        authorRole: 'مزود خدمة',
        targetType: 'provider',
        targetId: activeProvider.id,
        title: postTitle.trim(),
        caption: postCaption.trim(),
        mediaType: 'image',
        mediaUrl: postMediaUrl.trim() || activeProvider.coverImage || activeProvider.portfolio[0] || '',
        city: activeProvider.city,
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
    const activeProvider = persistedProvider || (draft.id ? draft : null);
    if (!activeProvider) return setError('احفظ صفحة الخدمة أولاً قبل إنشاء العرض.');
    try {
      await createBusinessOffer({
        ownerType: 'مزود خدمة',
        targetId: activeProvider.id,
        title: offerTitle,
        description: offerDescription,
        originalPrice: activeProvider.priceStart,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 dir-rtl" id="service-provider-home-dashboard">
      <div className="bg-gradient-to-r from-emerald-950 via-amber-900 to-emerald-950 p-6 rounded-3xl text-white shadow-xl">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full">حساب مزود خدمة</span>
        <h1 className="text-2xl font-black text-amber-100 mt-2">أهلاً {currentUser.name}</h1>
        <p className="text-xs text-gray-200 mt-1">صفحتك وحجوزاتك ومواعيدك منفصلة عن جميع الحسابات الأخرى.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-white/10 p-3 rounded-2xl"><Clock className="w-4 h-4 text-amber-300"/><b className="block mt-1">{pendingBookings.length}</b><span className="text-[11px]">طلبات جديدة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><CheckCircle2 className="w-4 h-4 text-emerald-300"/><b className="block mt-1">{acceptedBookings.length}</b><span className="text-[11px]">حجوزات مؤكدة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><Camera className="w-4 h-4 text-blue-300"/><b className="block mt-1">{draft.serviceCategory}</b><span className="text-[11px]">نوع الخدمة</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><Tag className="w-4 h-4 text-amber-300"/><b className="block mt-1">{draft.priceStart.toLocaleString('ar-IQ')}</b><span className="text-[11px]">ابتداءً من د.ع</span></div>
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
              {persistedProvider.portfolio.length > 0 && <div className="grid grid-cols-3 gap-2">{persistedProvider.portfolio.slice(0,6).map((url) => <img key={url} src={url} alt="عمل" className="h-20 w-full object-cover rounded-xl bg-gray-100"/>)}</div>}
            </div>
          ) : (
            <form onSubmit={saveProvider} className="space-y-3">
              <input value={draft.name} onChange={(e) => setField('name', e.target.value)} placeholder="اسم الخدمة أو الاستوديو" className="w-full px-3 py-2 border rounded-xl text-xs" required/>
              <select value={draft.serviceCategory} onChange={(e) => setField('serviceCategory', e.target.value as ServiceCategory)} className="w-full px-3 py-2 border rounded-xl text-xs">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
              <div className="grid grid-cols-2 gap-2"><input value={draft.location} onChange={(e) => setField('location', e.target.value)} placeholder="العنوان" className="px-3 py-2 border rounded-xl text-xs" required/><input value={draft.city} onChange={(e) => setField('city', e.target.value)} placeholder="المحافظة" className="px-3 py-2 border rounded-xl text-xs" required/></div>
              <input value={draft.coverImage} onChange={(e) => setField('coverImage', e.target.value)} placeholder="رابط الصورة الرئيسية" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr"/>
              <input value={draft.avatar} onChange={(e) => setField('avatar', e.target.value)} placeholder="رابط صورة الحساب" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr"/>
              <input type="number" value={draft.priceStart} onChange={(e) => setField('priceStart', Number(e.target.value))} placeholder="السعر الابتدائي" className="w-full px-3 py-2 border rounded-xl text-xs"/>
              <textarea value={draft.description} onChange={(e) => setField('description', e.target.value)} placeholder="وصف الخدمة" className="w-full px-3 py-2 border rounded-xl text-xs h-20"/>
              <textarea value={portfolioText} onChange={(e) => setPortfolioText(e.target.value)} placeholder="روابط صور الأعمال، كل رابط بسطر" className="w-full px-3 py-2 border rounded-xl text-xs h-24 dir-ltr"/>
              <button disabled={isSaving} className="w-full py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-4 h-4"/>{isSaving ? 'جاري الحفظ...' : persistedProvider ? 'حفظ التعديلات' : 'إنشاء صفحة الخدمة'}</button>
            </form>
          )}
        </section>

        <section className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-700"/>الحجوزات الواردة ({providerBookings.length})</h2>
          {providerBookings.length === 0 ? <div className="p-8 text-center text-xs text-gray-500 border border-dashed rounded-2xl">لا توجد حجوزات موجهة إلى خدمتك حالياً.</div> : providerBookings.map((booking) => (
            <div key={booking.id} className="p-4 border rounded-2xl space-y-2">
              <div className="flex justify-between gap-2"><b className="text-xs">{booking.requesterName || booking.customerName}</b><span className="text-[11px]">{booking.status}</span></div>
              <div className="text-[11px] text-gray-600">{booking.date} • {booking.startTime || booking.timeSlot} {booking.endTime ? `- ${booking.endTime}` : ''}</div>
              {(booking.status === 'قيد المراجعة' || booking.status === 'pending') && <div className="flex gap-2"><button onClick={() => onUpdateBookingStatus(booking.id, 'مقبول')} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold"><CheckCircle2 className="inline w-4 h-4 ml-1"/>قبول</button><button onClick={() => onUpdateBookingStatus(booking.id, 'مرفوض')} className="px-3 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold"><XCircle className="inline w-4 h-4 ml-1"/>رفض</button></div>}
            </div>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={publishPost} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Sparkles className="w-5 h-5 text-amber-600"/>نشر أعمالك في Explore</h2><input value={postTitle} onChange={(e)=>setPostTitle(e.target.value)} placeholder="عنوان المنشور" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={postCaption} onChange={(e)=>setPostCaption(e.target.value)} placeholder="الوصف" className="w-full px-3 py-2 border rounded-xl text-xs"/><input value={postMediaUrl} onChange={(e)=>setPostMediaUrl(e.target.value)} placeholder="رابط الصورة أو الوسائط" className="w-full px-3 py-2 border rounded-xl text-xs dir-ltr"/><button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold">نشر</button></form>
        <form onSubmit={publishOffer} className="bg-white p-5 rounded-3xl border space-y-3"><h2 className="font-bold flex gap-2"><Tag className="w-5 h-5 text-emerald-700"/>إنشاء عرض</h2><input value={offerTitle} onChange={(e)=>setOfferTitle(e.target.value)} placeholder="عنوان العرض" className="w-full px-3 py-2 border rounded-xl text-xs"/><textarea value={offerDescription} onChange={(e)=>setOfferDescription(e.target.value)} placeholder="تفاصيل العرض" className="w-full px-3 py-2 border rounded-xl text-xs"/><div className="grid grid-cols-3 gap-2"><input type="number" value={offerPrice} onChange={(e)=>setOfferPrice(Number(e.target.value))} placeholder="سعر العرض" className="px-2 py-2 border rounded-xl text-xs"/><input type="date" value={offerStart} onChange={(e)=>setOfferStart(e.target.value)} className="px-2 py-2 border rounded-xl text-xs"/><input type="date" value={offerEnd} onChange={(e)=>setOfferEnd(e.target.value)} className="px-2 py-2 border rounded-xl text-xs"/></div><button className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">حفظ العرض</button></form>
      </div>
    </div>
  );
};
