import React, { useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import { Check, ExternalLink, MapPin, Navigation, Trash2, X } from 'lucide-react';
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

const MapClickPicker: React.FC<{
  enabled: boolean;
  onSelect: (coordinates: Coordinates) => void;
}> = ({ enabled, onSelect }) => {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
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
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinates | null>(
    coordinates || null
  );
  const [isSaving, setIsSaving] = useState(false);

  const shownCoordinates = isEditing ? draftCoordinates : coordinates;
  const center = useMemo<[number, number]>(
    () => shownCoordinates
      ? [shownCoordinates.latitude, shownCoordinates.longitude]
      : IRAQ_CENTER,
    [shownCoordinates]
  );

  const openGoogleMaps = () => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveLocation = async () => {
    if (!draftCoordinates || !onSave) return;
    setIsSaving(true);
    try {
      await onSave(draftCoordinates);
      setIsEditing(false);
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
      setIsEditing(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (!coordinates && !editable) return null;

  return (
    <>
      <section className={`overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm ${compact ? '' : 'mt-1'}`}>
        {coordinates ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative block h-40 w-full overflow-hidden text-right"
            aria-label={`عرض موقع ${hallName} على الخريطة`}
          >
            <MapContainer
              key={`${coordinates.latitude}-${coordinates.longitude}`}
              center={[coordinates.latitude, coordinates.longitude]}
              zoom={15}
              dragging={false}
              doubleClickZoom={false}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              className="h-full w-full pointer-events-none"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker
                position={[coordinates.latitude, coordinates.longitude]}
                icon={wednakPin}
              />
            </MapContainer>
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/45 via-transparent to-transparent transition-colors group-hover:from-emerald-950/55" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-emerald-900 shadow-lg">
              <Navigation className="h-4 w-4 text-emerald-700" />
              عرض على الخريطة
            </span>
            <span className="absolute bottom-1 left-2 rounded bg-white/80 px-1 text-[8px] text-gray-500">© OpenStreetMap</span>
          </button>
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center gap-2 bg-emerald-50/70 p-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
              <MapPin className="h-6 w-6" />
            </span>
            <p className="text-sm font-black text-emerald-950">لم يتم تحديد موقع القاعة بعد</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-gray-900">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
              موقع القاعة
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">
              {coordinates ? 'اضغط على الخريطة لمشاهدة الموقع والطريق' : 'حدد مدخل القاعة بدقة ليسهل الوصول إليها'}
            </p>
          </div>
          {editable && (
            <button
              type="button"
              onClick={() => {
                setDraftCoordinates(coordinates || null);
                setIsEditing(true);
                setIsOpen(true);
              }}
              className="shrink-0 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
            >
              {coordinates ? 'تغيير الموقع' : 'تحديد الموقع'}
            </button>
          )}
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm" dir="rtl">
          <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-base font-black text-gray-950">
                  {isEditing ? 'تحديد موقع القاعة' : `موقع ${hallName}`}
                </h2>
                <p className="text-[11px] text-gray-500">
                  {isEditing ? 'حرّك الخريطة واضغط على موقع باب القاعة لتثبيت الدبوس' : 'يمكنك تكبير الخريطة وتحريكها بحرية'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsEditing(false);
                }}
                className="rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
                aria-label="إغلاق الخريطة"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1">
              <MapContainer
                key={`${center[0]}-${center[1]}-${isEditing}`}
                center={center}
                zoom={shownCoordinates ? 16 : 6}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <MapClickPicker enabled={isEditing} onSelect={setDraftCoordinates} />
                {shownCoordinates && (
                  <Marker
                    position={[shownCoordinates.latitude, shownCoordinates.longitude]}
                    icon={wednakPin}
                  />
                )}
              </MapContainer>
              {isEditing && (
                <div className="pointer-events-none absolute left-3 right-3 top-3 z-[500] rounded-2xl bg-white/95 p-3 text-center text-xs font-bold text-emerald-950 shadow-lg">
                  اضغط مرة واحدة على الموقع الصحيح لتثبيت علامة القاعة
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    disabled={!draftCoordinates || isSaving}
                    onClick={saveLocation}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Check className="h-4 w-4" />
                    {isSaving ? 'جاري الحفظ…' : 'حفظ هذا الموقع'}
                  </button>
                  {coordinates && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={deleteLocation}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={openGoogleMaps}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  فتح الطريق في Google Maps
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export type { Coordinates };
