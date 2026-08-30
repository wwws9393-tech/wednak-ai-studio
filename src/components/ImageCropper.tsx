import React, { useEffect, useRef, useState } from 'react';
import { Crop, Image as ImageIcon, Maximize2, Minus, Plus, X } from 'lucide-react';

interface ImageCropperProps {
  file: File | null;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

type FitMode = 'cover' | 'contain';

function drawCentered(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  scale: number,
  offsetX = 0,
  offsetY = 0,
) {
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2 + offsetX,
    (height - drawHeight) / 2 + offsetY,
    drawWidth,
    drawHeight,
  );
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  file,
  aspect = 1,
  title = 'تعديل الصورة',
  onCancel,
  onConfirm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('cover');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      setImage(nextImage);
      setFitMode('cover');
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    nextImage.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const width = 1120;
    const height = Math.max(1, Math.round(width / aspect));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, width, height);

    if (fitMode === 'contain') {
      const backgroundScale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.08;
      context.save();
      context.globalAlpha = 0.62;
      context.filter = 'blur(30px) brightness(0.72)';
      drawCentered(context, image, width, height, backgroundScale);
      context.restore();
    }

    const baseScale = fitMode === 'cover'
      ? Math.max(width / image.naturalWidth, height / image.naturalHeight)
      : Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const scale = baseScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxX = Math.max(0, (drawWidth - width) / 2);
    const maxY = Math.max(0, (drawHeight - height) / 2);
    const moveX = (offsetX / 100) * maxX;
    const moveY = (offsetY / 100) * maxY;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    drawCentered(context, image, width, height, scale, moveX, moveY);
  }, [image, fitMode, zoom, offsetX, offsetY, aspect]);

  if (!file) return null;

  const confirm = () => canvasRef.current?.toBlob((blob) => {
    if (!blob) return;
    onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-wednak-cover.jpg`, { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.92);

  return <div className="fixed inset-0 z-[180] grid place-items-center overflow-hidden bg-black/75 p-3 backdrop-blur-sm" dir="rtl">
    <div className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black"><Crop className="h-4 w-4 text-emerald-700" />{title}</h2>
          <p className="mt-1 text-[10px] text-gray-500">المعاينة هي نفس قياس الغلاف الذي سيظهر داخل ويدنك.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full bg-gray-100"><X className="h-4 w-4" /></button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        <div className="overflow-hidden rounded-2xl border-2 border-emerald-600 bg-slate-950 shadow-inner" style={{ aspectRatio: String(aspect) }}>
          <canvas ref={canvasRef} className="block h-full w-full object-contain" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-2">
          <button
            type="button"
            onClick={() => { setFitMode('cover'); setZoom(1); setOffsetX(0); setOffsetY(0); }}
            className={`rounded-xl px-3 py-2 text-[11px] font-black ${fitMode === 'cover' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-700'}`}
          >
            <Maximize2 className="mx-auto mb-1 h-4 w-4" />ملء الغلاف
          </button>
          <button
            type="button"
            onClick={() => { setFitMode('contain'); setZoom(1); setOffsetX(0); setOffsetY(0); }}
            className={`rounded-xl px-3 py-2 text-[11px] font-black ${fitMode === 'contain' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-700'}`}
          >
            <ImageIcon className="mx-auto mb-1 h-4 w-4" />إظهار الصورة كاملة
          </button>
        </div>

        <div className="space-y-2 rounded-2xl border border-gray-200 p-3 text-[11px] font-bold">
          <label className="flex items-center gap-2"><Minus className="h-4 w-4" /><input aria-label="تكبير الصورة" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="flex-1 accent-emerald-700" /><Plus className="h-4 w-4" /></label>
          <label>تحريك أفقي<input aria-label="تحريك أفقي" type="range" min="-100" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="w-full accent-emerald-700" /></label>
          <label>تحريك عمودي<input aria-label="تحريك عمودي" type="range" min="-100" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="w-full accent-emerald-700" /></label>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t bg-white p-4">
        <button type="button" onClick={confirm} className="flex-1 rounded-xl bg-emerald-700 py-3 text-xs font-bold text-white">اعتماد ورفع الصورة</button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-gray-100 px-5 py-3 text-xs font-bold">إلغاء</button>
      </div>
    </div>
  </div>;
};
