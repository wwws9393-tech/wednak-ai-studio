import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { ImageCropper } from './ImageCropper';

export const CroppedImageInput: React.FC<{ label: string; aspect?: number; onReady: (file: File) => void }> = ({ label, aspect = 1, onReady }) => {
  const [file, setFile] = useState<File | null>(null);
  return <>
    <label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-3 text-xs font-bold cursor-pointer bg-gray-50 hover:bg-emerald-50"><Upload className="w-4 h-4"/>{label}<input type="file" accept="image/*" className="hidden" onChange={(e)=>{const selected=e.target.files?.[0]; e.currentTarget.value=''; if(selected)setFile(selected);}}/></label>
    <ImageCropper file={file} aspect={aspect} title={label} onCancel={()=>setFile(null)} onConfirm={(cropped)=>{setFile(null);onReady(cropped);}}/>
  </>;
};
