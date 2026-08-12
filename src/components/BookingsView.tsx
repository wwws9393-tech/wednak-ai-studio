import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, Eye, ArrowRight } from 'lucide-react';
import { Booking, BookingStatus } from '../types';

interface BookingsViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onSelectTab: (tab: string) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookings = [],
  onSelectBooking,
  onSelectTab,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('الكل');

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'الكل') return true;
    return b.status === activeFilter;
  });

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case 'قيد المراجعة':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'مقبول':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'مرفوض':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'ملغي':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  const createdText=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'غير معروف':date.toLocaleString('ar-IQ',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="bookings-view-container">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 rounded-3xl text-white shadow-md">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-300" />
            سجل الحجوزات والطلبات
          </h1>
          <p className="text-xs text-amber-100 mt-1">متابعة حالة الطلبات، مواعيد الحجوزات، وقيم العربون المسددة</p>
        </div>

        <button
          onClick={() => onSelectTab('home')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-2xl shadow-xs transition-all self-start sm:self-auto flex items-center gap-1"
        >
          <span>تصفح القاعات والخدمات</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {['الكل', 'قيد المراجعة', 'مقبول', 'مرفوض', 'ملغي'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === filter
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50'
            }`}
            id={`filter-booking-${filter}`}
          >
            {filter} ({filter === 'الكل' ? bookings.length : bookings.filter(b => b.status === filter).length})
          </button>
        ))}
      </div>

      {/* List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">لا توجد حجوزات ضمن هذا التبويب</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            يمكنك حجز القاعات ومزودي الخدمات بكل سهولة واختيار الموعد المناسب لليلة زفافك.
          </p>
          <button
            onClick={() => onSelectTab('home')}
            className="px-5 py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-800 transition-colors inline-block mt-2"
          >
            استكشف القاعات الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
              onClick={() => onSelectBooking(b)}
              id={`booking-card-${b.id}`}
            >
              <div className="flex items-start gap-3">
                <img
                  src={b.itemImage}
                  alt={b.itemName}
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0 group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-gray-400">{b.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                    {b.itemName}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {b.itemLocation}
                  </p>
                </div>
              </div>

              {/* Date & Pricing Bar */}
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block">تاريخ المناسبة:</span>
                  <span className="font-extrabold text-emerald-900">{b.date}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-gray-500 block">العربون المسدد:</span>
                  <span className="font-black text-amber-700">{(b.depositAmount || 0).toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* Details Action */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500">الفترة: {b.timeSlot ? b.timeSlot.split(' ')[0] : 'غير محدد'}</span>
                <span className="font-bold text-emerald-700 group-hover:translate-x-[-2px] transition-transform flex items-center gap-1">
                  عرض التفاصيل <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="pt-2 border-t border-black text-[11px] font-medium text-black">تاريخ إنشاء الحجز: {createdText(b.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
