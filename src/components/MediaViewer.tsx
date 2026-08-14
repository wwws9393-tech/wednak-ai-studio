import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';

interface MediaViewerProps {
  url: string; type: 'image' | 'video'; title?: string; description?: string; onClose: () => void;
  onDelete?: () => void; onPrevious?: () => void; onNext?: () => void;
  onSaveDescription?: (value: string) => Promise<void> | void;
  onSaveMetadata?: (value: { title: string; description: string }) => Promise<void> | void;
  authorName?: string; authorAvatar?: string; authorRole?: string; onOpenAuthor?: () => void;
  position?: number; total?: number;
}

type Point = { x: number; y: number };
type GestureState = { start?: Point; midpoint?: Point; offset?: Point; distance?: number; scale?: number; pinching?: boolean };
const touchDistance = (first: React.Touch, second: React.Touch) => Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
const touchMidpoint = (first: React.Touch, second: React.Touch): Point => ({ x: (first.clientX + second.clientX) / 2, y: (first.clientY + second.clientY) / 2 });

export const MediaViewer: React.FC<MediaViewerProps> = ({ url, type, title, description, onClose, onDelete, onPrevious, onNext, onSaveDescription, onSaveMetadata, authorName, authorAvatar, authorRole, onOpenAuthor, position, total }) => {
  const [titleText, setTitleText] = useState(title || '');
  const [descriptionText, setDescriptionText] = useState(description || '');
  const [titleDraft, setTitleDraft] = useState(title || '');
  const [descriptionDraft, setDescriptionDraft] = useState(description || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const gesture = useRef<GestureState>({});
  const scaleRef = useRef(1);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const canEdit = !!onSaveMetadata || !!onSaveDescription;
  const descriptionCanExpand = descriptionText.length > 95 || descriptionText.split('\n').length > 2;

  const resetZoom = () => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsZooming(false);
    gesture.current = {};
  };

  const applyZoom = (nextScale: number, nextOffset: Point) => {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  };

  useEffect(() => {
    setTitleText(title || '');
    setDescriptionText(description || '');
    setTitleDraft(title || '');
    setDescriptionDraft(description || '');
    setEditing(false);
    setExpanded(false);
    setSaveError('');
    resetZoom();
  }, [url, title, description]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') onPrevious?.();
      else if (event.key === 'ArrowLeft') onNext?.();
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keyboard);
    };
  }, [onClose, onPrevious, onNext]);

  const touchStart = (event: React.TouchEvent) => {
    if (type === 'image' && event.touches.length === 2) {
      const first = event.touches[0];
      const second = event.touches[1];
      gesture.current = { distance: touchDistance(first, second), midpoint: touchMidpoint(first, second), offset: { ...offsetRef.current }, scale: scaleRef.current, pinching: true };
      setIsZooming(true);
      return;
    }
    const touch = event.touches[0];
    gesture.current = { start: { x: touch.clientX, y: touch.clientY }, offset: { ...offsetRef.current }, scale: scaleRef.current, pinching: false };
    if (type === 'image' && scaleRef.current > 1) setIsZooming(true);
  };

  const touchMove = (event: React.TouchEvent) => {
    if (type !== 'image') return;
    if (event.touches.length === 2 && gesture.current.distance && gesture.current.midpoint) {
      event.preventDefault();
      const first = event.touches[0];
      const second = event.touches[1];
      const midpoint = touchMidpoint(first, second);
      const nextScale = Math.min(4, Math.max(1, (gesture.current.scale || 1) * touchDistance(first, second) / gesture.current.distance));
      const baseOffset = gesture.current.offset || { x: 0, y: 0 };
      applyZoom(nextScale, { x: baseOffset.x + midpoint.x - gesture.current.midpoint.x, y: baseOffset.y + midpoint.y - gesture.current.midpoint.y });
      return;
    }
    if (event.touches.length === 1 && scaleRef.current > 1 && gesture.current.start) {
      event.preventDefault();
      const touch = event.touches[0];
      const baseOffset = gesture.current.offset || offsetRef.current;
      applyZoom(scaleRef.current, {
        x: baseOffset.x + touch.clientX - gesture.current.start.x,
        y: baseOffset.y + touch.clientY - gesture.current.start.y,
      });
    }
  };

  const touchEnd = (event: React.TouchEvent) => {
    if (type === 'image' && event.touches.length === 1 && scaleRef.current > 1) {
      const remaining = event.touches[0];
      gesture.current = {
        start: { x: remaining.clientX, y: remaining.clientY },
        offset: { ...offsetRef.current },
        scale: scaleRef.current,
        pinching: false,
      };
      setIsZooming(true);
      return;
    }
    if (type === 'image' && event.touches.length === 0 && (gesture.current.pinching || isZooming || scaleRef.current > 1)) {
      resetZoom();
      return;
    }
    if (!gesture.current.start || !event.changedTouches[0]) {
      gesture.current = {};
      return;
    }
    const delta = event.changedTouches[0].clientX - gesture.current.start.x;
    gesture.current = {};
    if (Math.abs(delta) >= 45) delta > 0 ? onPrevious?.() : onNext?.();
  };

  const startEditing = () => {
    setTitleDraft(titleText);
    setDescriptionDraft(descriptionText);
    setSaveError('');
    setEditing(true);
  };

  const saveMetadata = async () => {
    const nextTitle = titleDraft.trim();
    const nextDescription = descriptionDraft.trim();
    if (!nextTitle) {
      setSaveError('عنوان العمل مطلوب.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      if (onSaveMetadata) await onSaveMetadata({ title: nextTitle, description: nextDescription });
      else if (onSaveDescription) await onSaveDescription(nextDescription);
      setTitleText(nextTitle);
      setDescriptionText(nextDescription);
      setExpanded(false);
      setEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'تعذر حفظ التعديلات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const overlayVisible = !editing && !isZooming && scale === 1;

  return <div className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-0 sm:p-3" dir="rtl" role="dialog" aria-modal="true" aria-label={titleText || 'عارض الأعمال'}>
    <div className="relative max-w-5xl w-full h-full sm:h-auto sm:max-h-[96vh] flex flex-col bg-black sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <div className="min-h-16 px-3 sm:px-4 flex items-center gap-3 border-b border-white/10 bg-black/90">
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition" aria-label="إغلاق"><X className="h-5 w-5"/></button>
        {authorName && <button type="button" onClick={onOpenAuthor} disabled={!onOpenAuthor} className="min-w-0 flex flex-1 items-center gap-2.5 text-right group"><img src={authorAvatar} alt={authorName} className="h-10 w-10 rounded-full object-cover border-2 border-emerald-500 bg-white"/><span className="min-w-0"><b className="block truncate text-sm text-white group-hover:text-emerald-300 transition">{authorName}</b><small className="block text-[10px] text-white/60">{authorRole} · اضغط لزيارة الصفحة</small></span></button>}
        {position && total && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/80" dir="ltr">{position}/{total}</span>}
        {onDelete && <button onClick={() => { if (confirm('هل تؤكد حذف هذا العمل نهائياً؟')) onDelete(); }} className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold flex gap-1"><Trash2 className="w-4 h-4"/>حذف</button>}
      </div>
      <div className={`relative bg-black flex-1 min-h-0 flex items-center justify-center overflow-hidden ${type === 'image' ? 'wednak-image-zoom-surface' : ''}`} onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd} onTouchCancel={resetZoom}>
        {onPrevious && scale === 1 && !isZooming && <button onClick={onPrevious} className="absolute right-0 top-1/4 bottom-1/4 z-10 w-14 bg-transparent opacity-0" aria-label="العمل السابق" />}
        {type === 'video'
          ? <video key={url} src={url} controls autoPlay playsInline className="w-full h-full max-h-[72vh] object-contain"/>
          : <img src={url} alt={titleText || 'عمل'} draggable={false} className={`w-full h-full max-h-[72vh] object-contain select-none will-change-transform ${scale === 1 ? 'transition-transform duration-150 ease-out' : ''}`} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}/>
        }
        {onNext && scale === 1 && !isZooming && <button onClick={onNext} className="absolute left-0 top-1/4 bottom-1/4 z-10 w-14 bg-transparent opacity-0" aria-label="العمل التالي" />}
        {(titleText || descriptionText || canEdit) && overlayVisible && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-4 pb-4 pt-20 text-right text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              {titleText && <b className="block text-sm font-black leading-6 text-white drop-shadow-md">{titleText}</b>}
              {descriptionText && <div className="mt-1 text-xs font-semibold leading-6 text-white/95 [text-shadow:0_2px_6px_rgba(0,0,0,.9)]"><p className={`whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-2'}`}>{descriptionText}</p>{descriptionCanExpand && <button type="button" onClick={() => setExpanded((value) => !value)} className="pointer-events-auto mt-0.5 font-black text-amber-200 hover:text-amber-100">{expanded ? 'عرض أقل' : 'عرض المزيد'}</button>}</div>}
            </div>
            {canEdit && <button onClick={startEditing} className="pointer-events-auto shrink-0 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm"><Pencil className="inline h-3.5 w-3.5"/> تعديل</button>}
          </div>
        </div>}
        {canEdit && editing && !isZooming && <div className="absolute inset-x-3 bottom-3 z-30 rounded-2xl bg-black/85 p-3 backdrop-blur-md">
          <div className="grid gap-2">
            <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} placeholder="عنوان العمل" className="w-full rounded-xl border border-white/20 bg-white/10 p-2 text-xs font-bold text-white outline-none placeholder:text-white/50" />
            <textarea value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} placeholder="وصف العمل" className="min-h-20 w-full resize-none rounded-xl border border-white/20 bg-white/10 p-2 text-xs text-white outline-none placeholder:text-white/50"/>
            {saveError && <p className="rounded-lg bg-rose-500/20 px-2 py-1.5 text-[11px] font-bold text-rose-100">{saveError}</p>}
            <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => void saveMetadata()} className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="inline h-4 w-4"/> {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button><button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">إلغاء</button></div>
          </div>
        </div>}
      </div>
    </div>
  </div>;
};
