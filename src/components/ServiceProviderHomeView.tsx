import React, { useState } from 'react';
import { Camera, Calendar, CheckCircle2, XCircle, Clock, Sparkles, Phone, MapPin, DollarSign, Save } from 'lucide-react';
import { WednakLogo } from './WednakLogo';
import { ServiceProvider, Booking, UserProfile, FeedPost } from '../types';

interface ServiceProviderHomeViewProps {
  currentUser: UserProfile;
  serviceProviders: ServiceProvider[];
  bookings: Booking[];
  onUpdateProvider: (updatedProvider: ServiceProvider) => void;
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status']) => void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => void;
}

export const ServiceProviderHomeView: React.FC<ServiceProviderHomeViewProps> = ({
  currentUser,
  serviceProviders,
  bookings,
  onUpdateProvider,
  onUpdateBookingStatus,
  onCreatePost,
}) => {
  // Find service provider belonging to this user
  const fallbackProvider: ServiceProvider = {
    id: 'provider-fallback',
    ownerId: currentUser.id,
    name: 'مزود خدمة تجريبي',
    serviceCategory: 'تصوير وفيديو',
    city: 'بغداد',
    location: 'بغداد',
    rating: 4.9,
    reviewsCount: 15,
    priceStart: 500000,
    priceStartFormatted: '500,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
    portfolio: ['https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80'],
    phone: currentUser.phone,
    description: 'تفاصيل الخدمة',
    isVerified: false,
  };

  const myProvider: ServiceProvider = serviceProviders.find(
    (sp) => sp.id === currentUser.ownedProviderId || sp.ownerId === currentUser.id
  ) || serviceProviders[0] || fallbackProvider;

  // Provider Filtered Bookings
  const providerBookings = bookings.filter(
    (b) => (myProvider?.id && b.itemId === myProvider.id) || b.ownerId === currentUser.id
  );

  const pendingBookings = providerBookings.filter((b) => b.status === 'قيد المراجعة');
  const acceptedBookings = providerBookings.filter((b) => b.status === 'مقبول');

  const totalEarnings = acceptedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Edit Provider Form
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(myProvider.name);
  const [priceStart, setPriceStart] = useState(myProvider.priceStart);
  const [phone, setPhone] = useState(myProvider.phone);
  const [description, setDescription] = useState(myProvider.description);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Post Offer State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ServiceProvider = {
      ...myProvider,
      name,
      priceStart: Number(priceStart),
      priceStartFormatted: `${Number(priceStart).toLocaleString('ar-IQ')} د.ع`,
      phone,
      description,
    };
    onUpdateProvider(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postCaption) return;

    onCreatePost({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: myProvider.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      authorRole: 'مزود خدمة',
      targetType: 'provider',
      targetId: myProvider.id,
      title: postTitle,
      caption: postCaption,
      mediaType: 'image',
      mediaUrl: postMediaUrl || myProvider.coverImage || 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
      city: myProvider.city,
    });

    setPostTitle('');
    setPostCaption('');
    setPostMediaUrl('');
    setIsCreatingPost(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 dir-rtl" id="service-provider-home-dashboard">
      
      {/* Top Banner: Service Provider Welcome & Stats */}
      <div className="bg-gradient-to-r from-emerald-900 via-amber-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-amber-400/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              لوحة تحكم مزود الخدمة (ServiceProvider Home)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 mt-2">
              أهلاً بك، {currentUser.name} 📷
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-1">
              إدارة خدمات وحجوزات {myProvider.name} ({myProvider.serviceCategory})
            </p>
          </div>

          <button
            onClick={() => setIsCreatingPost(!isCreatingPost)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
            id="provider-create-post-btn"
          >
            <WednakLogo className="w-6 h-6 ring-1 ring-black/10" />
            <span>نشر أعمالك في Explore</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
              <Clock className="w-4 h-4" />
              <span>الطلبات الجديدة</span>
            </div>
            <div className="text-2xl font-black text-white">{pendingBookings.length} طلب</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>الحجوزات المقبولة</span>
            </div>
            <div className="text-2xl font-black text-white">{acceptedBookings.length} حجز</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold mb-1">
              <Camera className="w-4 h-4" />
              <span>التقييم العام</span>
            </div>
            <div className="text-2xl font-black text-white">⭐ {myProvider.rating}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
              <DollarSign className="w-4 h-4" />
              <span>إجمالي المبيعات</span>
            </div>
            <div className="text-xl font-black text-amber-200">{totalEarnings.toLocaleString('ar-IQ')} د.ع</div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>تم حفظ بيانات الخدمة وباقة الأسعار بنجاح!</span>
        </div>
      )}

      {/* Form: Create Post Panel */}
      {isCreatingPost && (
        <div className="bg-amber-50/80 p-6 rounded-3xl border border-amber-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              عرض كواليس عملك وحزم العروض في Explore
            </h3>
            <button onClick={() => setIsCreatingPost(false)} className="text-xs text-gray-500 font-bold">إلغاء</button>
          </div>

          <form onSubmit={handlePublishPost} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">عنوان العرض / الفيديو:</label>
                <input
                  type="text"
                  placeholder="مثال: خصم 15% على تصوير العرائس بألبوم حراري 4K"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">رابط صورة/فيديو من أعمالك:</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 text-xs text-gray-900 dir-ltr text-left outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">تفاصيل العرض والباقة:</label>
              <textarea
                rows={3}
                placeholder="اشرح للزبائن تفاصيل الباقة، التغطية، أو الخصم المتاح..."
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              نشر العرض لجميع الزبائن 🚀
            </button>
          </form>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Right Section: Incoming Requests (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-800" />
                طلبات حجز الخدمة الواردة ({providerBookings.length})
              </h2>
              <p className="text-xs text-gray-500">راجع الطلبات واقبل الحجز لتأكيد موعد العمل مع الزبون</p>
            </div>
          </div>

          {providerBookings.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">لا توجد طلبات حجز خدمة حالية</h3>
              <p className="text-xs text-gray-500">عند طلب الزبائن لخدمتك، ستظهر جميع الطلبات هنا للقبول أو الرفض.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providerBookings.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white p-5 rounded-3xl border transition-all shadow-xs space-y-4 ${
                    b.status === 'قيد المراجعة'
                      ? 'border-amber-300 bg-amber-50/30'
                      : b.status === 'مقبول'
                      ? 'border-emerald-200'
                      : 'border-gray-200 opacity-80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-xl">
                        رمز الطلب: {b.id}
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        الزبون: {b.customerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dir-ltr font-mono">{b.customerPhone}</span>
                      <span
                        className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                          b.status === 'مقبول'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'قيد المراجعة'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>

                  {/* Booking Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">تاريخ الفعالية:</span>
                      <span className="font-bold text-emerald-900">{b.date}</span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">الفترة الزمنية:</span>
                      <span className="font-bold text-gray-800">{b.timeSlot}</span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">إجمالي كلفة الخدمة:</span>
                      <span className="font-bold text-gray-800">{(b.totalPrice || 0).toLocaleString('ar-IQ')} د.ع</span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">العربون المطلوب:</span>
                      <span className="font-bold text-amber-700">{(b.depositAmount || 0).toLocaleString('ar-IQ')} د.ع</span>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="text-xs bg-amber-50 p-3 rounded-2xl border border-amber-100 text-amber-900">
                      <span className="font-bold">ملاحظات الزبون الخاصة: </span>
                      <span>{b.notes}</span>
                    </div>
                  )}

                  {/* Action Buttons for Provider */}
                  {b.status === 'قيد المراجعة' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من قبول حجز الخدمة للزبون (${b.customerName}) بتاريخ ${b.date}؟`)) {
                            onUpdateBookingStatus(b.id, 'مقبول');
                          }
                        }}
                        className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1"
                        id={`accept-provider-booking-btn-${b.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبول حجز الخدمة</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من رفض طلب حجز الخدمة للزبون (${b.customerName})؟`)) {
                            onUpdateBookingStatus(b.id, 'مرفوض');
                          }
                        }}
                        className="py-2 px-4 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                        id={`reject-provider-booking-btn-${b.id}`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض الطلب</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Left Section: My Service Details & Edit (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-800" />
                معلومات ملف خدمتك
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-emerald-800 underline"
              >
                {isEditing ? 'إلغاء' : 'تعديل'}
              </button>
            </div>

            {/* Provider Banner */}
            <div className="relative rounded-2xl overflow-hidden h-40">
              <img src={myProvider.coverImage} alt={myProvider.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                <div className="text-white flex items-center gap-3">
                  <img src={myProvider.avatar} alt={myProvider.name} className="w-10 h-10 rounded-full border-2 border-amber-400 object-cover shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm">{myProvider.name}</h3>
                    <p className="text-[10px] text-amber-300 font-bold">{myProvider.serviceCategory}</p>
                  </div>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-3 text-xs text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">بداية أسعار الباقات:</span>
                  <span className="font-bold text-emerald-900">{myProvider.priceStartFormatted}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">هاتف التواصل:</span>
                  <span className="font-bold text-gray-900 dir-ltr">{myProvider.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">المحافظة والمدينة:</span>
                  <span className="font-bold text-gray-800">{myProvider.location}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1 font-bold">تفاصيل الخدمة:</span>
                  <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-[11px]">
                    {myProvider.description}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveDetails} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">اسم الاستوديو / المركز:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">بداية سعر الباقة (د.ع):</label>
                  <input
                    type="number"
                    value={priceStart}
                    onChange={(e) => setPriceStart(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900 dir-ltr text-left"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">وصف العروض والباقات:</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ معلومات الخدمة</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
