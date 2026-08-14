import React from 'react';
import { Heart, Star, Users, MapPin, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Hall, UserProfile } from '../types';
import { formatAreaWithCity } from '../lib/location';

interface HallCardProps {
  hall: Hall;
  isFavorite: boolean;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onSelectHall: (hall: Hall) => void;
  onBookHall: (hall: Hall) => void;
  currentUser?: UserProfile;
  exploreStyle?: boolean;
}

const FALLBACK_HALL_IMAGE = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';

export const HallCard: React.FC<HallCardProps> = ({
  hall,
  isFavorite,
  onToggleFavorite,
  onSelectHall,
  onBookHall,
  currentUser,
  exploreStyle = false,
}) => {
  const isSelfHall = currentUser && (currentUser.id === hall.ownerId || currentUser.ownedHallId === hall.id);
  const hallImages = Array.isArray(hall.images) ? hall.images.filter(Boolean) : [];
  const mainImage = hall.coverImage || hallImages[0] || FALLBACK_HALL_IMAGE;
  const priceFormatted = hall.priceFormatted || `${Number(hall.price || 0).toLocaleString('ar-IQ')} د.ع`;
  const depositFormatted = hall.depositFormatted || `${Number(hall.deposit || 0).toLocaleString('ar-IQ')} د.ع`;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col justify-between ${exploreStyle ? 'border-lime-200/90 ring-1 ring-emerald-800/10 shadow-[0_10px_30px_rgba(6,95,70,0.08)]' : 'border-amber-100/80'}`}
      id={`hall-card-${hall.id}`}
    >
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onSelectHall(hall)}>
        <img
          src={mainImage}
          alt={hall.name || 'قاعة'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            const image = e.currentTarget;
            if (image.src !== FALLBACK_HALL_IMAGE) image.src = FALLBACK_HALL_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(hall.id, 'hall');
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-90 shadow-md ${
            isFavorite ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-700 hover:bg-white hover:text-rose-500'
          }`}
          title={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          id={`favorite-btn-hall-${hall.id}`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-white' : ''}`} />
        </button>

        <span className="absolute top-3 left-3 bg-emerald-900/80 backdrop-blur-md text-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-400/30">
          {hall.category || 'قاعة أفراح'}
        </span>

        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-1 bg-black/55 backdrop-blur-xs px-2 py-1.5 rounded-xl">
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold">{formatAreaWithCity(hall.location, hall.city)}</span>
          </div>
          <div className="flex items-center gap-1 bg-amber-500 text-black px-2 py-0.5 rounded-md font-bold">
            <Star className="w-3 h-3 fill-current" />
            <span>{Number(hall.rating || 0)}</span>
            <span className="text-[10px] text-gray-800">({Number(hall.reviewsCount || 0)})</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 onClick={() => onSelectHall(hall)} className="text-base font-bold text-gray-900 group-hover:text-emerald-800 transition-colors cursor-pointer line-clamp-1">
              {hall.name || 'قاعة أفراح'}
            </h3>
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
            {hall.description || 'تفاصيل القاعة ستظهر هنا بعد إكمال صاحب القاعة للملف.'}
          </p>

          <div className="grid grid-cols-2 gap-2 py-2 px-3 bg-amber-50/50 rounded-xl border border-amber-100/60 mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>السعة: <strong className="text-gray-900">{Number(hall.capacity || 0)} شخص</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>العربون: <strong className="text-emerald-800">{depositFormatted}</strong></span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] text-gray-500 block">سعر الحجز الإجمالي:</span>
            <span className="text-base font-black text-emerald-800">{priceFormatted}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => onSelectHall(hall)} className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors" id={`details-btn-hall-${hall.id}`}>
              التفاصيل
            </button>
            {!isSelfHall ? (
              <button onClick={() => onBookHall(hall)} className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1" id={`book-btn-hall-${hall.id}`}>
                <span>احجز الآن</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1" title="قاعتك الخاصة">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                قاعتك
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
