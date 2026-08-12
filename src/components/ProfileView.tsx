import React, { useEffect, useState } from 'react';
import { User, ShieldAlert, Phone, Mail, MapPin, Building2, FileText, Lock, HelpCircle, Save, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Hall, ServiceProvider, UserProfile } from '../types';
import { CroppedImageInput } from './CroppedImageInput';
import { uploadOwnerMedia } from '../lib/storage';

interface ProfileViewProps {
  currentUser: UserProfile;
  halls?: Hall[];
  serviceProviders?: ServiceProvider[];
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void> | void;
  onSelectTab: (tab: string) => void;
  onOpenPrivacyModal: () => void;
  onOpenTermsModal: () => void;
  onOpenSupportModal: () => void;
  onOpenAuthModal?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, halls = [], serviceProviders = [], onUpdateProfile, onSelectTab, onOpenPrivacyModal, onOpenTermsModal, onOpenSupportModal, onOpenAuthModal }) => {
  const ownedHall = halls.find((hall) => hall.ownerId === currentUser.id || (!!currentUser.ownedHallId && hall.id === currentUser.ownedHallId));
  const ownedProvider = serviceProviders.find((provider) => provider.ownerId === currentUser.id || (!!currentUser.ownedProviderId && provider.id === currentUser.ownedProviderId));
  const businessProfileImage = currentUser.accountType === 'صاحب قاعة' ? ownedHall?.profileImageUrl : currentUser.accountType === 'مزود خدمة' ? ownedProvider?.avatar : undefined;
  const businessCoverImage = currentUser.accountType === 'صاحب قاعة' ? (ownedHall?.coverImage || ownedHall?.images?.[0]) : currentUser.accountType === 'مزود خدمة' ? ownedProvider?.coverImage : undefined;
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [city, setCity] = useState(currentUser.city || 'بغداد');
  const [profileImageUrl, setProfileImageUrl] = useState(businessProfileImage || currentUser.profileImageUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(businessCoverImage || currentUser.coverImageUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadProfileImage = async (file: File, kind: 'profile' | 'cover') => {
    setError(''); setUploading(true);
    try { const url = await uploadOwnerMedia(file, kind === 'profile' ? 'user-profile' : 'user-cover'); if(kind==='profile') setProfileImageUrl(url); else setCoverImageUrl(url); }
    catch(err){ setError(err instanceof Error ? err.message : 'تعذر رفع الصورة.'); }
    finally { setUploading(false); }
  };

  useEffect(() => {
    setName(currentUser.name || ''); setEmail(currentUser.email || ''); setCity(currentUser.city || 'بغداد');
    setProfileImageUrl(businessProfileImage || currentUser.profileImageUrl || ''); setCoverImageUrl(businessCoverImage || currentUser.coverImageUrl || '');
  }, [currentUser.id, currentUser.name, currentUser.email, currentUser.city, currentUser.profileImageUrl, currentUser.coverImageUrl, businessProfileImage, businessCoverImage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (!name.trim()) throw new Error('الاسم مطلوب.');
      await onUpdateProfile({ name: name.trim(), email: email.trim(), city, profileImageUrl: profileImageUrl.trim(), coverImageUrl: coverImageUrl.trim() });
      setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ البيانات.'); }
    finally { setSaving(false); }
  };

  if (currentUser.isGuest) {
    return <div className="max-w-2xl mx-auto px-4 py-10"><div className="bg-white border rounded-3xl p-8 text-center space-y-3"><User className="w-10 h-10 mx-auto text-emerald-700"/><h2 className="font-black">أنت تتصفح كضيف</h2><p className="text-xs text-gray-500">سجل برقم هاتفك لإنشاء ملف شخصي وحفظ الحجوزات والمفضلة.</p>{onOpenAuthModal && <button onClick={onOpenAuthModal} className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold">تسجيل الدخول / إنشاء حساب</button>}</div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="profile-view-container">
      <div className="relative overflow-hidden rounded-3xl min-h-44 bg-gradient-to-r from-emerald-900 to-amber-900 text-white shadow-md">
        {coverImageUrl && <img src={coverImageUrl} alt="الغلاف" className="absolute inset-0 w-full h-full object-cover" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>}
        {coverImageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"/>}
        <div className="relative p-6 flex items-end gap-4 min-h-44">
          <div className="w-20 h-20 rounded-2xl bg-amber-400 border-2 border-white overflow-hidden flex items-center justify-center text-black font-black text-2xl">
            {profileImageUrl ? <img src={profileImageUrl} alt={currentUser.name} className="w-full h-full object-cover" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/> : (currentUser.name.charAt(0) || 'U')}
          </div>
          <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold">{currentUser.name}</h1><span className="bg-amber-300 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full">{currentUser.accountType}</span></div><p className="text-xs text-amber-100 mt-1 dir-ltr text-right">{currentUser.phone}</p></div>
        </div>
      </div>

      {savedSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600"/>تم حفظ بيانات الحساب.</div>}
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-gray-200 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3"><User className="w-4 h-4 text-emerald-700"/>المعلومات الشخصية</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div><label className="text-xs font-bold block mb-1">الاسم</label><input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs" required/></div>
            <div><label className="text-xs font-bold block mb-1"><Phone className="inline w-3.5 h-3.5"/> رقم الهاتف الموثق</label><input value={currentUser.phone} readOnly className="w-full px-3 py-2 rounded-xl border bg-gray-100 text-xs dir-ltr"/><p className="text-[10px] text-gray-500 mt-1">لا يمكن تغيير رقم الهوية من الملف الشخصي. يتطلب ذلك مسار تحقق مستقل.</p></div>
            <div><label className="text-xs font-bold block mb-1"><Mail className="inline w-3.5 h-3.5"/> البريد الإلكتروني (اختياري)</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs dir-ltr"/></div>
            <div><label className="text-xs font-bold block mb-1"><MapPin className="inline w-3.5 h-3.5"/> المحافظة</label><input value={city} onChange={(e)=>setCity(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
            <div><label className="text-xs font-bold block mb-1"><ImageIcon className="inline w-3.5 h-3.5"/> الصورة الشخصية</label><CroppedImageInput label="اختيار وتعديل الصورة الشخصية" aspect={1} onReady={(f)=>void uploadProfileImage(f,'profile')}/>{profileImageUrl&&<img src={profileImageUrl} alt="معاينة" className="mt-2 w-20 h-20 rounded-full object-cover"/>}</div>
            <div><label className="text-xs font-bold block mb-1">صورة الغلاف</label><CroppedImageInput label="اختيار وتعديل صورة الغلاف" aspect={16/7} onReady={(f)=>void uploadProfileImage(f,'cover')}/>{coverImageUrl&&<img src={coverImageUrl} alt="معاينة الغلاف" className="mt-2 w-full h-24 rounded-xl object-cover"/>}</div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900"><b>نوع الحساب: {currentUser.accountType}</b><br/>نوع الحساب ثابت ولا يمكن تبديله من الإعدادات. لتسجيل دور مختلف استخدم حساب/رقم آخر وفق سياسة المنصة.</div>
            <button disabled={saving||uploading} className="w-full py-2.5 bg-emerald-700 disabled:bg-gray-400 text-white font-bold text-xs rounded-xl flex justify-center gap-1"><Save className="w-4 h-4"/>{uploading?'جاري رفع الصورة...':saving?'جاري الحفظ...':'حفظ التعديلات'}</button>
          </form>
        </div>

        <div className="md:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border space-y-3">
            <h2 className="text-sm font-bold border-b pb-2">اختصارات</h2>
            {onOpenAuthModal && <button onClick={onOpenAuthModal} className="w-full p-3 rounded-2xl bg-amber-500 text-black font-extrabold text-xs flex justify-between"><span>تسجيل خروج / دخول بحساب آخر</span><span>←</span></button>}
            <button onClick={()=>onSelectTab('bookings')} className="w-full p-3 rounded-2xl bg-gray-50 text-xs font-bold flex justify-between border"><span className="flex gap-2"><Building2 className="w-4 h-4 text-emerald-700"/>الحجوزات</span><span>←</span></button>
            <button onClick={()=>onSelectTab('complaints')} className="w-full p-3 rounded-2xl bg-gray-50 text-xs font-bold flex justify-between border"><span className="flex gap-2"><ShieldAlert className="w-4 h-4 text-amber-600"/>الشكاوى والبلاغات</span><span>←</span></button>
          </div>
          <div className="bg-white p-5 rounded-3xl border space-y-2"><h2 className="text-sm font-bold border-b pb-2">السياسات والدعم</h2><button onClick={onOpenPrivacyModal} className="w-full p-2.5 text-xs flex gap-2"><Lock className="w-4 h-4 text-emerald-700"/>سياسة الخصوصية</button><button onClick={onOpenTermsModal} className="w-full p-2.5 text-xs flex gap-2"><FileText className="w-4 h-4 text-emerald-700"/>شروط الاستخدام</button><button onClick={onOpenSupportModal} className="w-full p-2.5 text-xs flex gap-2"><HelpCircle className="w-4 h-4 text-emerald-700"/>الدعم الفني</button></div>
        </div>
      </div>
    </div>
  );
};
