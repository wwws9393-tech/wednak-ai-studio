import React from 'react';
import { Heart, Star, MapPin, CheckCircle2, ArrowLeft, Camera, Sparkles, ShieldCheck } from 'lucide-react';
import { ServiceProvider, UserProfile } from '../types';

interface ServiceProviderCardProps {
  provider: ServiceProvider;
  isFavorite: boolean;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  onBookProvider: (provider: ServiceProvider) => void;
  currentUser?: UserProfile;
}

export const ServiceProviderCard: React.FC<ServiceProviderCardProps> = ({
  provider,
  isFavorite,
  onToggleFavorite,
  onSelectProvider,
  onBookProvider,
  currentUser,
}) => {
  const isSelfProvider = currentUser && (currentUser.id === provider.ownerId || currentUser.ownedProviderId === provider.id);

  return (
    <div 
      className="bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-200 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col justify-between"
      id={`provider-card-${provider.id}`}
    >
      {/* Cover & Avatar Header */}
      <div className="relative h-36 w-full bg-gray-100 cursor-pointer" onClick={() => onSelectProvider(provider)}>
        <img
          src={provider.coverImage}
          alt={provider.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(provider.id, 'provider');
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 shadow-sm ${
            isFavorite
              ? 'bg-rose-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-white hover:text-rose-500'
          }`}
          title={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          id={`favorite-btn-provider-${provider.id}`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-white' : ''}`} />
        </button>

        {/* Category Pill */}
        <span className="absolute top-2.5 left-2.5 bg-amber-500 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shadow-xs">
          {provider.serviceCategory}
        </span>

        {/* Avatar */}
        <div className="absolute -bottom-5 right-4 w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-white">
          <img
            src={provider.avatar}
            alt={provider.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
            }}
          />
        </div>
      </div>

      {/* Body Content */}
      <div className="pt-7 px-4 pb-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3 
              onClick={() => onSelectProvider(provider)}
              className="text-sm font-bold text-gray-900 group-hover:text-emerald-800 transition-colors cursor-pointer line-clamp-1 flex items-center gap-1"
            >
              {provider.name}
              {provider.isVerified && (
                <span title="موثق" aria-label="مزود خدمة موثق">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 shrink-0" />
                </span>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
              <MapPin className="w-3 h-3" />
              {provider.location}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5 font-bold text-amber-600">
              <Star className="w-3 h-3 fill-current" />
              {provider.rating} ({provider.reviewsCount})
            </span>
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
            {provider.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] text-gray-500 block">تبدأ الأسعار من:</span>
            <span className="text-sm font-extrabold text-emerald-800">{provider.priceStartFormatted}</span>
          </div>

          {!isSelfProvider ? (
            <button
              onClick={() => onBookProvider(provider)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-2xs transition-all flex items-center gap-1"
              id={`book-btn-provider-${provider.id}`}
            >
              <span>طلب حجز</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          ) : (
            <span className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1" title="حسابك الخاص">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              خدمتك
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
