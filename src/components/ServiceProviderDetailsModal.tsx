import React, { useState } from 'react';
import { X, Star, MapPin, Phone, Heart, CheckCircle2, Camera, Calendar, Shield, Clock, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { ServiceProvider, UserProfile, Booking } from '../types';

interface ServiceProviderDetailsModalProps {
  provider: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onBookProvider: (provider: ServiceProvider) => void;
  currentUser?: UserProfile;
  bookings?: Booking[];
}

export const ServiceProviderDetailsModal: React.FC<ServiceProviderDetailsModalProps> = ({
  provider,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onBookProvider,
  currentUser,
  bookings = [],
}) => {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  if (!isOpen || !provider) return null;

  const isSelfProvider = currentUser && (currentUser.id === provider.ownerId || currentUser.ownedProviderId === provider.id);

  const STANDARD_SLOTS = [
    'صباحي (10:00 ص - 2:00 ظ)',
    'مسائي (6:00 م - 11:00 م)',
    'ليلي سهرة (11:00 م - 2:00 ص)',
  ];

  const blockingBookingsForDate = bookings.filter(
    (b) =>
      b.itemId === provider.id &&
      b.date === selectedCalendarDate &&
      (b.status === 'قيد المراجعة' ||
        b.status === 'pending' ||
        b.status === 'مقبول' ||
        b.status === 'accepted')
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" id="provider-details-modal-overlay">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200 flex flex-col justify-between my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cover Image & Header */}
        <div className="relative h-52 sm:h-64 w-full bg-black">
          <img
            src={provider.coverImage}
            alt={provider.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow-md"
            id="close-provider-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Favorite Button */}
          <button
            onClick={() => onToggleFavorite(provider.id, 'provider')}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-90 shadow-md ${
              isFavorite ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-800 hover:bg-white hover:text-rose-500'
            }`}
            id="favorite-btn-in-provider-modal"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current text-white' : ''}`} />
          </button>

          {/* Avatar and Name Overlay */}
          <div className="absolute bottom-4 right-4 left-4 flex items-end gap-3 text-white">
            <div className="w-16 h-16 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-lg shrink-0">
              <img src={provider.avatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-md mb-1 inline-block">
                {provider.serviceCategory}
              </span>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-1.5">
                {provider.name}
                {provider.isVerified && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-800" />
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  {provider.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {provider.rating} ({provider.reviewsCount} تقييم)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-5">
          
          {/* Price & Contact Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-emerald-800 font-semibold block">تبدأ العروض من:</span>
              <span className="text-base font-black text-emerald-900">{provider.priceStartFormatted}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-500 block">الهاتف المباشر:</span>
                <span className="text-xs font-bold text-gray-900 text-left dir-ltr block">{provider.phone}</span>
              </div>
              <a 
                href={`tel:${provider.phone}`}
                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                title="اتصال"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">تفاصيل الخدمة:</h3>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
              {provider.description}
            </p>
          </div>

          {/* Portfolio Grid */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              معرض الأعمال والألبومات ({provider.portfolio.length}):
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {provider.portfolio.map((img, idx) => (
                <div key={idx} className="h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          </div>

          {/* Availability Calendar & Schedule Widget */}
          <div className="bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/60 p-4 rounded-3xl border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  جدول مواعيد الخدمة والتوفر لـ ({provider.name}):
                </h3>
                <p className="text-[11px] text-gray-500">اختر التاريخ للتحقق من الأوقات المتاحة للحجز المؤكد</p>
              </div>

              <input
                type="date"
                value={selectedCalendarDate}
                onChange={(e) => setSelectedCalendarDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-600 outline-none cursor-pointer self-start sm:self-auto"
                id="provider-calendar-date-picker"
              />
            </div>

            {/* Slots Availability Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STANDARD_SLOTS.map((slot) => {
                const isBooked = blockingBookingsForDate.some((b) => b.timeSlot === slot);
                return (
                  <div
                    key={slot}
                    className={`p-3 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                      isBooked
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {slot.split(' ')[0]}
                      </span>
                      {isBooked ? (
                        <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          غير متاح
                        </span>
                      ) : (
                        <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          متاح
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600">{slot}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Banner */}
          <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>مزود خدمة موثق من إدارة **Wedنك**. ضمان أداء الخدمة بالجودة المحددة.</span>
          </div>

        </div>

        {/* Modal Bottom Booking Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between rounded-b-3xl">
          <div>
            <span className="text-[10px] text-gray-500 block">السعر الأساسي:</span>
            <span className="text-base font-black text-emerald-900">{provider.priceStartFormatted}</span>
          </div>

          {!isSelfProvider ? (
            <button
              onClick={() => {
                onClose();
                onBookProvider(provider);
              }}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-md active:scale-95 transition-all flex items-center gap-2"
              id="modal-direct-book-provider-btn"
            >
              <Calendar className="w-4 h-4" />
              <span>إرسال طلب حجز</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>هذه خدمتك الخاصة (لا يمكن حجز النفس)</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
