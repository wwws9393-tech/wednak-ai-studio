import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { BusinessOffer, Hall, ServiceProvider } from '../types';

async function requireUid(): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('يجب تسجيل الدخول أولاً.');
  return uid;
}

export async function saveOwnedHall(hall: Hall): Promise<Hall> {
  const uid = await requireUid();
  if (hall.ownerId && hall.ownerId !== uid) throw new Error('لا يمكنك تعديل قاعة لا تملكها.');

  const hallRef = hall.id ? doc(db, 'halls', hall.id) : doc(db, 'halls', uid);
  const normalized: Hall = {
    ...hall,
    id: hallRef.id,
    ownerId: uid,
    images: Array.isArray(hall.images) ? hall.images.filter(Boolean) : [],
    features: Array.isArray(hall.features) ? hall.features.map((feature) => feature.trim()).filter(Boolean) : [],
    price: Number(hall.price) || 0,
    capacity: Number(hall.capacity) || 0,
    deposit: Number(hall.deposit) || 0,
    priceFormatted: `${(Number(hall.price) || 0).toLocaleString('ar-IQ')} د.ع`,
    depositFormatted: `${(Number(hall.deposit) || 0).toLocaleString('ar-IQ')} د.ع`,
  };

  await setDoc(hallRef, { ...normalized, updatedAt: new Date().toISOString() }, { merge: true });
  return normalized;
}

export async function saveOwnedServiceProvider(provider: ServiceProvider): Promise<ServiceProvider> {
  const uid = await requireUid();
  if (provider.ownerId && provider.ownerId !== uid) throw new Error('لا يمكنك تعديل صفحة خدمة لا تملكها.');

  const providerRef = provider.id ? doc(db, 'serviceProviders', provider.id) : doc(db, 'serviceProviders', uid);
  const normalized: ServiceProvider = {
    ...provider,
    id: providerRef.id,
    ownerId: uid,
    portfolio: Array.isArray(provider.portfolio) ? provider.portfolio.filter(Boolean) : [],
    features: Array.isArray(provider.features) ? provider.features.map((feature) => feature.trim()).filter(Boolean) : [],
    priceStart: Number(provider.priceStart) || 0,
    priceStartFormatted: `${(Number(provider.priceStart) || 0).toLocaleString('ar-IQ')} د.ع`,
  };

  await setDoc(providerRef, { ...normalized, updatedAt: new Date().toISOString() }, { merge: true });
  return normalized;
}

export interface BusinessOfferInput {
  ownerType: 'صاحب قاعة' | 'مزود خدمة';
  targetId: string;
  title: string;
  description: string;
  originalPrice: number;
  offerPrice: number;
  startDate: string;
  endDate: string;
}

export async function createBusinessOffer(input: BusinessOfferInput): Promise<string> {
  const uid = await requireUid();
  if (!input.title.trim()) throw new Error('عنوان العرض مطلوب.');
  if (!input.targetId) throw new Error('الصفحة المرتبطة بالعرض غير موجودة.');
  if (!input.startDate || !input.endDate) throw new Error('حدد تاريخ بداية العرض ونهايته.');
  if (input.offerPrice < 0 || input.originalPrice < 0) throw new Error('السعر غير صحيح.');
  if (input.endDate < input.startDate) throw new Error('تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية.');

  const offerRef = doc(collection(db, 'offers'));
  await setDoc(offerRef, {
    id: offerRef.id,
    ownerId: uid,
    ownerType: input.ownerType,
    targetId: input.targetId,
    title: input.title.trim(),
    description: input.description.trim(),
    originalPrice: Number(input.originalPrice),
    offerPrice: Number(input.offerPrice),
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return offerRef.id;
}

export function subscribeBusinessOffers(callback: (offers: BusinessOffer[]) => void): () => void {
  return onSnapshot(collection(db, 'offers'), (snapshot) => {
    const offers = snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as BusinessOffer));
    offers.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(offers);
  }, (error) => {
    console.error('Offers subscription failed:', error);
    callback([]);
  });
}

export async function updateBusinessOffer(offer: BusinessOffer): Promise<void> {
  const uid = await requireUid();
  if (!offer.id || offer.ownerId !== uid) throw new Error('لا يمكنك تعديل هذا العرض.');
  if (!offer.title.trim()) throw new Error('عنوان العرض مطلوب.');
  if (!offer.startDate || !offer.endDate || offer.endDate < offer.startDate) throw new Error('تواريخ العرض غير صحيحة.');
  await updateDoc(doc(db, 'offers', offer.id), {
    title: offer.title.trim(),
    description: offer.description.trim(),
    offerPrice: Number(offer.offerPrice) || 0,
    startDate: offer.startDate,
    endDate: offer.endDate,
    isActive: offer.isActive !== false,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBusinessOffer(offer: BusinessOffer): Promise<void> {
  const uid = await requireUid();
  if (!offer.id || offer.ownerId !== uid) throw new Error('لا يمكنك حذف هذا العرض.');
  await deleteDoc(doc(db, 'offers', offer.id));
}
