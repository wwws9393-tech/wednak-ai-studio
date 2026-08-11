import React from 'react';
import { Home, Compass, Calendar, Heart, ShieldAlert, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  favoritesCount: number;
  bookingsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  favoritesCount,
  bookingsCount,
}) => {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'explore', label: 'استكشف', icon: Compass },
    { id: 'bookings', label: 'حجوزاتي', icon: Calendar, badge: bookingsCount },
    { id: 'favorites', label: 'المفضلة', icon: Heart, badge: favoritesCount },
    { id: 'complaints', label: 'الشكاوى', icon: ShieldAlert },
    { id: 'profile', label: 'حسابي', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-1 shadow-lg" id="mobile-bottom-nav">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-center transition-all ${
                isActive ? 'text-emerald-700 font-bold scale-105' : 'text-gray-500 hover:text-gray-800'
              }`}
              id={`mobile-tab-${tab.id}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
