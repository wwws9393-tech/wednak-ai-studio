import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Check,
  Crosshair,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Trash2,
  X,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface HallMapProps {
  hallName: string;
  coordinates?: Coordinates | null;
  editable?: boolean;
  onSave?: (coordinates: Coordinates) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  compact?: boolean;
}

const IRAQ_CENTER: [number, number] = [33.2232, 43.6793];

const wednakPin = L.divIcon({
  className: 'wednak-map-pin',
  html: '<div style="width:42px;height:42px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#047857;border:4px solid white;box-shadow:0 7px 18px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;border-radius:999px;background:#fbbf24"></div></div>',
  iconSize: [42, 42],
  iconAnchor: [21, 42],
});

const MapPositionSync: React.FC<{ coordinates: Coordinates | null }> = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo([coordinates.latitude, coordinates.longitude], 17, { duration: 0.8 });
    }
  }, [coordinates, map]);

  return null;
};

export const HallMap: React.FC<HallMapProps> = ({
  hallName,
  coordinates,
  editable = false,
  onSave,
  onDelete,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!coordinates && editable);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinates | null>(coordinates || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    setDraftCoordinates(coordinates || null);
  }, [coordinates]);

  const shownCoordinates = isEditing ? draftCoordinates : coordinates;
  const center = useMemo<[number, number]>(
    () => shownCoordinates
      ? [shownCoordinates.latitude, shownCoordinates.longitude]
      : IRAQ_CENTER,
    [shownCoordinates]
  );

  const locateHallAutomatically = () => {
    setIsOpen(true);
    setIsEditing(true);
    setIsLocating(true);
    setLocationAccuracy(null);
    setLocationMessage('جاري تحديد موقع القاعة بدقة…');

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationMessage('هذا الجهاز أو المتصفح لا يدعم تحديد الموقع التلقائي. جرّب من هاتف يدعم GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraftCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationAccuracy(Math.round(position.coords.accuracy));
        setLocationMessage('تم تحديد موقع القاعة تلقائياً. يمكنك الآن حفظه.');
        setIsLocating(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'فعّل إذن الموقع للمتصفح ثم اضغط «إعادة المحاولة».'
          : error.code === error.TIMEOUT
          ? 'استغرق تحديد الموقع وقتاً طويلاً. تأكد من تشغيل GPS وأعد المحاولة.'
          : 'تعذر تحديد الموقع تلقائياً. تأكد من تشغيل GPS وأعد المحاولة.';
        setLocationMessage(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const openGoogleMaps = () => {
    if (!coordinates) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const openWaze = () => {
    if (!coordinates) return;
    window.open(
      `https://waze.com/ul?ll=${coordinates.latitude}%2C${coordinates.longitude}&navigate=yes&utm_source=wednak`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const saveLocation = async () => {
    if (!draftCoordinates || !onSave) return;
    setIsSaving(true);
    try {
      await onSave(draftCoordinates);
      setIsEditing(false);
      setLocationMessage('');
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLocation = async () => {
    if (!onDelete || !window.confirm('هل تريد حذف موقع القاعة من الخريطة؟')) return;
    setIsSaving(true);
    try {
      await onDelete();
      setDraftCoordinates(null);
      setLocationAccuracy(null);
      setLocationMessage('');
      setIsEditing(true);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!coordinates && !editable) return null;

  return (
    <>
      <section className={`wednak-location-neon relative isolate z-0 overflow-hidden rounded-3xl bg-white shadow-sm ${compact ? '' : 'mt-1'}`}>
        {coordinates ? (
          <button type="button" onClick={() => setIsOpen(true)} className="group relative block h-40 w-full overflow-hidden text-right" aria-label={`عرض موقع ${hallName} على الخريطة`}>
            <MapContainer key={`${coordinates.latitude}-${coordinates.longitude}`} center={[coordinates.latitude, coordinates.longitude]} zoom={15} dragging={false} doubleClickZoom={false} scrollWheelZoom={false} zoomControl={false} attributionControl={false} className="h-full w-full pointer-events-none">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              <Marker position={[coordinates.latitude, coordinates.longitude]} icon={wednakPin} />
            </MapContainer>
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/45 via-transparent to-transparent transition-colors group-hover:from-emerald-950/55" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-emerald-900 shadow-lg">
              <Navigation className="h-4 w-4 text-emerald-700" /> عرض على الخريطة
            </span>
            <span className="absolute bottom-1 left-2 rounded bg-white/80 px-1 text-[8px] text-gray-500">© OpenStreetMap</span>
          </button>
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center gap-2 bg-emerald-50/70 p-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"><MapPin className="h-6 w-6" /></span>
            <p className="text-sm font-black text-emerald-950">لم يتم تحديد موقع القاعة بعد</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-gray-900"><MapPin className="h-4 w-4 shrink-0 text-emerald-700" /> موقع القاعة</h3>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">{coordinates ? 'اضغط لمشاهدة الموقع وفتح اتجاهات الطريق' : 'قف داخل القاعة واضغط الزر ليُحدد الموقع تلقائياً'}</p>
          </div>
          {editable && (
            <button type="button" onClick={locateHallAutomatically} disabled={isLocating} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60">
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {coordinates ? 'تحديث تلقائي' : 'تحديد موقعي الآن'}
            </button>
          )}
        </div>
      </section>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm" dir="rtl">
          <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-base font-black text-gray-950">{isEditing ? 'تأكيد موقع القاعة' : `موقع ${hallName}`}</h2>
                <p className="text-[11px] text-gray-500">{isEditing ? 'يتم تحديد موقع القاعة تلقائياً بواسطة GPS' : 'افتح اتجاهات الطريق للوصول إلى القاعة'}</p>
              </div>
              <button type="button" onClick={() => { setIsOpen(false); setIsEditing(false); setLocationMessage(''); }} className="rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200" aria-label="إغلاق الخريطة"><X className="h-5 w-5" /></button>
            </header>

            <div className="relative min-h-0 flex-1">
              <MapContainer key={`${center[0]}-${center[1]}-${isEditing}`} center={center} zoom={shownCoordinates ? 16 : 6} scrollWheelZoom className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                <MapPositionSync coordinates={shownCoordinates || null} />
                {shownCoordinates && <Marker position={[shownCoordinates.latitude, shownCoordinates.longitude]} icon={wednakPin} />}
              </MapContainer>
              {isEditing && (
                <div className="absolute left-3 right-3 top-3 z-[500] rounded-2xl bg-white/95 p-3 text-center text-xs font-bold text-emerald-950 shadow-lg">
                  <div className="flex items-center justify-center gap-2">
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                    <span>{locationMessage || 'اضغط «تحديد موقعي» للحصول على موقع القاعة تلقائياً'}</span>
                  </div>
                  {locationAccuracy != null && <p className="mt-1 text-[10px] text-gray-500">دقة الموقع التقريبية: ±{locationAccuracy} متر</p>}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-3">
              {isEditing ? (
                <>
                  <button type="button" disabled={isLocating} onClick={locateHallAutomatically} className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 disabled:opacity-45">
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} إعادة تحديد موقعي
                  </button>
                  <button type="button" disabled={!draftCoordinates || isSaving || isLocating} onClick={saveLocation} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                    <Check className="h-4 w-4" /> {isSaving ? 'جاري الحفظ…' : 'حفظ موقع القاعة'}
                  </button>
                  {coordinates && <button type="button" disabled={isSaving} onClick={deleteLocation} className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"><Trash2 className="h-4 w-4" /> حذف</button>}
                </>
              ) : (
                <>
                  {!editable && (
                    <>
                      <button type="button" onClick={openGoogleMaps} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"><ExternalLink className="h-4 w-4" /> فتح في Google Maps</button>
                      <button type="button" onClick={openWaze} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white hover:bg-sky-600">
                        <Navigation className="h-4 w-4" /> فتح في Waze
                      </button>
                    </>
                  )}
                  {editable && onDelete && (
                    <button type="button" disabled={isSaving} onClick={deleteLocation} className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" /> حذف الموقع
                    </button>
                  )}
                </>
              )}
            </footer>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export type { Coordinates };
