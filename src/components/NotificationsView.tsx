import React from 'react';
import { Bell, Calendar, Sparkles, ShieldAlert, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { AppNotification, Booking, Hall } from '../types';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenNotificationTarget: (notification: AppNotification) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications = [],
  onMarkAsRead = (_id: string) => {},
  onMarkAllAsRead = () => {},
  onOpenNotificationTarget = (_n: AppNotification) => {},
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="notifications-view-container">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 rounded-3xl text-white shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-300" />
            الإشعارات والتنبيهات
          </h1>
          <p className="text-xs text-emerald-100 mt-1">تحديثات حالة الحجز، العروض الحصرية، والردود الإدارية</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border border-emerald-600 transition-colors flex items-center gap-1 shrink-0"
            id="mark-all-notifications-read-btn"
          >
            <CheckCheck className="w-4 h-4 text-amber-300" />
            <span>تحديد الكل كتم القراءة</span>
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center text-gray-500 text-xs space-y-2">
          <Bell className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="font-bold text-gray-800">لا توجد إشعارات حالياً</p>
          <p>ستظهر هنا أي تحديثات فور قبول طلب حجزك أو ظهور عروض جديدة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onMarkAsRead(n.id);
                onOpenNotificationTarget(n);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 shadow-2xs hover:shadow-md ${
                !n.read
                  ? 'bg-emerald-50/60 border-emerald-200 font-medium'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
              id={`notification-card-${n.id}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'booking' ? 'bg-emerald-100 text-emerald-800' :
                n.type === 'offer' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'
              }`}>
                {n.type === 'booking' ? <Calendar className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{n.title}</h3>
                  <span className="text-[10px] text-gray-400 shrink-0">{n.date}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">{n.subtitle}</p>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="font-bold text-emerald-700 flex items-center gap-1 hover:underline">
                    الانتقال للتفاصيل المباشرة <ArrowLeft className="w-3 h-3" />
                  </span>
                  {!n.read && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full" title="غير مقروء" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
