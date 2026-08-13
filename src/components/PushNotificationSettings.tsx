import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSupport,
  refreshPushRegistration,
  PushSupport,
} from '../lib/pushNotifications';

export const PushNotificationSettings: React.FC<{ userId: string }> = ({ userId }) => {
  const [support, setSupport] = useState<PushSupport>('supported');
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'denied' : Notification.permission
  );
  const [enabledOnDevice, setEnabledOnDevice] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setBusy(true);
      const currentSupport = await getPushSupport();
      if (!active) return;
      setSupport(currentSupport);
      const currentPermission = typeof Notification === 'undefined' ? 'denied' : Notification.permission;
      setPermission(currentPermission);

      if (currentSupport === 'supported' && currentPermission === 'granted') {
        try {
          await refreshPushRegistration(userId);
          if (active) setEnabledOnDevice(true);
        } catch (error) {
          console.warn('Push refresh skipped:', error);
          if (active) setEnabledOnDevice(false);
        }
      } else if (active) {
        setEnabledOnDevice(false);
      }
      if (active) setBusy(false);
    };
    void initialize();
    return () => { active = false; };
  }, [userId]);

  const enable = async () => {
    setBusy(true); setMessage('');
    try {
      await enablePushNotifications(userId);
      setPermission(Notification.permission);
      setEnabledOnDevice(true);
      setMessage('تم تفعيل إشعارات ويدنك على هذا الجهاز.');
    } catch (error) {
      setPermission(typeof Notification === 'undefined' ? 'denied' : Notification.permission);
      setEnabledOnDevice(false);
      setMessage(error instanceof Error ? error.message : 'تعذر تفعيل الإشعارات.');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setMessage('');
    try {
      await disablePushNotifications(userId);
      setEnabledOnDevice(false);
      setMessage('تم إيقاف إشعارات ويدنك على هذا الجهاز.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إيقاف الإشعارات.');
    } finally { setBusy(false); }
  };

  if (support === 'unsupported') {
    return <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">هذا الجهاز أو المتصفح لا يدعم إشعارات الويب. على الآيفون أضف ويدنك إلى الشاشة الرئيسية وافتحه من الأيقونة.</div>;
  }

  if (support === 'not-configured') {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-900">نظام إشعارات الهاتف قيد الإعداد النهائي.</div>;
  }

  const active = permission === 'granted' && enabledOnDevice;
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm">{active ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}</span>
        <div className="flex-1">
          <h3 className="text-sm font-black text-gray-900">إشعارات الهاتف</h3>
          <p className="mt-0.5 text-[11px] text-gray-600">{active ? 'فعالة ومسجلة على هذا الجهاز وتصل حتى عند إغلاق ويدنك.' : 'اضغط تفعيل لتسجيل هذا الجهاز واستلام تحديثات الحجوزات.'}</p>
        </div>
      </div>
      <button type="button" disabled={busy} onClick={active ? disable : enable} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white disabled:opacity-50 ${active ? 'bg-gray-700' : 'bg-emerald-700'}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {busy ? 'جاري فحص تسجيل الجهاز…' : active ? 'إيقاف إشعارات هذا الجهاز' : 'تفعيل إشعارات هذا الجهاز'}
      </button>
      {message && <p className={`flex items-center gap-1 text-[11px] font-bold ${message.startsWith('تم تفعيل') ? 'text-emerald-700' : message.startsWith('تم إيقاف') ? 'text-gray-600' : 'text-rose-700'}`}>{message.startsWith('تم تفعيل') && <CheckCircle2 className="h-4 w-4" />}{message}</p>}
    </div>
  );
};
