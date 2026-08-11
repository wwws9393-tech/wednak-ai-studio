import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  User,
  Phone,
  Sparkles,
  Building2,
  Camera,
  LogOut,
  ArrowRight,
  Eye,
  KeyRound,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { AccountType, UserProfile } from '../types';
import { GUEST_ANONYMOUS_USER } from '../data/usersDatabase';
import { auth, fetchUserFromFirestore, saveUserToFirestore } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLoginSuccess: (userDoc: UserProfile) => void;
  onLogout: () => void;
}

type AuthMode = 'select' | 'login' | 'reg_customer' | 'reg_owner' | 'reg_provider';

const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'القادسية', 'بابل', 'واسط',
  'ذي قار', 'ميسان', 'المثنى', 'الأنبار', 'صلاح الدين', 'ديالى', 'كركوك', 'دهوك', 'السليمانية',
];

const SERVICE_CATEGORIES = [
  'تصوير وفيديو',
  'تزيين وكوشة',
  'فرقة وسنترال',
  'سيارات زفاف',
  'صالون ومكياج عرائس',
  'ضيافة وبوفيه',
];

function toEnglishDigits(value: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const eastern = '۰۱۲۳۴۵۶۷۸۹';
  return value
    .split('')
    .map((char) => {
      const a = arabic.indexOf(char);
      if (a >= 0) return String(a);
      const e = eastern.indexOf(char);
      if (e >= 0) return String(e);
      return char;
    })
    .join('');
}

function normalizeIraqiPhone(raw: string): string {
  let value = toEnglishDigits(raw).trim().replace(/[\s()-]/g, '');
  if (value.startsWith('00964')) value = `+964${value.slice(5)}`;
  if (/^07\d{9}$/.test(value)) return `+964${value.slice(1)}`;
  if (/^7\d{9}$/.test(value)) return `+964${value}`;
  if (/^\+9647\d{9}$/.test(value)) return value;
  throw new Error('أدخل رقم موبايل عراقي صحيح مثل 07701234567.');
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [mode, setMode] = useState<AuthMode>('select');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('بغداد');
  const [hallName, setHallName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('تصوير وفيديو');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  if (!isOpen) return null;

  const resetForm = () => {
    setOtpSent(false);
    setOtpCode('');
    setErrorMessage('');
    setSuccessMsg('');
    confirmationRef.current = null;
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  const selectMode = (nextMode: AuthMode) => {
    resetForm();
    setMode(nextMode);
  };

  const handleEnterAsGuest = () => {
    // Guest browsing is intentionally local-only; a real Firebase identity is created only after OTP.
    onLoginSuccess(GUEST_ANONYMOUS_USER);
    onClose();
  };

  const buildRecaptcha = () => {
    recaptchaRef.current?.clear();
    const verifier = new RecaptchaVerifier(auth, 'wednak-recaptcha-container', {
      size: 'invisible',
      callback: () => undefined,
      'expired-callback': () => setErrorMessage('انتهت صلاحية التحقق الأمني. حاول إرسال الرمز مرة أخرى.'),
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const normalizedPhone = normalizeIraqiPhone(phone);
      const verifier = buildRecaptcha();
      confirmationRef.current = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
      setPhone(normalizedPhone);
      setOtpSent(true);
      setSuccessMsg(`تم إرسال رمز التحقق إلى ${normalizedPhone}`);
    } catch (error) {
      console.error('Firebase phone OTP send failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إرسال رمز التحقق. حاول مرة أخرى.');
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) {
      setErrorMessage('أرسل رمز التحقق أولاً.');
      return;
    }
    if (!/^\d{6}$/.test(toEnglishDigits(otpCode))) {
      setErrorMessage('رمز التحقق يجب أن يتكون من 6 أرقام.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const credential = await confirmationRef.current.confirm(toEnglishDigits(otpCode));
      const uid = credential.user.uid;
      const existingUser = await fetchUserFromFirestore(uid);

      if (existingUser) {
        setSuccessMsg(`أهلاً بك مجدداً ${existingUser.name}`);
        onLoginSuccess(existingUser);
        onClose();
        return;
      }

      if (mode === 'login') {
        await signOut(auth);
        setErrorMessage('رقم الهاتف موثّق لكنه لا يملك ملف Wedنك. اختر نوع الحساب لإنشاء الملف.');
        setOtpSent(false);
        confirmationRef.current = null;
        return;
      }

      let accountType: AccountType = 'زبون';
      if (mode === 'reg_owner') accountType = 'صاحب قاعة';
      else if (mode === 'reg_provider') accountType = 'مزود خدمة';

      const displayName = name.trim() || (mode === 'reg_owner' ? hallName.trim() : 'مستخدم ويدنك');
      if (!displayName) throw new Error('يرجى إدخال الاسم.');

      const newUser: UserProfile = {
        id: uid,
        name: displayName,
        phone,
        email: '',
        city,
        accountType,
        hallName: mode === 'reg_owner' ? hallName.trim() : undefined,
        serviceCategory: mode === 'reg_provider' ? serviceCategory : undefined,
        isGuest: false,
        isGuestConverted: false,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await saveUserToFirestore(newUser);
      onLoginSuccess(saved);
      setSuccessMsg('تم إنشاء الحساب بنجاح.');
      onClose();
    } catch (error) {
      console.error('Firebase OTP verification failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'تعذر التحقق من الرمز.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto dir-rtl" id="auth-modal-overlay">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 my-auto">
        <div id="wednak-recaptcha-container" />

        <div className="p-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">الدخول إلى Wedنك</h2>
              <p className="text-[11px] text-amber-200">تصفح كضيف أو سجل برقم هاتفك الحقيقي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-gray-500 block">الحساب الحالي</span>
              <span className="font-bold text-emerald-900">{currentUser.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full mr-2 font-black bg-amber-100 text-amber-800">
                {currentUser.isGuest ? 'ضيف' : currentUser.accountType}
              </span>
            </div>
            {!currentUser.isGuest && (
              <button
                onClick={() => {
                  onLogout();
                  selectMode('select');
                }}
                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {errorMessage}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" /> {successMsg}
            </div>
          )}

          {mode === 'select' ? (
            <div className="space-y-3">
              <button onClick={handleEnterAsGuest} className="w-full p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-right flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-amber-700" />
                  <div><div className="font-bold text-xs">الدخول كضيف</div><div className="text-[10px] text-amber-800">تصفح بدون تسجيل، والتوثيق مطلوب عند الحجز أو الحفظ</div></div>
                </div>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>

              <button onClick={() => selectMode('reg_customer')} className="w-full p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-right flex items-center gap-3">
                <User className="w-5 h-5 text-emerald-700" /><div><div className="font-bold text-xs">التسجيل كزبون</div><div className="text-[10px] text-emerald-800">للحجز والمفضلة ومتابعة الطلبات</div></div>
              </button>

              <button onClick={() => selectMode('reg_owner')} className="w-full p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-right flex items-center gap-3">
                <Building2 className="w-5 h-5 text-purple-700" /><div><div className="font-bold text-xs">التسجيل كصاحب قاعة</div><div className="text-[10px] text-purple-800">لإدارة القاعة والحجوزات والمحتوى</div></div>
              </button>

              <button onClick={() => selectMode('reg_provider')} className="w-full p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-right flex items-center gap-3">
                <Camera className="w-5 h-5 text-blue-700" /><div><div className="font-bold text-xs">التسجيل كمزود خدمة</div><div className="text-[10px] text-blue-800">لإدارة الخدمة والحجوزات والعروض</div></div>
              </button>

              <button onClick={() => selectMode('login')} className="mx-auto text-xs font-bold text-emerald-800 underline flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> لدي حساب سابق
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <button onClick={() => selectMode('select')} className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  <ArrowRight className="w-4 h-4" /> الرجوع
                </button>
                <span className="text-xs font-bold text-emerald-900">
                  {mode === 'login' ? 'تسجيل الدخول' : mode === 'reg_customer' ? 'حساب زبون' : mode === 'reg_owner' ? 'حساب صاحب قاعة' : 'حساب مزود خدمة'}
                </span>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  {mode !== 'login' && (
                    <div>
                      <label className="text-xs font-bold block mb-1">الاسم</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs" required />
                    </div>
                  )}

                  {mode === 'reg_owner' && (
                    <div>
                      <label className="text-xs font-bold block mb-1">اسم القاعة</label>
                      <input value={hallName} onChange={(e) => setHallName(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs" required />
                    </div>
                  )}

                  {mode === 'reg_provider' && (
                    <div>
                      <label className="text-xs font-bold block mb-1">نوع الخدمة</label>
                      <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs">
                        {SERVICE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold block mb-1">رقم الهاتف العراقي</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07701234567" className="w-full pr-9 pl-3 py-2 rounded-xl border text-xs dir-ltr text-left" required />
                    </div>
                  </div>

                  {mode !== 'login' && (
                    <div>
                      <label className="text-xs font-bold block mb-1">المحافظة</label>
                      <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-xs">
                        {IRAQI_GOVERNORATES.map((governorate) => <option key={governorate}>{governorate}</option>)}
                      </select>
                    </div>
                  )}

                  <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl disabled:opacity-50">
                    {isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndProceed} className="space-y-3">
                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
                    أدخل الرمز الحقيقي الذي وصلك برسالة SMS إلى {phone}.
                  </div>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="w-full px-3 py-2.5 rounded-xl border text-center text-lg font-mono font-bold tracking-widest"
                    required
                  />
                  <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl disabled:opacity-50">
                    {isLoading ? 'جاري التحقق...' : 'تأكيد الرمز'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); confirmationRef.current = null; }} className="w-full text-xs font-bold text-gray-500 underline">
                    تغيير الرقم أو إعادة الإرسال
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 text-[11px] text-gray-500 text-center">
          التحقق يتم عبر Firebase Phone Authentication. لا يوجد رمز تجريبي ثابت.
        </div>
      </div>
    </div>
  );
};
