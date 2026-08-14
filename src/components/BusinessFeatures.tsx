import React, { useMemo, useState } from 'react';
import { Check, Plus, Sparkles, X } from 'lucide-react';

export const HALL_FEATURE_OPTIONS = [
  'قاعة مكيفة بالكامل',
  'موقف سيارات',
  'كوشة وتجهيز مسرح',
  'نظام صوت وإضاءة',
  'مولد كهرباء احتياطي',
  'غرف تبديل للعروسين',
  'مدخل خاص للعروس',
  'خدمة ضيافة',
  'بوفيه وطاولات',
  'تصوير داخلي',
  'حديقة خارجية',
  'مصعد ومدخل لذوي الإعاقة',
  'حراسة وتنظيم',
  'قاعة نسائية منفصلة',
  'إنترنت Wi-Fi',
] as const;

export const PROVIDER_FEATURE_OPTIONS = [
  'خدمة داخل بغداد والمحافظات',
  'فريق عمل متكامل',
  'معدات احترافية',
  'تجهيز حسب الطلب',
  'باقات متعددة',
  'تعديل الموعد حسب التوفر',
  'استشارة قبل الحجز',
  'توصيل وتجهيز للموقع',
  'دعم يوم المناسبة',
  'صور وفيديو',
  'خدمة طوارئ',
  'عقد واتفاق واضح',
] as const;

const orderedFeatures = (value: string[], options: readonly string[]) => {
  const selected = new Set(value.map((item) => item.trim()).filter(Boolean));
  return [...options.filter((item) => selected.has(item)), ...value.filter((item) => item.trim() && !options.includes(item.trim()))];
};

interface FeatureSelectorProps {
  value?: string[];
  onChange: (features: string[]) => void;
  kind: 'hall' | 'provider';
}

export const FeatureSelector: React.FC<FeatureSelectorProps> = ({ value = [], onChange, kind }) => {
  const [customFeature, setCustomFeature] = useState('');
  const options: readonly string[] = kind === 'hall' ? HALL_FEATURE_OPTIONS : PROVIDER_FEATURE_OPTIONS;
  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (feature: string) => {
    const next = selected.has(feature) ? value.filter((item) => item !== feature) : [...value, feature];
    onChange(orderedFeatures(next, options));
  };

  const addCustom = () => {
    const clean = customFeature.trim();
    if (!clean || selected.has(clean)) return;
    onChange(orderedFeatures([...value, clean], options));
    setCustomFeature('');
  };

  return <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/70 p-4 shadow-sm" dir="rtl">
    <div className="mb-3 flex items-start gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-800 text-amber-300"><Sparkles className="h-4 w-4" /></span>
      <div><h3 className="text-sm font-black text-emerald-950">المميزات المشمولة</h3><p className="text-[10px] leading-5 text-gray-500">حدد كل ما يحصل عليه الزبون ضمن الحجز. تظهر المميزات بنفس هذا الترتيب في الصفحة العامة.</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
      {options.map((feature) => <button key={feature} type="button" onClick={() => toggle(feature)} aria-pressed={selected.has(feature)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold transition ${selected.has(feature) ? 'border-emerald-800 bg-emerald-800 text-white shadow-sm' : 'border-emerald-100 bg-white text-emerald-950 hover:border-emerald-400'}`}>
        {selected.has(feature) ? <Check className="h-3.5 w-3.5 text-amber-300" /> : <Plus className="h-3.5 w-3.5 text-emerald-600" />}{feature}
      </button>)}
    </div>
    <div className="mt-3 flex gap-2">
      <input value={customFeature} onChange={(event) => setCustomFeature(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} placeholder="إضافة ميزة أخرى" className="min-w-0 flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600" />
      <button type="button" onClick={addCustom} disabled={!customFeature.trim()} className="rounded-xl bg-amber-400 px-4 text-xs font-black text-emerald-950 disabled:opacity-45">إضافة</button>
    </div>
    {value.some((item) => !options.includes(item)) && <div className="mt-2 flex flex-wrap gap-1.5">{value.filter((item) => !options.includes(item)).map((feature) => <button key={feature} type="button" onClick={() => toggle(feature)} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-700"><X className="h-3 w-3" />{feature}</button>)}</div>}
  </section>;
};

export const FeaturesDisplay: React.FC<{ features?: string[]; title?: string }> = ({ features = [], title = 'المميزات المشمولة' }) => {
  const cleanFeatures = features.map((item) => item.trim()).filter(Boolean);
  if (cleanFeatures.length === 0) return null;
  return <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/45 to-amber-50/40 shadow-sm" dir="rtl">
    <header className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-950 px-4 py-3 text-white"><Sparkles className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-black">{title}</h3><span className="mr-auto rounded-full bg-white/10 px-2 py-1 text-[10px]">{cleanFeatures.length}</span></header>
    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
      {cleanFeatures.map((feature, index) => <div key={`${feature}-${index}`} className="flex min-h-12 items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 text-xs font-bold text-emerald-950 shadow-[0_5px_16px_rgba(6,95,70,0.04)]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Check className="h-3.5 w-3.5" /></span><span>{feature}</span></div>)}
    </div>
  </section>;
};
