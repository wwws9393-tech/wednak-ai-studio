import React, { useState } from 'react';
import { Search, Building2, Camera, MapPin, X, Filter, Sparkles } from 'lucide-react';
import { Hall, ServiceProvider, UserProfile } from '../types';
import { HallCard } from './HallCard';
import { ServiceProviderCard } from './ServiceProviderCard';

interface SearchViewProps {
  halls: Hall[];
  serviceProviders: ServiceProvider[];
  favoriteIds: string[];
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

export const SearchView: React.FC<SearchViewProps> = ({
  halls,
  serviceProviders,
  favoriteIds,
  onToggleFavorite,
  onSelectHall,
  onBookHall,
  onSelectProvider,
  onBookProvider,
  selectedCity,
  onSelectCity,
  cities,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');

  const categories = [
    'الكل',
    'قاعات فخمة',
    'حدائق ومناطق مفتوحة',
    'تصوير وفيديو',
    'صالون ومكياج عرائس',
    'فرقة وسنترال',
    'تزيين وكوشة',
    'سيارات زفاف'
  ];

  // Search logic returning matching halls & service providers
  const matchedHalls = halls.filter((h) => {
    const matchesCity = selectedCity === 'جميع المحافظات' || h.city === selectedCity;
    const matchesCategory = categoryFilter === 'الكل' || h.category === categoryFilter;
    const matchesTerm = !searchTerm.trim() || 
      h.name.includes(searchTerm) || 
      h.location.includes(searchTerm) || 
      h.description.includes(searchTerm);
    return matchesCity && matchesCategory && matchesTerm;
  });

  const matchedProviders = serviceProviders.filter((p) => {
    const matchesCity = selectedCity === 'جميع المحافظات' || p.city === selectedCity;
    const matchesCategory = categoryFilter === 'الكل' || p.serviceCategory === categoryFilter;
    const matchesTerm = !searchTerm.trim() || 
      p.name.includes(searchTerm) || 
      p.location.includes(searchTerm) || 
      p.description.includes(searchTerm);
    return matchesCity && matchesCategory && matchesTerm;
  });

  const totalResults = matchedHalls.length + matchedProviders.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="search-view-container">
      
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 rounded-3xl text-white shadow-md space-y-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Search className="w-6 h-6 text-amber-300" />
            البحث الشامل والمتقدم
          </h1>
          <p className="text-xs text-emerald-100 mt-1">ابحث باسم القاعة، المنطقة، المصور، الكوشة، أو المحافظة</p>
        </div>

        {/* Input Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب اسم القاعة، المنطقة، أو الخدمة المطلوب..."
              className="w-full bg-white text-gray-900 pr-10 pl-10 py-3 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
              id="search-term-input"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City Selector Dropdown */}
          <div className="flex items-center gap-2 bg-emerald-950 px-4 py-3 rounded-2xl border border-emerald-700/60 text-xs text-white">
            <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-bold text-white"
              id="search-city-select"
            >
              {cities.map((c) => (
                <option key={c} value={c} className="text-gray-900">{c}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              categoryFilter === cat
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
            }`}
            id={`category-filter-${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Results Summary */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>نتائج البحث: <strong className="text-emerald-900 font-bold">{totalResults} نتيجة</strong></span>
        {categoryFilter !== 'الكل' && (
          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">
            التصنيف: {categoryFilter}
          </span>
        )}
      </div>

      {/* Results Content */}
      {totalResults === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-3">
          <Search className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">لم نجد نتائج تطابق بحثك</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            جرب تغيير الكلمات المفتاحية أو اختيار "جميع المحافظات" أو إعادة ضبط التصنيفات.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('الكل');
              onSelectCity('جميع المحافظات');
            }}
            className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition-colors inline-block mt-2"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Matched Halls */}
          {matchedHalls.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-800" />
                القاعات المطابقة ({matchedHalls.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {matchedHalls.map((hall) => (
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

          {/* Matched Service Providers */}
          {matchedProviders.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                مزودو الخدمات المطابقون ({matchedProviders.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {matchedProviders.map((provider) => (
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
      )}

    </div>
  );
};
