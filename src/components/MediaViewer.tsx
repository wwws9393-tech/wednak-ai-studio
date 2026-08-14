import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react';

interface MediaViewerProps {
  url: string; type: 'image' | 'video'; title?: string; description?: string; onClose: () => void;
  onDelete?: () => void; onPrevious?: () => void; onNext?: () => void;
  onSaveDescription?: (value: string) => Promise<void> | void;
  authorName?: string; authorAvatar?: string; authorRole?: string; onOpenAuthor?: () => void;
  position?: number; total?: number;
}
type Point = { x: number; y: number };
const touchDistance = (first: React.Touch, second: React.Touch) => Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);

export const MediaViewer: React.FC<MediaViewerProps> = ({ url, type, title, description, onClose, onDelete, onPrevious, onNext, onSaveDescription, authorName, authorAvatar, authorRole, onOpenAuthor, position, total }) => {
  const [text, setText] = useState(description || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const gesture = useRef<{ start?: Point; offset?: Point; distance?: number; scale?: number }>({});

  const resetZoom = () => { setScale(1); setOffset({ x: 0, y: 0 }); gesture.current = {}; };
  useEffect(() => { setText(description || ''); setEditing(false); resetZoom(); }, [url, description]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); else if (event.key === 'ArrowRight') onPrevious?.(); else if (event.key === 'ArrowLeft') onNext?.(); };
    window.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', keyboard); };
  }, [onClose, onPrevious, onNext]);

  const touchStart = (event: React.TouchEvent) => {
    if (type === 'image' && event.touches.length === 2) { gesture.current = { distance: touchDistance(event.touches[0], event.touches[1]), scale }; return; }
    const touch = event.touches[0];
    gesture.current = { start: { x: touch.clientX, y: touch.clientY }, offset: { ...offset } };
  };
  const touchMove = (event: React.TouchEvent) => {
    if (type !== 'image') return;
    if (event.touches.length === 2 && gesture.current.distance) {
      event.preventDefault();
      const next = Math.min(4, Math.max(1, (gesture.current.scale || 1) * touchDistance(event.touches[0], event.touches[1]) / gesture.current.distance));
      setScale(next); if (next === 1) setOffset({ x: 0, y: 0 }); return;
    }
    if (event.touches.length === 1 && scale > 1 && gesture.current.start && gesture.current.offset) {
      event.preventDefault(); const touch = event.touches[0];
      setOffset({ x: gesture.current.offset.x + touch.clientX - gesture.current.start.x, y: gesture.current.offset.y + touch.clientY - gesture.current.start.y });
    }
  };
  const touchEnd = (event: React.TouchEvent) => {
    if (scale > 1 || !gesture.current.start || !event.changedTouches[0]) { gesture.current = {}; return; }
    const delta = event.changedTouches[0].clientX - gesture.current.start.x; gesture.current = {};
    if (Math.abs(delta) >= 45) delta > 0 ? onPrevious?.() : onNext?.();
  };

  return <div className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-0 sm:p-3" dir="rtl" role="dialog" aria-modal="true" aria-label={title || 'عارض الأعمال'}>
    <div className="relative max-w-5xl w-full h-full sm:h-auto sm:max-h-[96vh] flex flex-col bg-black sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <div className="min-h-16 px-3 sm:px-4 flex items-center gap-3 border-b border-white/10 bg-black/90">
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition" aria-label="إغلاق"><X className="h-5 w-5"/></button>
        {authorName && <button type="button" onClick={onOpenAuthor} disabled={!onOpenAuthor} className="min-w-0 flex flex-1 items-center gap-2.5 text-right group"><img src={authorAvatar} alt={authorName} className="h-10 w-10 rounded-full object-cover border-2 border-emerald-500 bg-white"/><span className="min-w-0"><b className="block truncate text-sm text-white group-hover:text-emerald-300 transition">{authorName}</b><small className="block text-[10px] text-white/60">{authorRole} · اضغط لزيارة الصفحة</small></span></button>}
        {type === 'image' && scale > 1 && <button type="button" onClick={resetZoom} className="p-2 rounded-full bg-white/10 text-white" aria-label="إعادة حجم الصورة"><RotateCcw className="w-4 h-4"/></button>}
        {position && total && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/80" dir="ltr">{position}/{total}</span>}
        {onDelete && <button onClick={() => { if (confirm('هل تؤكد حذف هذا العمل نهائياً؟')) onDelete(); }} className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold flex gap-1"><Trash2 className="w-4 h-4"/>حذف</button>}
      </div>
      <div className={`relative bg-black flex-1 min-h-0 flex items-center justify-center overflow-hidden ${type === 'image' ? 'wednak-image-zoom-surface' : ''}`} onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd}>
        {onPrevious && scale === 1 && <button onClick={onPrevious} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/55 hover:bg-emerald-700 text-white rounded-full border border-white/15 transition" aria-label="العمل السابق"><ChevronRight/></button>}
        {type === 'video'
          ? <video key={url} src={url} controls autoPlay playsInline className="w-full h-full max-h-[72vh] object-contain"/>
          : <img src={url} alt={title || 'عمل'} draggable={false} className="w-full h-full max-h-[72vh] object-contain select-none will-change-transform" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}/>
        }
        {onNext && scale === 1 && <button onClick={onNext} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/55 hover:bg-emerald-700 text-white rounded-full border border-white/15 transition" aria-label="العمل التالي"><ChevronLeft/></button>}
      </div>
      {(title || description || onSaveDescription) && <div className="bg-white p-4"><div className="flex justify-between gap-3"><b>{title}</b>{onSaveDescription && !editing && <button onClick={() => setEditing(true)} className="px-3 py-2 bg-gray-100 text-emerald-800 rounded-xl text-xs font-bold"><Pencil className="w-3.5 h-3.5 inline"/> تعديل</button>}</div>{onSaveDescription && editing ? <div className="mt-2 flex gap-2"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="أضف وصفاً للعمل" className="flex-1 border rounded-xl p-2 text-xs"/><button disabled={saving} onClick={async () => { setSaving(true); try { await onSaveDescription(text); setEditing(false); } finally { setSaving(false); } }} className="px-4 bg-emerald-700 text-white rounded-xl text-xs font-bold"><Save className="w-4 h-4 inline"/> {saving ? 'جاري الحفظ' : 'حفظ'}</button></div> : <p className="text-xs text-gray-600 mt-2">{text || 'لا يوجد وصف لهذا العمل.'}</p>}</div>}
    </div>
  </div>;
};
