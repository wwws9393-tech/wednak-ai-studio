import React, { useEffect, useRef, useState } from 'react';
import { Crop, Minus, Plus, X } from 'lucide-react';

interface ImageCropperProps {
  file: File | null;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ file, aspect = 1, title = 'تعديل الصورة', onCancel, onConfirm }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setImage(img); setZoom(1); setOffsetX(0); setOffsetY(0); };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const width = 720;
    const height = Math.round(width / aspect);
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const baseScale = Math.max(width / image.width, height / image.height);
    const scale = baseScale * zoom;
    const drawW = image.width * scale; const drawH = image.height * scale;
    const maxX = Math.max(0, (drawW - width) / 2); const maxY = Math.max(0, (drawH - height) / 2);
    const x = (width - drawW) / 2 + (offsetX / 100) * maxX;
    const y = (height - drawH) / 2 + (offsetY / 100) * maxY;
    ctx.drawImage(image, x, y, drawW, drawH);
  }, [image, zoom, offsetX, offsetY, aspect]);

  if (!file) return null;
  const confirm = () => canvasRef.current?.toBlob((blob) => {
    if (!blob) return;
    onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-cropped.jpg`, { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.9);

  return <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" dir="rtl">
    <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b"><h2 className="font-black flex items-center gap-2"><Crop className="w-5 h-5 text-emerald-700"/>{title}</h2><button type="button" onClick={onCancel} className="p-2 rounded-full bg-gray-100"><X className="w-4 h-4"/></button></div>
      <div className="p-4 space-y-4">
        <div className="rounded-2xl overflow-hidden bg-gray-950 border-2 border-emerald-600"><canvas ref={canvasRef} className="w-full block"/></div>
        <div className="space-y-3 text-xs font-bold">
          <label className="flex items-center gap-2"><Minus className="w-4 h-4"/><input aria-label="تكبير الصورة" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} className="flex-1 accent-emerald-700"/><Plus className="w-4 h-4"/></label>
          <label>تحريك أفقي<input aria-label="تحريك أفقي" type="range" min="-100" max="100" value={offsetX} onChange={(e)=>setOffsetX(Number(e.target.value))} className="w-full accent-emerald-700"/></label>
          <label>تحريك عمودي<input aria-label="تحريك عمودي" type="range" min="-100" max="100" value={offsetY} onChange={(e)=>setOffsetY(Number(e.target.value))} className="w-full accent-emerald-700"/></label>
        </div>
      </div>
      <div className="p-4 border-t flex gap-2"><button type="button" onClick={confirm} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl text-xs font-bold">اعتماد ورفع الصورة</button><button type="button" onClick={onCancel} className="px-5 py-3 bg-gray-100 rounded-xl text-xs font-bold">إلغاء</button></div>
    </div>
  </div>;
};
