import React, { useState } from 'react';
import { ShieldAlert, Send, Clock, CheckCircle2, AlertCircle, FileText, User, Phone, Sparkles } from 'lucide-react';
import { Complaint, UserProfile, AccountType } from '../types';

interface ComplaintsViewProps {
  complaints: Complaint[];
  currentUser: UserProfile;
  onSubmitComplaint: (complaintData: {
    subject: string;
    relatedItemName?: string;
    description: string;
    userPhone: string;
  }) => void;
  isAdmin: boolean;
  onUpdateComplaintStatus?: (complaintId: string, status: Complaint['status'], adminReply?: string) => void;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  complaints,
  currentUser,
  onSubmitComplaint,
  isAdmin,
  onUpdateComplaintStatus,
}) => {
  const [subject, setSubject] = useState('');
  const [relatedItemName, setRelatedItemName] = useState('');
  const [description, setDescription] = useState('');
  const [userPhone, setUserPhone] = useState(currentUser.phone || '07700000000');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const userComplaints = isAdmin ? complaints : complaints.filter((c) => c.userId === currentUser.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    onSubmitComplaint({
      subject,
      relatedItemName,
      description,
      userPhone,
    });

    setSubject('');
    setRelatedItemName('');
    setDescription('');
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="complaints-view-container">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-900 p-6 rounded-3xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-400/30 mb-2 inline-block">
            {isAdmin ? 'لوحة المتابعة الإدارية' : 'مركز الشكاوى والبلاغات المباشرة'}
          </span>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            {isAdmin ? 'إدارة الشكاوى والاعتراضات الواردة' : 'تقديم شكوى أو بلاغ عن قاعة/مزود خدمة'}
          </h1>
          <p className="text-xs text-amber-100/90 mt-1">
            {isAdmin 
              ? 'مراجعة كافة شكاوى الزبناء، أصحاب القاعات، ومزودي الخدمات والرد عليها.'
              : 'نحرص على حقوقك! يمكنك تقديم بلاغ مباشر لإدارة Wedنك وسيقوم طاقم الدعم بالمعالجة فوراُ.'
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Submit Form (Hidden in pure Admin Mode unless requested) */}
        {!isAdmin && (
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-amber-100 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Send className="w-4 h-4 text-emerald-700" />
              نموذج إرسال الشكوى
            </h2>

            {submittedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم إرسال بلاغك بنجاح للادارة المباشرة. سيتم التواصل معك عبر الهاتف!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">موضوع الشكوى / البلاغ:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: عدم مطابقة مواصفات القاعة، تأخير المصور..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                  required
                  id="complaint-subject-input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">اسم القاعة / مزود الخدمة المعني (اختياري):</label>
                <input
                  type="text"
                  value={relatedItemName}
                  onChange={(e) => setRelatedItemName(e.target.value)}
                  placeholder="اسم القاعة أو الاستوديو..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                  id="complaint-item-name-input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">رقم الهاتف للمتابعة:</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 dir-ltr text-left focus:ring-2 focus:ring-emerald-600 outline-none"
                  required
                  id="complaint-phone-input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">تفاصيل الشكوى بالكامل:</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب بالتفصيل ما حدث معك..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 h-28 resize-none focus:ring-2 focus:ring-emerald-600 outline-none"
                  required
                  id="complaint-description-textarea"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                id="submit-complaint-btn"
              >
                <Send className="w-4 h-4" />
                <span>إرسال الشكوى للإدارة</span>
              </button>
            </form>
          </div>
        )}

        {/* Complaints History / Admin Inbox */}
        <div className={`${isAdmin ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
          <h2 className="text-base font-bold text-gray-900 flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              {isAdmin ? 'سجل الشكاوى الإداري العام' : 'سجل الشكاوى الخاصة بك'}
            </span>
            <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {userComplaints.length} بلاغ
            </span>
          </h2>

          {userComplaints.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-8 text-center text-gray-500 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold">لا توجد شكاوى مسجلة حالياً.</p>
              <p>نشكر تعاونك وحرصك على تحسين جودة الخدمات في العراق.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userComplaints.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">{c.subject}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      c.status === 'تمت المعالجة' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {c.relatedItemName && (
                    <span className="text-[11px] text-gray-500 block">
                      الجهة المعنية: <strong className="text-gray-800">{c.relatedItemName}</strong>
                    </span>
                  )}

                  <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
                    {c.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                    <span>مقدم البلاغ: {c.userName} ({c.userPhone})</span>
                    <span>التاريخ: {c.createdAt}</span>
                  </div>

                  {/* Admin Action for resolving */}
                  {isAdmin && onUpdateComplaintStatus && (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      {c.status !== 'تمت المعالجة' && (
                        <button
                          onClick={() => onUpdateComplaintStatus(c.id, 'تمت المعالجة', 'تم التواصل وحل الإشكال مع الطرفين.')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                        >
                          تعيين كـ "تمت المعالجة"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
