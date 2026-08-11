import React from 'react';
import { X, Lock, FileText, HelpCircle, Mail, Phone, ShieldCheck } from 'lucide-react';

interface LegalSupportModalsProps {
  activeModal: 'privacy' | 'terms' | 'support' | null;
  onClose: () => void;
}

export const LegalSupportModals: React.FC<LegalSupportModalsProps> = ({
  activeModal,
  onClose,
}) => {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="legal-modal-overlay">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 flex flex-col justify-between my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            {activeModal === 'privacy' && <Lock className="w-5 h-5 text-amber-300" />}
            {activeModal === 'terms' && <FileText className="w-5 h-5 text-amber-300" />}
            {activeModal === 'support' && <HelpCircle className="w-5 h-5 text-amber-300" />}
            <h2 className="text-base font-bold">
              {activeModal === 'privacy' && 'سياسة الخصوصية وحماية البيانات'}
              {activeModal === 'terms' && 'شروط الاستخدام وأحكام الحجز'}
              {activeModal === 'support' && 'الدعم الفني والخدمة المباشرة'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            id="close-legal-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 text-xs text-gray-700 space-y-4 leading-relaxed">
          
          {activeModal === 'privacy' && (
            <>
              <p className="font-bold text-gray-900">
                أهلاً بكم في تطبيق **Wedنك** (ويدنك)، المنصة العراقية الرائدة لحجوزات القاعات والزفاف.
              </p>
              <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-emerald-800">1. جمع البيانات:</h3>
                <p>نقوم بجمع بياناتك الأساسية (الاسم، رقم الهاتف، والمدينة) لتسهيل عمليات الحجز والربط مع أصحاب القاعات ومزودي الخدمات.</p>
              </div>
              <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-emerald-800">2. الأمان والتشفير:</h3>
                <p>بياناتك الشخصية ومواعيد حجزك مشفرة ولا يتم مشاركتها إلا مع القاعة أو الخدمة التي قمت بحجزها للتحقق من الموعد.</p>
              </div>
            </>
          )}

          {activeModal === 'terms' && (
            <>
              <p className="font-bold text-gray-900">
                شروط وأحكام الحجز عبر تطبيق **Wedنك**:
              </p>
              <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-emerald-800">1. تأكيد الحجز بالعربون:</h3>
                <p>يعتبر طلب الحجز مؤكداً رسمياً فور سداد مبلغ العربون المحدد لكل قاعة أو خدمة.</p>
              </div>
              <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-emerald-800">2. سياسة الإلغاء:</h3>
                <p>يمكنك تقديم طلب إلغاء الحجز عبر التطبيق قبل موعد المناسبة بـ 14 يوماً لاسترداد العربون وفق الشروط.</p>
              </div>
            </>
          )}

          {activeModal === 'support' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900">طاقم الدعم الفني متواجد لخدمتكم 24/7</h3>
                <p className="text-gray-500 mt-1">نحن هنا لمساعدتكم في أي استفسار أو مشكلة تقنية أو حجز خاص.</p>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-right space-y-2">
                <div className="flex items-center justify-between text-amber-900">
                  <span className="font-bold">البريد الإلكتروني المباشر:</span>
                  <a href="mailto:WWWS.9393@gmail.com" className="font-extrabold underline dir-ltr">
                    WWWS.9393@gmail.com
                  </a>
                </div>
                <div className="flex items-center justify-between text-amber-900 pt-2 border-t border-amber-200">
                  <span className="font-bold">هاتف الدعم الفني:</span>
                  <span className="font-extrabold dir-ltr">07701234567</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-3xl text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
