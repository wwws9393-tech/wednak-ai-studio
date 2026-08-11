import React, { useEffect, useMemo, useState } from 'react';
import { X, Star, MapPin, Users, Sparkles, CheckCircle, Heart, Phone, ArrowLeft, Shield, Calendar, Clock, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { Hall, UserProfile, Booking } from '../types';
import { subscribeAvailability } from '../lib/firebase';

interface HallDetailsModalProps {
  hall: Hall | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onBookHall: (hall: Hall) => void;
  currentUser?: UserProfile;
  bookings?: Booking[];
}

export const HallDetailsModal: React.FC<HallDetailsModalProps> = ({
  hall,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onBookHall,
  currentUser,
  bookings = [],
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [busyMinutes, setBusyMinutes] = useState<number[]>([]);

  useEffect(() => {
    const itemId = hall?.id;
    if (!isOpen || !itemId || !selectedCalendarDate) {
      setBusyMinutes([]);
      return;
    }
    return subscribeAvailability(itemId, selectedCalendarDate, setBusyMinutes);
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

  if (!isOpen || !hall) return null;

  const isSelfHall = currentUser && (currentUser.id === hall.ownerId || currentUser.ownedHallId === hall.id);

  // Time slots list
  const STANDARD_SLOTS = [
    'صباحي (10:00 ص - 2:00 ظ)',
    'مسائي (6:00 م - 11:00 م)',
    'ليلي سهرة (11:00 م - 2:00 ص)',
  ];


  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" id="hall-details-modal-overlay">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-100 flex flex-col justify-between my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header & Main Photo Banner */}
        <div className="relative h-64 sm:h-80 w-full bg-black">
          <img
            src={hall.images[activeImageIndex] || hall.images[0]}
            alt={hall.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow-md"
            id="close-hall-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Favorite Toggle */}
          <button
            onClick={() => onToggleFavorite(hall.id, 'hall')}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-90 shadow-md ${
              isFavorite ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-800 hover:bg-white hover:text-rose-500'
            }`}
            id="favorite-btn-in-hall-modal"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current text-white' : ''}`} />
          </button>

          {/* Title & Category Banner */}
          <div className="absolute bottom-4 right-4 left-4 text-white">
            <span className="bg-amber-500 text-black text-xs font-black px-3 py-1 rounded-lg mb-2 inline-block">
              {hall.category}
            </span>
            <h2 className="text-xl sm:text-2xl font-black">{hall.name}</h2>
            <div className="flex items-center gap-3 text-xs text-gray-200 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                {hall.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Star className="w-3.5 h-3.5 fill-current" />
                {hall.rating} ({hall.reviewsCount} تقييم)
              </span>
            </div>
          </div>
        </div>

        {/* Thumbnail Selector */}
        {hall.images.length > 1 && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 overflow-x-auto border-b border-gray-100">
            {hall.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  activeImageIndex === idx ? 'border-emerald-600 scale-105 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Modal Main Content */}
        <div className="p-5 space-y-5">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/80">
              <span className="text-[11px] text-emerald-800 font-semibold block">سعر الحجز الشامل</span>
              <span className="text-base font-black text-emerald-900">{hall.priceFormatted}</span>
            </div>
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100/80">
              <span className="text-[11px] text-amber-800 font-semibold block">العربون المطلوب للتأكيد</span>
              <span className="text-base font-black text-amber-900">{hall.depositFormatted}</span>
            </div>
            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100/80 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-blue-800 font-semibold block">سعة الضيوف</span>
              <span className="text-base font-black text-blue-900 flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-600" /> {hall.capacity} شخص
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">عن القاعة:</h3>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
              {hall.description}
            </p>
          </div>

          {/* Features & Included Amenities */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              المميزات المشمولة في الحجز:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {hall.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/60 text-xs text-emerald-900 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feature}</span>
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
                  جدول المواعيد والتوفر لـ ({hall.name}):
                </h3>
                <p className="text-[11px] text-gray-500">اختر التاريخ للتحقق من الأوقات المتاحة للحجز المؤكد</p>
              </div>

              <input
                type="date"
                value={selectedCalendarDate}
                onChange={(e) => setSelectedCalendarDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-600 outline-none cursor-pointer self-start sm:self-auto"
                id="hall-calendar-date-picker"
              />
            </div>

            {/* Slots Availability Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STANDARD_SLOTS.map((slot) => {
                const isBooked = slotIsBooked(slot);
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

          {/* Guarantee Note */}
          <div className="flex items-center gap-2 bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>حجزك محمي وموثق بواسطة منصة **Wedنك**. يتم تأكيد الحجز فور دفع العربون مباشرة.</span>
          </div>

        </div>

        {/* Modal Bottom Sticky Booking Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between rounded-b-3xl">
          <div>
            <span className="text-[10px] text-gray-500 block">الإجمالي بالدينار العراقي:</span>
            <span className="text-lg font-black text-emerald-900">{hall.priceFormatted}</span>
          </div>

          {!isSelfHall ? (
            <button
              onClick={() => {
                onClose();
                onBookHall(hall);
              }}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-md active:scale-95 transition-all flex items-center gap-2"
              id="modal-direct-book-hall-btn"
            >
              <Calendar className="w-4 h-4" />
              <span>تأكيد موعد الحجز</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>هذه قاعتك الخاصة (لا يمكن حجز النفس)</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
