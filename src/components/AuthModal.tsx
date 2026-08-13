import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  User,
  Phone,
  Building2,
  Camera,
  LogOut,
  ArrowRight,
  Eye,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'الديوانية', 'بابل', 'واسط',
  'ذي قار', 'ميسان', 'المثنى', 'الأنبار', 'صلاح الدين', 'ديالى', 'كركوك', 'دهوك', 'السليمانية', 'حلبجة',
];

const SERVICE_CATEGORIES = [
  'تصوير وفيديو',
  'تزيين وكوشة',
  'فرقة وسنترال',
  'دي جي وموسيقى',
  'زهور وباقات عرائس',
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
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const disposeRecaptcha = () => {
    try { recaptchaRef.current?.clear(); } catch (error) { console.warn('reCAPTCHA clear skipped:', error); }
    recaptchaRef.current = null;
    recaptchaContainerRef.current?.remove();
    recaptchaContainerRef.current = null;
  };

  useEffect(() => () => disposeRecaptcha(), []);

  if (!isOpen) return null;

  const resetForm = () => {
    setOtpSent(false);
    setOtpCode('');
    setErrorMessage('');
    setSuccessMsg('');
    confirmationRef.current = null;
    disposeRecaptcha();
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
    disposeRecaptcha();
    const container = document.createElement('div');
    container.id = `wednak-recaptcha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    document.body.appendChild(container);
    recaptchaContainerRef.current = container;
    const verifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: () => undefined,
      'expired-callback': () => { disposeRecaptcha(); setErrorMessage('انتهت صلاحية التحقق الأمني. حاول إرسال الرمز مرة أخرى.'); },
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
      disposeRecaptcha();
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

  const modeTitle = mode === 'login' ? 'تسجيل الدخول' : mode === 'reg_customer' ? 'إنشاء حساب زبون' : mode === 'reg_owner' ? 'إنشاء حساب صاحب قاعة' : 'إنشاء حساب مزود خدمة';
  const modeSubtitle = mode === 'login' ? 'أدخل رقمك المسجل للعودة إلى حسابك' : 'خطوات قصيرة تفصلك عن عالم ويدنك';

  return (
    <div className="wednak-auth-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-5 dir-rtl" id="auth-modal-overlay">
      <div className="wednak-auth-shell relative my-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/50 bg-[#fbfaf5] shadow-2xl lg:grid-cols-[0.94fr_1.06fr]">
        <div id="wednak-recaptcha-container" />
        <button onClick={onClose} className="absolute left-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition hover:bg-black/35 lg:left-4 lg:top-4" aria-label="إغلاق">
          <X className="h-5 w-5" />
        </button>

        <aside className="wednak-auth-cinema relative hidden min-h-[690px] overflow-hidden p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="wednak-auth-glow wednak-auth-glow-one" />
          <div className="wednak-auth-glow wednak-auth-glow-two" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-amber-100 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> منصة الزفاف العراقية
            </span>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-sm text-center">
            <div className="wednak-auth-brand-card mx-auto mb-8 flex max-w-[320px] items-center justify-center gap-5 rounded-[2rem] border border-white/55 bg-white/90 px-7 py-6 text-right shadow-2xl backdrop-blur-xl" dir="ltr">
              <div className="wednak-logo-stage flex h-24 w-24 shrink-0 items-center justify-center" aria-hidden="true">
                <img src="/wednak-mark-green.svg" alt="" className="wednak-logo-3d h-20 w-20 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="wedding-wordmark wednak-auth-wordmark" aria-label="WEDDING">Wedding</span>
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">ويدنك</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500" dir="rtl">حجوزات القاعات والزفاف<br/>في العراق</p>
              </div>
            </div>
            <p className="mb-3 text-xs font-bold tracking-[.24em] text-amber-200">من هنا تبدأ الحكاية</p>
            <h1 className="text-4xl font-black leading-[1.35] text-white">كل تفاصيل فرحتك<br/><span className="text-amber-300">بمكان واحد</span></h1>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-7 text-emerald-50/75">اكتشف القاعات والخدمات، قارن الخيارات، واحجز لحظتك بهدوء وثقة.</p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
            {['حجز آمن', 'خيارات عراقية', 'تجربة ذكية'].map((label) => <span key={label} className="rounded-2xl border border-white/10 bg-white/8 px-2 py-3 text-[10px] font-bold text-white/75 backdrop-blur-sm">{label}</span>)}
          </div>
        </aside>

        <main className="wednak-auth-panel max-h-[96vh] overflow-y-auto bg-[linear-gradient(180deg,#fffefa_0%,#f7f5ed_100%)] px-5 pb-6 pt-5 sm:px-9 sm:pb-8 sm:pt-7 lg:max-h-[94vh]">
          {mode !== 'select' && (
            <div className="mb-3 flex justify-end" dir="ltr">
              <button
                type="button"
                onClick={() => selectMode('select')}
                className="wednak-auth-back group inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/85 px-3.5 py-2 text-xs font-black text-emerald-950 shadow-sm backdrop-blur-md"
                aria-label="الرجوع إلى خيارات الدخول"
              >
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>الرجوع</span>
              </button>
            </div>
          )}
          <div className="mb-5 flex items-center gap-3 border-b border-emerald-900/8 pb-5 lg:hidden" dir="ltr">
            <div className="wednak-logo-stage flex h-16 w-16 shrink-0 items-center justify-center" aria-hidden="true">
              <img src="/wednak-mark-green.svg" alt="" className="wednak-logo-3d h-14 w-14 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2"><span className="wedding-wordmark wednak-auth-wordmark-mobile">Wedding</span><span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] text-amber-700">ويدنك</span></div>
              <p className="mt-1 text-[10px] font-semibold text-slate-500" dir="rtl">حجوزات القاعات والزفاف في العراق</p>
            </div>
          </div>

          <header className="mb-5">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800"><ShieldCheck className="h-3.5 w-3.5"/> دخول آمن برقم الهاتف</span>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{mode === 'select' ? 'أهلاً بك في ويدنك' : modeTitle}</h2>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">{mode === 'select' ? 'اختر الطريقة المناسبة وابدأ رحلتك بكل هدوء.' : modeSubtitle}</p>
          </header>

          {!currentUser.isGuest && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs">
              <div><span className="block text-[9px] text-gray-500">الحساب الحالي</span><b className="text-emerald-950">{currentUser.name}</b><span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">{currentUser.accountType}</span></div>
              <button onClick={() => { onLogout(); selectMode('select'); }} className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 font-bold text-rose-700 shadow-sm"><LogOut className="h-3.5 w-3.5"/> خروج</button>
            </div>
          )}

          <div className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {errorMessage}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <Check className="w-4 h-4 shrink-0" /> {successMsg}
            </div>
          )}

          {mode === 'select' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button onClick={handleEnterAsGuest} className="wednak-auth-choice sm:col-span-2 flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-right">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100"><Eye className="w-5 h-5 text-amber-700" /></span>
                  <div><div className="font-bold text-xs">الدخول كضيف</div><div className="text-[10px] text-amber-800">تصفح بدون تسجيل، والتوثيق مطلوب عند الحجز أو الحفظ</div></div>
                </div>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>

              <button onClick={() => selectMode('reg_customer')} className="wednak-auth-choice flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-right">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100"><User className="w-5 h-5 text-emerald-700" /></span><div><div className="font-bold text-xs">التسجيل كزبون</div><div className="mt-1 text-[10px] leading-4 text-emerald-800">للحجز والمفضلة ومتابعة الطلبات</div></div>
              </button>

              <button onClick={() => selectMode('reg_owner')} className="wednak-auth-choice flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-4 text-right">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100"><Building2 className="w-5 h-5 text-slate-700" /></span><div><div className="font-bold text-xs">التسجيل كصاحب قاعة</div><div className="mt-1 text-[10px] leading-4 text-slate-600">لإدارة القاعة والحجوزات والمحتوى</div></div>
              </button>

              <button onClick={() => selectMode('reg_provider')} className="wednak-auth-choice flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-4 text-right">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100"><Camera className="w-5 h-5 text-slate-700" /></span><div><div className="font-bold text-xs">التسجيل كمزود خدمة</div><div className="mt-1 text-[10px] leading-4 text-slate-600">لإدارة الخدمة والحجوزات والعروض</div></div>
              </button>

              <button onClick={() => selectMode('login')} className="wednak-auth-primary sm:col-span-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-900/15">
                <KeyRound className="w-4 h-4" /> تسجيل الدخول إلى حساب سابق
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-end border-b border-gray-100 pb-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-900">{modeTitle}</span>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  {mode !== 'login' && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-700">الاسم</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className="wednak-auth-input w-full rounded-xl border px-3 py-3 text-xs" required />
                    </div>
                  )}

                  {mode === 'reg_owner' && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-700">اسم القاعة</label>
                      <input value={hallName} onChange={(e) => setHallName(e.target.value)} className="wednak-auth-input w-full rounded-xl border px-3 py-3 text-xs" required />
                    </div>
                  )}

                  {mode === 'reg_provider' && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-700">نوع الخدمة</label>
                      <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="wednak-auth-input w-full rounded-xl border px-3 py-3 text-xs">
                        {SERVICE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-slate-700">رقم الهاتف العراقي</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3.5 h-4 w-4 text-emerald-700" />
                      <input type="tel" inputMode="numeric" maxLength={11} value={phone} onChange={(e) => setPhone(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 11))} placeholder="07701234567" className="wednak-auth-input w-full rounded-xl border py-3 pl-3 pr-9 text-left text-xs dir-ltr" required />
                    </div>
                  </div>

                  {mode !== 'login' && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-700">المحافظة</label>
                      <select value={city} onChange={(e) => setCity(e.target.value)} className="wednak-auth-input w-full rounded-xl border px-3 py-3 text-xs">
                        {IRAQI_GOVERNORATES.map((governorate) => <option key={governorate}>{governorate}</option>)}
                      </select>
                    </div>
                  )}

                  <button type="submit" disabled={isLoading} className="wednak-auth-primary w-full rounded-xl bg-emerald-800 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-900/15 disabled:opacity-50">
                    {isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndProceed} className="space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                    أدخل الرمز الحقيقي الذي وصلك برسالة SMS إلى {phone}.
                  </div>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="wednak-auth-input w-full rounded-xl border px-3 py-3 text-center font-mono text-xl font-bold tracking-[.35em]"
                    required
                  />
                  <button type="submit" disabled={isLoading} className="wednak-auth-primary w-full rounded-xl bg-emerald-800 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-900/15 disabled:opacity-50">
                    {isLoading ? 'جاري التحقق...' : 'تأكيد الرمز'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); confirmationRef.current = null; }} className="w-full py-2 text-xs font-bold text-gray-500 underline underline-offset-4">
                    تغيير الرقم أو إعادة الإرسال
                  </button>
                </form>
              )}
            </div>
          )}
          </div>
          <footer className="mt-6 border-t border-slate-200/70 pt-4 text-center text-[10px] leading-5 text-slate-400">بمتابعتك أنت توافق على شروط الاستخدام وسياسة الخصوصية.<br/>التحقق محمي عبر Firebase Phone Authentication.</footer>
        </main>
      </div>
    </div>
  );
};
