import React, { useState } from 'react';
import { X, User, Lock, Phone, Sparkles, Building2, Camera, LogOut, CheckCircle2, ShieldCheck, ArrowRight, Eye, KeyRound, ShieldAlert, Check } from 'lucide-react';
import { AccountType, UserProfile } from '../types';
import { fetchUserFromFirestore, findUserByPhoneFromFirestore, saveUserToFirestore, GUEST_ANONYMOUS_USER } from '../data/usersDatabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLoginSuccess: (userDoc: UserProfile) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  // Navigation mode between the main 4 choices and login
  const [mode, setMode] = useState<'select' | 'guest' | 'login' | 'reg_customer' | 'reg_owner' | 'reg_provider'>('select');

  // Form State
  const [phone, setPhone] = useState('07701122334');
  const [name, setName] = useState('');
  const [city, setCity] = useState('بغداد');
  const [hallName, setHallName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<string>('تصوير وفيديو');
  
  // OTP Step
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // 1) Handle Direct Guest Login
  const handleEnterAsGuest = () => {
    onLoginSuccess(GUEST_ANONYMOUS_USER);
    onClose();
  };

  // 2) Send OTP
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMessage('يرجى إدخال رقم الهاتف العراقي بشكل صحيح.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      setSuccessMsg(`تم إرسال رمز التحقق OTP إلى الرقم ${phone}`);
    }, 400);
  };

  // 3) Complete Auth after OTP Code
  const handleVerifyOtpAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      setErrorMessage('رمز التحقق غير صحيح. الرمز الافتراضي للتجربة هو 123456');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Clean phone
      const cleanPhone = phone.trim();

      // Check if user with this phone already exists in Firestore!
      const existingUser = await findUserByPhoneFromFirestore(cleanPhone);

      // If logging in or if existing user found: Protect existing account type!
      if (existingUser) {
        setSuccessMsg(`أهلاً بك مجدداً ${existingUser.name}! تم استعادة حسابك بنجاح.`);
        onLoginSuccess(existingUser);
        setTimeout(() => onClose(), 600);
        return;
      }

      if (mode === 'login' && !existingUser) {
        setErrorMessage(`لا يوجد حساب مسجل بالرقم ${phone}. يرجى اختيار أحد خيارات التسجيل أدناه.`);
        setIsLoading(false);
        return;
      }

      // New user registration based on chosen mode
      let chosenAccountType: AccountType = 'زبون';
      if (mode === 'reg_owner') chosenAccountType = 'صاحب قاعة';
      if (mode === 'reg_provider') chosenAccountType = 'مزود خدمة';

      const newUid = `user-${Date.now().toString().slice(-6)}`;
      const newUserDoc: UserProfile = {
        id: newUid,
        name: name.trim() || (mode === 'reg_owner' ? hallName : 'مستخدم ويدنك'),
        phone: cleanPhone,
        email: `${newUid}@wednak.app`,
        city: city,
        accountType: chosenAccountType,
        hallName: mode === 'reg_owner' ? hallName : undefined,
        serviceCategory: mode === 'reg_provider' ? serviceCategory : undefined,
        isGuest: false,
        profileCompleted: true,
      };

      if (chosenAccountType === 'صاحب قاعة') {
        newUserDoc.ownedHallId = 'hall-1';
      } else if (chosenAccountType === 'مزود خدمة') {
        newUserDoc.ownedProviderId = 'provider-1';
      }

      await saveUserToFirestore(newUserDoc);
      onLoginSuccess(newUserDoc);
      setTimeout(() => onClose(), 400);
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء حفظ بيانات الحساب في Firestore');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setOtpSent(false);
    setErrorMessage('');
    setSuccessMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto dir-rtl" id="auth-modal-overlay">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">تسجيل الدخول والدور في Wedنك</h2>
              <p className="text-[11px] text-amber-200">اختر طريقة الدخول للبدء بتصفح القاعات والخدمات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            id="close-auth-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Status */}
        <div className="px-5 pt-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-gray-500 block">الحساب المتصل حالياً:</span>
              <span className="font-bold text-emerald-900">{currentUser.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full mr-2 font-black ${
                currentUser.isGuest
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentUser.isGuest ? 'ضيف Guest' : currentUser.accountType}
              </span>
            </div>

            {!currentUser.isGuest && (
              <button
                onClick={() => {
                  onLogout();
                  setMode('select');
                  resetForm();
                }}
                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                id="auth-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 space-y-4">

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: Select from the 4 main paths */}
          {mode === 'select' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 mb-2">اختر طريقة الدخول المناسبة لك:</h3>

              {/* Option 1: Guest */}
              <button
                onClick={handleEnterAsGuest}
                className="w-full p-3.5 bg-amber-50/60 hover:bg-amber-100/70 border border-amber-300/80 rounded-2xl text-right transition-all flex items-center justify-between group"
                id="btn-login-as-guest"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center shadow-xs">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-amber-950 flex items-center gap-1">
                      1) الدخول كضيف (Guest)
                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-black">بدون تسجيل</span>
                    </div>
                    <div className="text-[10px] text-amber-800">تصفح القاعات ومزودي الخدمات والتفاصيل فوراً</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-700 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* Option 2: Register as Customer */}
              <button
                onClick={() => { setMode('reg_customer'); resetForm(); }}
                className="w-full p-3.5 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl text-right transition-all flex items-center justify-between group"
                id="btn-register-customer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-emerald-950">2) التسجيل كزبون</div>
                    <div className="text-[10px] text-emerald-800">لحجز القاعات والخدمات ومتابعة حالة الطلبات</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* Option 3: Register as Hall Owner */}
              <button
                onClick={() => { setMode('reg_owner'); resetForm(); }}
                className="w-full p-3.5 bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200 rounded-2xl text-right transition-all flex items-center justify-between group"
                id="btn-register-owner"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-bold flex items-center justify-center shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-purple-950">3) التسجيل كصاحب قاعة</div>
                    <div className="text-[10px] text-purple-800">لإضافة واستقبال حجوزات القاعة وإدارة المواعيد</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-700 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* Option 4: Register as Service Provider */}
              <button
                onClick={() => { setMode('reg_provider'); resetForm(); }}
                className="w-full p-3.5 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200 rounded-2xl text-right transition-all flex items-center justify-between group"
                id="btn-register-provider"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-blue-950">4) التسجيل كمزود خدمة</div>
                    <div className="text-[10px] text-blue-800">للمصورين، الكوشات، الصالونات، والبوفيهات</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-700 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* Sign In Link for existing accounts */}
              <div className="pt-2 border-t border-gray-100 text-center">
                <button
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-900 underline flex items-center justify-center gap-1 mx-auto"
                  id="btn-existing-user-login"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>لديك حساب سابق برقم الهاتف؟ تسجيل الدخول</span>
                </button>
              </div>
            </div>
          )}

          {/* FORM: Registration or Login Step */}
          {mode !== 'select' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <button
                  onClick={() => { setMode('select'); resetForm(); }}
                  className="text-xs font-bold text-gray-500 hover:text-emerald-800 flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>الرجوع للخيارات</span>
                </button>
                <span className="text-xs font-bold text-emerald-900">
                  {mode === 'login' && 'تسجيل الدخول لحساب سابق'}
                  {mode === 'reg_customer' && 'إنشاء حساب زبون جديد'}
                  {mode === 'reg_owner' && 'إنشاء حساب صاحب قاعة'}
                  {mode === 'reg_provider' && 'إنشاء حساب مزود خدمة'}
                </span>
              </div>

              {!otpSent ? (
                /* Step 1: Input Details & Phone */
                <form onSubmit={handleSendOtp} className="space-y-3">
                  {mode === 'reg_customer' && (
                    <div>
                      <label className="text-xs font-bold text-gray-800 block mb-1">الاسم الكامل:</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أدخل اسمك الكامل"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                        required
                      />
                    </div>
                  )}

                  {mode === 'reg_owner' && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-gray-800 block mb-1">اسم صاحب الحساب / المدبر:</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="مثال: سيف مجيد"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-800 block mb-1">اسم القاعة الخاص بك:</label>
                        <input
                          type="text"
                          value={hallName}
                          onChange={(e) => setHallName(e.target.value)}
                          placeholder="مثال: قاعة الملكة الفخمة"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                          required
                        />
                      </div>
                    </>
                  )}

                  {mode === 'reg_provider' && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-gray-800 block mb-1">اسم المقدم / الاستوديو:</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="مثال: أحمد المصور"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-800 block mb-1">نوع الخدمة:</label>
                        <select
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 outline-none"
                        >
                          <option value="تصوير وفيديو">تصوير وفيديو</option>
                          <option value="تزيين وكوشة">تزيين وكوشة</option>
                          <option value="فرقة وسنترال">فرقة وسنترال</option>
                          <option value="سيارات زفاف">سيارات زفاف</option>
                          <option value="صالون ومكياج عرائس">صالون ومكياج عرائس</option>
                          <option value="ضيافة وبوفيه">ضيافة وبوفيه</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-800 block mb-1">رقم الهاتف العراقي:</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07701122334"
                        className="w-full pr-9 pl-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600 dir-ltr text-left font-mono"
                        required
                      />
                    </div>
                  </div>

                  {mode !== 'login' && (
                    <div>
                      <label className="text-xs font-bold text-gray-800 block mb-1">المحافظة:</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 outline-none"
                      >
                        {['بغداد', 'أربيل', 'البصرة', 'النجف', 'كربلاء', 'الموصل', 'السليمانية'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    id="btn-send-otp-code"
                  >
                    <span>{isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق (OTP)'}</span>
                  </button>
                </form>
              ) : (
                /* Step 2: Input OTP Verification Code */
                <form onSubmit={handleVerifyOtpAndProceed} className="space-y-3">
                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <span className="font-bold text-amber-900 block">رمز التحقق الافتراضي لتجربة النظام: 123456</span>
                    <span className="text-[11px] text-amber-800 block">تم إرسال الرسالة إلى الرقم: {phone}</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-800 block mb-1">أدخل رمز OTP المتكون من 6 أرقام:</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-center text-lg font-mono font-bold tracking-widest text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-600"
                      maxLength={6}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    id="btn-confirm-otp"
                  >
                    {isLoading ? 'جاري التحقق وقراءة الحساب...' : 'تأكيد الرمز والدخول إلى Wedنك'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-[11px]">Wedنك Firebase Phone Authentication System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
