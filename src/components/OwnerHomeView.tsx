import React, { useState } from 'react';
import { Building2, Calendar, CheckCircle2, XCircle, Clock, Plus, Sparkles, DollarSign, Users, MapPin, Save, AlertCircle } from 'lucide-react';
import { Hall, Booking, UserProfile, FeedPost } from '../types';
import { Coordinates, HallMap } from './HallMap';

interface OwnerHomeViewProps {
  currentUser: UserProfile;
  halls: Hall[];
  bookings: Booking[];
  onUpdateHall: (updatedHall: Hall) => Promise<void> | void;
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status']) => void;
  onCreatePost: (post: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => void;
}

export const OwnerHomeView: React.FC<OwnerHomeViewProps> = ({
  currentUser,
  halls,
  bookings,
  onUpdateHall,
  onUpdateBookingStatus,
  onCreatePost,
}) => {
  // Find hall owned by this owner
  const myHall: Hall = halls.find((h) => h.id === currentUser.ownedHallId || h.ownerId === currentUser.id) || halls[0] || {
    id: 'hall-fallback',
    name: 'قاعة تجريبية',
    city: 'بغداد',
    location: 'بغداد',
    capacity: 300,
    price: 1500000,
    priceFormatted: '1,500,000 د.ع',
    deposit: 300000,
    depositFormatted: '300,000 د.ع',
    rating: 4.8,
    reviewsCount: 12,
    images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'],
    ownerId: currentUser.id,
    description: 'تفاصيل القاعة',
    features: [],
    category: 'قاعات فخمة'
  };

  // Hall Filtered Bookings
  const hallBookings = bookings.filter(
    (b) => (myHall?.id && b.itemId === myHall.id) || b.ownerId === currentUser.id
  );

  const pendingBookings = hallBookings.filter((b) => b.status === 'قيد المراجعة');
  const acceptedBookings = hallBookings.filter((b) => b.status === 'مقبول');

  // Total Revenue Calculation
  const totalRevenue = acceptedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Edit Hall Form State
  const [isEditingHall, setIsEditingHall] = useState(false);
  const [hallName, setHallName] = useState(myHall.name);
  const [hallPrice, setHallPrice] = useState(myHall.price);
  const [hallDeposit, setHallDeposit] = useState(myHall.deposit);
  const [hallCapacity, setHallCapacity] = useState(myHall.capacity);
  const [hallDescription, setHallDescription] = useState(myHall.description);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mapMessage, setMapMessage] = useState('');

  // Create Post Form State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');

  const handleSaveHallDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Hall = {
      ...myHall,
      name: hallName,
      price: Number(hallPrice),
      priceFormatted: `${Number(hallPrice).toLocaleString('ar-IQ')} د.ع`,
      deposit: Number(hallDeposit),
      depositFormatted: `${Number(hallDeposit).toLocaleString('ar-IQ')} د.ع`,
      capacity: Number(hallCapacity),
      description: hallDescription,
    };
    await onUpdateHall(updated);
    setIsEditingHall(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveMapLocation = async (coordinates: Coordinates) => {
    await onUpdateHall({
      ...myHall,
      mapLatitude: coordinates.latitude,
      mapLongitude: coordinates.longitude,
    });
    setMapMessage('تم حفظ موقع القاعة على الخريطة بنجاح');
    setTimeout(() => setMapMessage(''), 3000);
  };

  const handleDeleteMapLocation = async () => {
    await onUpdateHall({
      ...myHall,
      mapLatitude: null,
      mapLongitude: null,
    });
    setMapMessage('تم حذف موقع القاعة من الخريطة');
    setTimeout(() => setMapMessage(''), 3000);
  };

  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postCaption) return;

    onCreatePost({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: myHall.images[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80',
      authorRole: 'صاحب قاعة',
      targetType: 'hall',
      targetId: myHall.id,
      title: postTitle,
      caption: postCaption,
      mediaType: 'image',
      mediaUrl: postMediaUrl || myHall.images[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
      city: myHall.city,
    });

    setPostTitle('');
    setPostCaption('');
    setPostMediaUrl('');
    setIsCreatingPost(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 dir-rtl" id="owner-home-dashboard">
      
      {/* Top Banner: Owner Welcome & Stats */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-amber-400/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              لوحة تحكم صاحب القاعة (Owner Home)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 mt-2">
              أهلاً بك، {currentUser.name} 🏛️
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-1">
              إدارة حجوزات {myHall.name} وقبول/رفض طلبات الزبائن مباشرة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingPost(!isCreatingPost)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5"
              id="owner-create-post-btn"
            >
              <Sparkles className="w-4 h-4" />
              <span>نشر عرض في Explore</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
              <Clock className="w-4 h-4" />
              <span>الطلبات المعلقة</span>
            </div>
            <div className="text-2xl font-black text-white">{pendingBookings.length} طلب</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>الحجوزات المؤكدة</span>
            </div>
            <div className="text-2xl font-black text-white">{acceptedBookings.length} حجز</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold mb-1">
              <Building2 className="w-4 h-4" />
              <span>سعة القاعة</span>
            </div>
            <div className="text-2xl font-black text-white">{myHall.capacity} شخص</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
              <DollarSign className="w-4 h-4" />
              <span>إجمالي الحجوزات</span>
            </div>
            <div className="text-xl font-black text-amber-200">{totalRevenue.toLocaleString('ar-IQ')} د.ع</div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>تم تحديث معلومات القاعة بنجاح!</span>
        </div>
      )}

      {/* Form: Create Post Modal/Panel */}
      {isCreatingPost && (
        <div className="bg-amber-50/80 p-6 rounded-3xl border border-amber-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              نشر عرض جديد لقاعتك في شاشة الاستكشاف (Explore Feed)
            </h3>
            <button onClick={() => setIsCreatingPost(false)} className="text-xs text-gray-500 font-bold">إلغاء</button>
          </div>

          <form onSubmit={handlePublishPost} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">عنوان العرض / المنشور:</label>
                <input
                  type="text"
                  placeholder="مثال: خصم 20% على حجز قاعة الملكة لشهر أيلول"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">رابط صورة العرض (اختياري):</label>
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
              <label className="text-xs font-bold text-gray-800 block mb-1">تفاصيل العرض أو الديكور الجديد:</label>
              <textarea
                rows={3}
                placeholder="اكتب وصفاً جذاباً للعرائس وأصحاب المناسبات..."
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
              نشر المنشور الآن 🚀
            </button>
          </form>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Right Section: Incoming Booking Requests (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-800" />
                طلبات الحجز الواردة لقاعتك ({hallBookings.length})
              </h2>
              <p className="text-xs text-gray-500">راجع الطلبات واقبل الحجز أو ارفضه مع إشعار فور للزبون</p>
            </div>
          </div>

          {hallBookings.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">لا توجد طلبات حجز حالية لقاعتك</h3>
              <p className="text-xs text-gray-500">عندما يقوم الزبائن بتقديم حجز للقاعة، ستظهر الطلبات هنا مباشرة.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hallBookings.map((b) => (
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
                        رمز الحجز: {b.id}
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
                      <span className="text-[10px] text-gray-500 block">تاريخ المناسبة:</span>
                      <span className="font-bold text-emerald-900">{b.date}</span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">الفترة الزمنية:</span>
                      <span className="font-bold text-gray-800">{b.timeSlot}</span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">عدد الضيوف:</span>
                      <span className="font-bold text-gray-800">{b.guests || 'غير محدد'} شخص</span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-2xl">
                      <span className="text-[10px] text-gray-500 block">العربون المطلوب:</span>
                      <span className="font-bold text-amber-700">{(b.depositAmount || 0).toLocaleString('ar-IQ')} د.ع</span>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="text-xs bg-amber-50 p-3 rounded-2xl border border-amber-100 text-amber-900">
                      <span className="font-bold">ملاحظات الزبون: </span>
                      <span>{b.notes}</span>
                    </div>
                  )}

                  {/* Action Buttons for Owner */}
                  {b.status === 'قيد المراجعة' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من قبول طلب الحجز للزبون (${b.customerName}) بتاريخ ${b.date}؟`)) {
                            onUpdateBookingStatus(b.id, 'مقبول');
                          }
                        }}
                        className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1"
                        id={`accept-booking-btn-${b.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبول حجز القاعة</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من رفض طلب الحجز للزبون (${b.customerName})؟`)) {
                            onUpdateBookingStatus(b.id, 'مرفوض');
                          }
                        }}
                        className="py-2 px-4 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                        id={`reject-booking-btn-${b.id}`}
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

        {/* Left Section: My Hall Details & Quick Edit (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-800" />
                معلومات قاعتك الحالية
              </h2>
              <button
                onClick={() => setIsEditingHall(!isEditingHall)}
                className="text-xs font-bold text-emerald-800 underline"
              >
                {isEditingHall ? 'إلغاء' : 'تعديل'}
              </button>
            </div>

            {/* Hall Banner */}
            <div className="relative rounded-2xl overflow-hidden h-40">
              <img src={myHall.images[0]} alt={myHall.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                <div className="text-white">
                  <h3 className="font-bold text-sm">{myHall.name}</h3>
                  <p className="text-[10px] text-gray-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-300" />
                    {myHall.location}
                  </p>
                </div>
              </div>
            </div>

            <HallMap
              hallName={myHall.name}
              coordinates={
                myHall.mapLatitude != null && myHall.mapLongitude != null
                  ? {
                      latitude: myHall.mapLatitude,
                      longitude: myHall.mapLongitude,
                    }
                  : null
              }
              editable
              compact
              onSave={handleSaveMapLocation}
              onDelete={handleDeleteMapLocation}
            />
            {mapMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                {mapMessage}
              </div>
            )}

            {!isEditingHall ? (
              <div className="space-y-3 text-xs text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">السعر الكامل:</span>
                  <span className="font-bold text-emerald-900">{myHall.priceFormatted}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">مبلغ العربون:</span>
                  <span className="font-bold text-amber-700">{myHall.depositFormatted}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">سعة الضيوف:</span>
                  <span className="font-bold text-gray-900">{myHall.capacity} شخص</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1 font-bold">الوصف المميز:</span>
                  <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-[11px]">
                    {myHall.description}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveHallDetails} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">اسم القاعة:</label>
                  <input
                    type="text"
                    value={hallName}
                    onChange={(e) => setHallName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-800 block mb-1">السعر الكلي (د.ع):</label>
                    <input
                      type="number"
                      value={hallPrice}
                      onChange={(e) => setHallPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-800 block mb-1">مبلغ العربون (د.ع):</label>
                    <input
                      type="number"
                      value={hallDeposit}
                      onChange={(e) => setHallDeposit(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">سعة الاستيعاب (عدد الضيوف):</label>
                  <input
                    type="number"
                    value={hallCapacity}
                    onChange={(e) => setHallCapacity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">وصف القاعة:</label>
                  <textarea
                    rows={3}
                    value={hallDescription}
                    onChange={(e) => setHallDescription(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات القاعة</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
