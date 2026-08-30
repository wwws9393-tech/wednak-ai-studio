import React, { useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { ImageCropper } from './ImageCropper';

interface CroppedImageInputProps {
  label: string;
  aspect?: number;
  onReady: (file: File) => void;
  busy?: boolean;
  progress?: number;
  busyLabel?: string;
  disabled?: boolean;
}

export const CroppedImageInput: React.FC<CroppedImageInputProps> = ({
  label,
  aspect = 1,
  onReady,
  busy = false,
  progress = 0,
  busyLabel = 'جاري رفع الصورة...',
  disabled = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return <div className="space-y-2">
    <label
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs font-bold transition ${
        busy || disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
          : 'cursor-pointer border-emerald-800/25 bg-gray-50 hover:bg-emerald-50'
      }`}
      aria-busy={busy}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      <span>{busy ? busyLabel : label}</span>
      <input
        type="file"
        accept="image/*"
        disabled={busy || disabled}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.currentTarget.value = '';
          if (selected) setFile(selected);
        }}
      />
    </label>

    {busy && <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5" role="status" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-black text-emerald-900">
        <span>{busyLabel}</span>
        <span dir="ltr">{safeProgress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-emerald-800/10">
        <div className="h-full rounded-full bg-emerald-700 transition-[width] duration-200" style={{ width: `${Math.max(4, safeProgress)}%` }} />
      </div>
    </div>}

    <ImageCropper
      file={file}
      aspect={aspect}
      title={label}
      onCancel={() => setFile(null)}
      onConfirm={(cropped) => {
        setFile(null);
        onReady(cropped);
      }}
    />
  </div>;
};
