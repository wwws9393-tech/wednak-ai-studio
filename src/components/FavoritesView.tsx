import React, { useState } from 'react';
import { Heart, Building2, Camera, Sparkles } from 'lucide-react';
import { Hall, ServiceProvider } from '../types';
import { HallCard } from './HallCard';
import { ServiceProviderCard } from './ServiceProviderCard';

interface FavoritesViewProps {
  favoriteIds: string[];
  halls: Hall[];
  serviceProviders: ServiceProvider[];
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onSelectHall: (hall: Hall) => void;
  onBookHall: (hall: Hall) => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  onBookProvider: (provider: ServiceProvider) => void;
  onSelectTab: (tab: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favoriteIds = [],
  halls = [],
  serviceProviders = [],
  onToggleFavorite,
  onSelectHall,
  onBookHall,
  onSelectProvider,
  onBookProvider,
  onSelectTab,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'halls' | 'providers'>('all');

  const favoriteHalls = halls.filter((h) => favoriteIds.includes(h.id));
  const favoriteProviders = serviceProviders.filter((p) => favoriteIds.includes(p.id));

  const totalFavorites = favoriteHalls.length + favoriteProviders.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="favorites-view-container">
      
      {/* Title */}
      <div className="bg-gradient-to-r from-rose-900 to-rose-800 p-6 rounded-3xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-300 fill-current" />
            قائمة المفضلة والمحفوظات
          </h1>
          <p className="text-xs text-rose-100 mt-1">القاعات ومزودو الخدمات الذين تم حفظهم لمقارنتهم والرجوع إليهم لاحقاً</p>
        </div>

        <span className="bg-rose-500 text-white font-black text-xs px-3.5 py-1.5 rounded-2xl border border-rose-400 self-start sm:self-auto">
          المجموع: {totalFavorites} عنصر
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-rose-50'
          }`}
        >
          الكل ({totalFavorites})
        </button>

        <button
          onClick={() => setActiveTab('halls')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'halls'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-rose-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          القاعات ({favoriteHalls.length})
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'providers'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-rose-50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          مزودو الخدمات ({favoriteProviders.length})
        </button>
      </div>

      {/* Content */}
      {totalFavorites === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">لا توجد عناصر مضافة للمفضلة حتى الآن</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            انقر على رمز القلب ❤️ عند تصفح القاعات أو مزودي الخدمات لحفظها هنا والرجوع إليها بسهولة.
          </p>
          <button
            onClick={() => onSelectTab('home')}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-block mt-2"
          >
            تصفح القاعات والمزودين
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Favorite Halls Grid */}
          {(activeTab === 'all' || activeTab === 'halls') && favoriteHalls.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                القاعات المفضلة ({favoriteHalls.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favoriteHalls.map((hall) => (
                  <HallCard
                    key={hall.id}
                    hall={hall}
                    isFavorite={true}
                    onToggleFavorite={onToggleFavorite}
                    onSelectHall={onSelectHall}
                    onBookHall={onBookHall}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Favorite Providers Grid */}
          {(activeTab === 'all' || activeTab === 'providers') && favoriteProviders.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                مزودو الخدمات المفضلون ({favoriteProviders.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favoriteProviders.map((provider) => (
                  <ServiceProviderCard
                    key={provider.id}
                    provider={provider}
                    isFavorite={true}
                    onToggleFavorite={onToggleFavorite}
                    onSelectProvider={onSelectProvider}
                    onBookProvider={onBookProvider}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
