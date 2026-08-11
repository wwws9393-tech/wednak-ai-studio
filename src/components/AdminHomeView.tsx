import React from 'react';
import { ShieldAlert, Users, Building2, Calendar, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { Complaint, UserProfile, Booking } from '../types';

interface AdminHomeViewProps {
  currentUser: UserProfile;
  complaints: Complaint[];
  bookings: Booking[];
  onUpdateComplaintStatus: (id: string, status: Complaint['status'], adminReply?: string) => void;
}

export const AdminHomeView: React.FC<AdminHomeViewProps> = ({
  currentUser = { id: 'admin', name: 'مدير النظام', phone: '07700000000', email: '', city: 'بغداد', accountType: 'مدير Admin' },
  complaints = [],
  bookings = [],
  onUpdateComplaintStatus = () => {},
}) => {
  const pendingComplaints = complaints.filter((c) => c.status !== 'تمت المعالجة');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 dir-rtl" id="admin-home-dashboard">
      
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-gray-900 to-amber-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-amber-400/20 space-y-4">
        <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          لوحة الإدارة والمتابعة (Admin Home)
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-amber-100">
          مرحباً، {currentUser.name} (مدير النظام) 🛡️
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          متابعة بلاغات وشكاوى المستخدمين، استفسارات الحجوزات، والأداء العام للنظام
        </p>

        {/* Quick System Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="bg-white/10 p-4 rounded-2xl">
            <span className="text-xs text-amber-300 font-bold block mb-1">الشكاوى المعلقة</span>
            <span className="text-2xl font-black text-white">{pendingComplaints.length} بلاغ</span>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl">
            <span className="text-xs text-emerald-300 font-bold block mb-1">إجمالي الحجوزات</span>
            <span className="text-2xl font-black text-white">{bookings.length} حجز</span>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl">
            <span className="text-xs text-blue-300 font-bold block mb-1">حالة النظام</span>
            <span className="text-2xl font-black text-emerald-300">نشط 100%</span>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          مركز معالجة الشكاوى والاستفسارات ({complaints.length})
        </h2>

        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  {c.id} - {c.userName} ({c.userPhone})
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {c.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900">{c.subject}</h3>
                <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  {c.description}
                </p>
              </div>

              {c.adminReply ? (
                <div className="text-xs bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-emerald-900">
                  <span className="font-bold">رد الإدارة: </span>
                  <span>{c.adminReply}</span>
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <input
                    type="text"
                    id={`admin-reply-input-${c.id}`}
                    placeholder="اكتب رد الإدارة على الشكوى..."
                    className="flex-1 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-300 text-xs text-gray-900 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          onUpdateComplaintStatus(c.id, 'تمت المعالجة', val);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`admin-reply-input-${c.id}`) as HTMLInputElement;
                      if (input && input.value) {
                        onUpdateComplaintStatus(c.id, 'تمت المعالجة', input.value);
                      }
                    }}
                    className="px-4 py-1.5 bg-emerald-800 text-white font-bold text-xs rounded-xl"
                  >
                    إرسال الرد
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
