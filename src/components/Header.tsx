import React from 'react';
import { Heart, Bell, Search, User, Sparkles, MapPin } from 'lucide-react';
import { AccountType } from '../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  cities: string[];
  favoritesCount: number;
  unreadNotificationsCount: number;
  currentAccountType: AccountType;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab = 'home',
  onSelectTab,
  selectedCity = 'جميع المحافظات',
  onSelectCity,
  cities = [],
  favoritesCount = 0,
  unreadNotificationsCount = 0,
  currentAccountType = 'زبون',
  onOpenAuthModal,
}) => {
  const isAdmin = currentAccountType === 'مدير' || currentAccountType === 'مدير Admin';
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-sm transition-all" id="app-main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2 group text-right focus:outline-none"
              id="brand-logo-btn"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-amber-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-emerald-900 tracking-tight flex items-center gap-1">
                  Wedنك <span className="text-amber-600 text-xs font-normal bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">ويدنك</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium">حجوزات القاعات والزفاف في العراق</span>
              </div>
            </button>

            {!isAdmin && <div className="hidden md:flex items-center gap-1 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => onSelectCity(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-medium text-emerald-900"
                id="header-city-select"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>}
          </div>

          {!isAdmin && <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'home', label: 'الرئيسية' },
              { id: 'explore', label: 'الاستكشاف (Explore)' },
              { id: 'search', label: 'البحث الشامل' },
              { id: 'bookings', label: 'الحجوزات' },
              { id: 'favorites', label: 'المفضلة' },
              { id: 'complaints', label: 'الشكاوى والبلاغات' }
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => onSelectTab(nav.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === nav.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50'
                }`}
                id={`desktop-nav-${nav.id}`}
              >
                {nav.label}
              </button>
            ))}
          </nav>}

          <div className="flex items-center gap-2">
            {!isAdmin && <button
              onClick={() => onSelectTab('search')}
              className={`p-2 rounded-xl text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors ${currentTab === 'search' ? 'bg-emerald-100 text-emerald-800' : ''}`}
              title="بحث سريع"
              id="header-search-icon-btn"
            >
              <Search className="w-5 h-5" />
            </button>}

            {!isAdmin && <button
              onClick={() => onSelectTab('notifications')}
              className={`relative p-2 rounded-xl text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors ${currentTab === 'notifications' ? 'bg-emerald-100 text-emerald-800' : ''}`}
              title="الإشعارات"
              id={isAdmin ? 'admin-new-registrations-notifications-btn' : 'header-notifications-btn'}
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>}

            {!isAdmin && <button
              onClick={() => onSelectTab('favorites')}
              className={`relative p-2 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors ${currentTab === 'favorites' ? 'bg-rose-50 text-rose-600' : ''}`}
              title="المفضلة"
              id="header-favorites-btn"
            >
              <Heart className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {favoritesCount}
                </span>
              )}
            </button>}

            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-semibold text-amber-900 shadow-2xs">
              <span className="text-[10px] text-amber-700 hidden sm:inline">نوع الحساب:</span>
              <span className="font-bold text-emerald-900 text-xs" id="account-type-header-label">{currentAccountType}</span>
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="mr-1 text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-950 font-black px-1.5 py-0.5 rounded-lg transition-colors"
                  title="تسجيل الدخول أو تبديل الحساب"
                  id="open-auth-modal-header-btn"
                >
                  الحساب
                </button>
              )}
            </div>

            <button
              onClick={() => onSelectTab('profile')}
              className={`p-2 rounded-xl border transition-all ${
                currentTab === 'profile'
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300'
              }`}
              title="الحساب الشخصي"
              id="header-profile-btn"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
