import React, { useState } from 'react';
import { User, ShieldAlert, Phone, Mail, MapPin, Building2, ShieldCheck, FileText, Lock, HelpCircle, Save, CheckCircle2 } from 'lucide-react';
import { UserProfile, AccountType } from '../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSelectTab: (tab: string) => void;
  onOpenPrivacyModal: () => void;
  onOpenTermsModal: () => void;
  onOpenSupportModal: () => void;
  onOpenAuthModal?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser = { id: 'guest', name: 'زائر', phone: '07700000000', email: '', city: 'بغداد', accountType: 'زبون' },
  onUpdateProfile = (_updated: Partial<UserProfile>) => {},
  onSelectTab = (_tab: string) => {},
  onOpenPrivacyModal = () => {},
  onOpenTermsModal = () => {},
  onOpenSupportModal = () => {},
  onOpenAuthModal,
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [city, setCity] = useState(currentUser?.city || 'بغداد');
  const [accountType, setAccountType] = useState<AccountType>(currentUser?.accountType || 'زبون');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      phone,
      email,
      city,
      accountType,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="profile-view-container">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-amber-900 p-6 rounded-3xl text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 text-black font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white">
            {currentUser.name.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{currentUser.name}</h1>
              <span className="bg-amber-300 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {currentUser.accountType}
              </span>
            </div>
            <p className="text-xs text-amber-100 mt-1 dir-ltr text-right">{currentUser.phone}</p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>تم حفظ بيانات الحساب والتغييرات بنجاح!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Account Form */}
        <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <User className="w-4 h-4 text-emerald-700" />
            تعديل المعلومات الشخصية
          </h2>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">الاسم الكامل (يدعم العربية):</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                required
                id="profile-name-input"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">رقم الهاتف:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 text-left dir-ltr focus:ring-2 focus:ring-emerald-600 outline-none"
                required
                id="profile-phone-input"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">البريد الإلكتروني:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 text-left dir-ltr focus:ring-2 focus:ring-emerald-600 outline-none"
                id="profile-email-input"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">نوع الحساب والصلاحية:</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                id="profile-account-type-select"
              >
                <option value="زبون">زبون (حجز وتصفح)</option>
                <option value="صاحب قاعة">صاحب قاعة (إدارة قاعات وحجوزات)</option>
                <option value="مزود خدمة">مزود خدمة (تصوير، كوشة، سيارات، الخ)</option>
                <option value="مدير Admin">مدير Admin (إدارة الشكاوى والنظام)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 pt-2"
              id="save-profile-btn"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </form>
        </div>

        {/* Right Column: Shortcuts & Legal links */}
        <div className="md:col-span-5 space-y-4">
          
          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">روابط واختصارات سريعة</h2>

            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs flex items-center justify-between shadow-xs transition-colors"
                id="profile-switch-account-btn"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  تبديل الحساب / تسجيل دخول كـ دور آخر
                </span>
                <span>←</span>
              </button>
            )}

            <button
              onClick={() => onSelectTab('bookings')}
              className="w-full p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50 text-gray-800 font-bold text-xs flex items-center justify-between border border-gray-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                متابعة الحجوزات والطلبات
              </span>
              <span>←</span>
            </button>

            <button
              onClick={() => onSelectTab('complaints')}
              className="w-full p-3 rounded-2xl bg-gray-50 hover:bg-amber-50 text-gray-800 font-bold text-xs flex items-center justify-between border border-gray-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                تقديم شكوى أو متابعة بلاغ
              </span>
              <span>←</span>
            </button>
          </div>

          {/* Legal & Support Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">الدعم الفني والسياسات</h2>

            <button
              onClick={onOpenPrivacyModal}
              className="w-full p-2.5 rounded-xl hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-2 transition-colors text-right"
            >
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>سياسة الخصوصية والبيانات</span>
            </button>

            <button
              onClick={onOpenTermsModal}
              className="w-full p-2.5 rounded-xl hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-2 transition-colors text-right"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>شروط الاستخدام وأحكام الحجز</span>
            </button>

            <button
              onClick={onOpenSupportModal}
              className="w-full p-2.5 rounded-xl hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-2 transition-colors text-right"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>التواصل مع الدعم الفني (WWWS.9393@gmail.com)</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
