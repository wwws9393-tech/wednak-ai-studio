import React, { useState } from 'react';
import { Compass, Sparkles, Filter, Building2, Camera, MapPin } from 'lucide-react';
import { FeedPost, Hall, ServiceProvider, UserProfile } from '../types';
import { PostCard } from './PostCard';
import { HallCard } from './HallCard';
import { ServiceProviderCard } from './ServiceProviderCard';

interface ExploreViewProps {
  posts: FeedPost[];
  halls: Hall[];
  serviceProviders: ServiceProvider[];
  likedPostIds: string[];
  favoriteIds: string[];
  onTogglePostLike: (postId: string) => void;
  onToggleFavorite: (id: string, type: 'hall' | 'provider') => void;
  onSelectHall: (hall: Hall) => void;
  onBookHall: (hall: Hall) => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  onBookProvider: (provider: ServiceProvider) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  cities: string[];
  currentUser?: UserProfile;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  posts = [],
  halls = [],
  serviceProviders = [],
  likedPostIds = [],
  favoriteIds = [],
  onTogglePostLike,
  onToggleFavorite,
  onSelectHall,
  onBookHall,
  onSelectProvider,
  onBookProvider,
  selectedCity = 'جميع المحافظات',
  onSelectCity,
  cities = ['جميع المحافظات', 'بغداد', 'أربيل', 'البصرة', 'النجف', 'كربلاء', 'الموصل', 'السليمانية'],
  currentUser,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'halls' | 'providers'>('all');

  const filteredPosts = posts.filter(
    (p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity
  );

  const filteredHalls = halls.filter(
    (h) => selectedCity === 'جميع المحافظات' || h.city === selectedCity
  );

  const filteredProviders = serviceProviders.filter(
    (p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="explore-view-container">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-amber-900 p-6 rounded-3xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full mb-2 inline-block">
            منشورات وعروض حية ✨
          </span>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-300" />
            استكشف أحدث عروض القاعات والزفاف
          </h1>
          <p className="text-xs text-amber-100 mt-1">تصفح صور وفيديوهات حية كوشات، كواليس تصوير، وعروض موسم الصيف</p>
        </div>

        {/* City Filter in Banner */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 self-start sm:self-auto">
          <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
          <select
            value={selectedCity}
            onChange={(e) => onSelectCity(e.target.value)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            id="explore-city-select"
          >
            {cities.map((c) => (
              <option key={c} value={c} className="text-gray-900">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterType === 'all'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
          }`}
          id="explore-filter-all"
        >
          الكل
        </button>

        <button
          onClick={() => setFilterType('posts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            filterType === 'posts'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
          }`}
          id="explore-filter-posts"
        >
          <Sparkles className="w-3.5 h-3.5" />
          المنشورات والعروض ({filteredPosts.length})
        </button>

        <button
          onClick={() => setFilterType('halls')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            filterType === 'halls'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
          }`}
          id="explore-filter-halls"
        >
          <Building2 className="w-3.5 h-3.5" />
          القاعات ({filteredHalls.length})
        </button>

        <button
          onClick={() => setFilterType('providers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            filterType === 'providers'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
          }`}
          id="explore-filter-providers"
        >
          <Camera className="w-3.5 h-3.5" />
          مزودو الخدمات ({filteredProviders.length})
        </button>
      </div>

      {/* Main Grid Feed */}
      <div className="space-y-8">
        
        {/* Posts Feed */}
        {(filterType === 'all' || filterType === 'posts') && filteredPosts.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              أحدث التحديثات والعروض المصورة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={likedPostIds.includes(post.id)}
                  onToggleLike={onTogglePostLike}
                  onOpenTarget={(p) => {
                    if (p.targetType === 'hall') {
                      const h = halls.find((x) => x.id === p.targetId);
                      if (h) onSelectHall(h);
                    } else {
                      const sp = serviceProviders.find((x) => x.id === p.targetId);
                      if (sp) onSelectProvider(sp);
                    }
                  }}
                  onBookTarget={(p) => {
                    if (p.targetType === 'hall') {
                      const h = halls.find((x) => x.id === p.targetId);
                      if (h) onBookHall(h);
                    } else {
                      const sp = serviceProviders.find((x) => x.id === p.targetId);
                      if (sp) onBookProvider(sp);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Featured Halls */}
        {(filterType === 'all' || filterType === 'halls') && filteredHalls.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-800" />
              دليل القاعات في {selectedCity}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHalls.map((hall) => (
                <HallCard
                  key={hall.id}
                  hall={hall}
                  isFavorite={favoriteIds.includes(hall.id)}
                  onToggleFavorite={onToggleFavorite}
                  onSelectHall={onSelectHall}
                  onBookHall={onBookHall}
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        )}

        {/* Service Providers */}
        {(filterType === 'all' || filterType === 'providers') && filteredProviders.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-amber-600" />
              دليل مزودي الخدمات والزفاف
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProviders.map((provider) => (
                <ServiceProviderCard
                  key={provider.id}
                  provider={provider}
                  isFavorite={favoriteIds.includes(provider.id)}
                  onToggleFavorite={onToggleFavorite}
                  onSelectProvider={onSelectProvider}
                  onBookProvider={onBookProvider}
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
