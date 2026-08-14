import React, { useEffect, useState } from 'react';
import { CalendarDays, Edit3, Save, Tag, Trash2, X } from 'lucide-react';
import { BusinessOffer } from '../types';
import { createBusinessOffer, deleteBusinessOffer, updateBusinessOffer } from '../lib/business';

interface BusinessOffersPanelProps {
  ownerId: string;
  ownerType: 'صاحب قاعة' | 'مزود خدمة';
  targetId?: string;
  originalPrice: number;
  offers: BusinessOffer[];
  onMessage: (value: string) => void;
  onError: (value: string) => void;
}

const emptyDraft = { title: '', description: '', offerPrice: 0, startDate: '', endDate: '' };
const inputClass = 'w-full min-h-12 px-3 py-2.5 rounded-2xl border border-emerald-800/20 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-300/15';

export const BusinessOffersPanel: React.FC<BusinessOffersPanelProps> = ({ ownerId, ownerType, targetId, originalPrice, offers, onMessage, onError }) => {
  const [mode, setMode] = useState<'create' | 'manage' | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<BusinessOffer | null>(null);
  const [saving, setSaving] = useState(false);
  const ownedOffers = offers.filter((offer) => offer.ownerId === ownerId && (!targetId || offer.targetId === targetId));

  useEffect(() => {
    if (!mode) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMode(null); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [mode]);

  const createOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetId) return onError(ownerType === 'صاحب قاعة' ? 'احفظ صفحة القاعة أولاً قبل إنشاء العرض.' : 'احفظ صفحة الخدمة أولاً قبل إنشاء العرض.');
    setSaving(true); onError('');
    try {
      await createBusinessOffer({ ownerType, targetId, originalPrice, ...draft });
      setDraft(emptyDraft); setMode(null); onMessage('تم إنشاء العرض ونشره في Explore بنجاح.');
    } catch (error) { onError(error instanceof Error ? error.message : 'تعذر إنشاء العرض.'); }
    finally { setSaving(false); }
  };

  const saveOffer = async () => {
    if (!editing) return;
    setSaving(true); onError('');
    try { await updateBusinessOffer(editing); setEditing(null); onMessage('تم حفظ تعديلات العرض.'); }
    catch (error) { onError(error instanceof Error ? error.message : 'تعذر حفظ العرض.'); }
    finally { setSaving(false); }
  };

  const removeOffer = async (offer: BusinessOffer) => {
    if (!window.confirm('هل تريد حذف هذا العرض نهائياً؟')) return;
    setSaving(true); onError('');
    try { await deleteBusinessOffer(offer); if (editing?.id === offer.id) setEditing(null); onMessage('تم حذف العرض.'); }
    catch (error) { onError(error instanceof Error ? error.message : 'تعذر حذف العرض.'); }
    finally { setSaving(false); }
  };

  return <>
    <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-5 rounded-3xl border border-amber-300/30 shadow-lg">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('create')} className="min-h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-600 border border-amber-300/30 text-amber-300 font-black text-sm flex items-center justify-center gap-2 transition"><Tag className="w-5 h-5"/>إنشاء عرض</button>
        <button type="button" onClick={() => setMode('manage')} className="min-h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-600 border border-amber-300/30 text-amber-300 font-black text-sm flex items-center justify-center gap-2 transition"><Edit3 className="w-5 h-5"/>إدارة العروض</button>
      </div>
    </section>

    {mode && <div className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-sm grid place-items-center p-3" onClick={() => setMode(null)}>
      <div className="w-full max-w-xl max-h-[90dvh] overflow-hidden rounded-3xl bg-white border border-amber-300/40 shadow-2xl flex flex-col" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header className="shrink-0 bg-gradient-to-l from-emerald-950 to-emerald-800 px-5 py-4 text-white flex items-center justify-between">
          <div><h2 className="font-black text-lg text-amber-200">{mode === 'create' ? 'إنشاء عرض جديد' : 'إدارة العروض'}</h2><p className="text-[10px] text-emerald-100 mt-1">العروض المنشورة تظهر تلقائياً في Explore</p></div>
          <button type="button" onClick={() => setMode(null)} className="w-10 h-10 rounded-full bg-white/10 grid place-items-center"><X className="w-5 h-5"/></button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
          {mode === 'create' ? <form onSubmit={createOffer} className="space-y-3">
            <label className="block text-xs font-black text-emerald-950">عنوان العرض<input value={draft.title} onChange={(e) => setDraft((value) => ({ ...value, title: e.target.value }))} className={`${inputClass} mt-1`} required/></label>
            <label className="block text-xs font-black text-emerald-950">تفاصيل العرض<textarea value={draft.description} onChange={(e) => setDraft((value) => ({ ...value, description: e.target.value }))} className={`${inputClass} mt-1 min-h-28 resize-none`}/></label>
            <label className="block text-xs font-black text-emerald-950">سعر العرض (د.ع)<input type="number" min="0" value={draft.offerPrice || ''} onChange={(e) => setDraft((value) => ({ ...value, offerPrice: Number(e.target.value) }))} className={`${inputClass} mt-1`} required/></label>
            <div className="grid sm:grid-cols-2 gap-3"><label className="block text-xs font-black text-emerald-950">بداية العرض<input type="date" value={draft.startDate} onChange={(e) => setDraft((value) => ({ ...value, startDate: e.target.value }))} className={`${inputClass} mt-1`} required/></label><label className="block text-xs font-black text-emerald-950">نهاية العرض<input type="date" value={draft.endDate} onChange={(e) => setDraft((value) => ({ ...value, endDate: e.target.value }))} className={`${inputClass} mt-1`} required/></label></div>
            <button disabled={saving} className="w-full min-h-12 rounded-2xl bg-emerald-800 disabled:bg-gray-400 text-amber-200 font-black flex items-center justify-center gap-2"><Save className="w-4 h-4"/>{saving ? 'جاري الحفظ...' : 'حفظ ونشر العرض'}</button>
          </form> : <div className="space-y-3">
            {ownedOffers.length === 0 ? <div className="py-12 text-center text-sm text-gray-500"><CalendarDays className="w-10 h-10 mx-auto text-emerald-700 mb-2"/>لا توجد عروض سابقة.</div> : ownedOffers.map((offer) => {
              const current = editing?.id === offer.id ? editing : offer;
              return <article key={offer.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                {editing?.id === offer.id ? <>
                  <input value={current.title} onChange={(e) => setEditing({ ...current, title: e.target.value })} className={inputClass}/>
                  <textarea value={current.description} onChange={(e) => setEditing({ ...current, description: e.target.value })} className={`${inputClass} min-h-24 resize-none`}/>
                  <input type="number" min="0" value={current.offerPrice || ''} onChange={(e) => setEditing({ ...current, offerPrice: Number(e.target.value) })} className={inputClass}/>
                  <div className="grid grid-cols-2 gap-2"><input type="date" value={current.startDate} onChange={(e) => setEditing({ ...current, startDate: e.target.value })} className={inputClass}/><input type="date" value={current.endDate} onChange={(e) => setEditing({ ...current, endDate: e.target.value })} className={inputClass}/></div>
                </> : <><h3 className="font-black text-emerald-950">{offer.title}</h3><p className="text-xs text-gray-600">{offer.description || 'بدون تفاصيل إضافية'}</p><p className="text-xs font-bold text-amber-800">{Number(offer.offerPrice).toLocaleString('ar-IQ')} د.ع · {offer.startDate} — {offer.endDate}</p></>}
                <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => editing?.id === offer.id ? void saveOffer() : setEditing({ ...offer })} className="flex-1 min-h-10 rounded-xl bg-emerald-800 text-white text-xs font-bold">{editing?.id === offer.id ? 'حفظ التعديل' : 'تعديل'}</button><button type="button" disabled={saving} onClick={() => void removeOffer(offer)} className="min-w-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 grid place-items-center" aria-label="حذف العرض"><Trash2 className="w-4 h-4"/></button></div>
              </article>;
            })}
          </div>}
        </div>
      </div>
    </div>}
  </>;
};
