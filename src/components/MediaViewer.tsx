import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';

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
  const gesture = useRef<{ start?: Point; offset?: Point; distance?: number; scale?: number; pinching?: boolean }>({});

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
    if (type === 'image' && event.touches.length === 2) { gesture.current = { distance: touchDistance(event.touches[0], event.touches[1]), scale, pinching: true }; return; }
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
    if (gesture.current.pinching || scale > 1) { resetZoom(); return; }
    if (!gesture.current.start || !event.changedTouches[0]) { gesture.current = {}; return; }
    const delta = event.changedTouches[0].clientX - gesture.current.start.x; gesture.current = {};
    if (Math.abs(delta) >= 45) delta > 0 ? onPrevious?.() : onNext?.();
  };

  return <div className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-0 sm:p-3" dir="rtl" role="dialog" aria-modal="true" aria-label={title || 'عارض الأعمال'}>
    <div className="relative max-w-5xl w-full h-full sm:h-auto sm:max-h-[96vh] flex flex-col bg-black sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <div className="min-h-16 px-3 sm:px-4 flex items-center gap-3 border-b border-white/10 bg-black/90">
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition" aria-label="إغلاق"><X className="h-5 w-5"/></button>
        {authorName && <button type="button" onClick={onOpenAuthor} disabled={!onOpenAuthor} className="min-w-0 flex flex-1 items-center gap-2.5 text-right group"><img src={authorAvatar} alt={authorName} className="h-10 w-10 rounded-full object-cover border-2 border-emerald-500 bg-white"/><span className="min-w-0"><b className="block truncate text-sm text-white group-hover:text-emerald-300 transition">{authorName}</b><small className="block text-[10px] text-white/60">{authorRole} · اضغط لزيارة الصفحة</small></span></button>}
        {position && total && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/80" dir="ltr">{position}/{total}</span>}
        {onDelete && <button onClick={() => { if (confirm('هل تؤكد حذف هذا العمل نهائياً؟')) onDelete(); }} className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold flex gap-1"><Trash2 className="w-4 h-4"/>حذف</button>}
      </div>
      <div className={`relative bg-black flex-1 min-h-0 flex items-center justify-center overflow-hidden ${type === 'image' ? 'wednak-image-zoom-surface' : ''}`} onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd}>
        {onPrevious && scale === 1 && <button onClick={onPrevious} className="absolute right-0 top-1/4 bottom-1/4 z-10 w-14 bg-transparent opacity-0" aria-label="العمل السابق" />}
        {type === 'video'
          ? <video key={url} src={url} controls autoPlay playsInline className="w-full h-full max-h-[72vh] object-contain"/>
          : <img src={url} alt={title || 'عمل'} draggable={false} className={`w-full h-full max-h-[72vh] object-contain select-none will-change-transform ${scale === 1 ? 'transition-transform duration-200 ease-out' : ''}`} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}/>
        }
        {onNext && scale === 1 && <button onClick={onNext} className="absolute left-0 top-1/4 bottom-1/4 z-10 w-14 bg-transparent opacity-0" aria-label="العمل التالي" />}
        {(title || text || onSaveDescription) && !editing && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 text-right text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0"><b className="block text-sm font-black leading-6 text-white drop-shadow-md">{title}</b>{text && <p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold leading-6 text-white/95 [text-shadow:0_2px_6px_rgba(0,0,0,.9)]">{text}</p>}</div>
            {onSaveDescription && <button onClick={() => setEditing(true)} className="pointer-events-auto shrink-0 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm"><Pencil className="inline h-3.5 w-3.5"/> {text ? 'تعديل' : 'إضافة وصف'}</button>}
          </div>
        </div>}
        {onSaveDescription && editing && <div className="absolute inset-x-3 bottom-3 z-30 flex gap-2 rounded-2xl bg-black/80 p-3 backdrop-blur-md"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="أضف وصفاً للعمل" className="min-h-20 flex-1 resize-none rounded-xl border border-white/20 bg-white/10 p-2 text-xs text-white outline-none placeholder:text-white/50"/><button disabled={saving} onClick={async () => { setSaving(true); try { await onSaveDescription(text); setEditing(false); } finally { setSaving(false); } }} className="self-stretch rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-50"><Save className="inline h-4 w-4"/> {saving ? 'جاري الحفظ' : 'حفظ'}</button></div>}
      </div>
    </div>
  </div>;
};
