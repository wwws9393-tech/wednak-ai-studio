import { UserProfile } from '../types';

export const GUEST_ANONYMOUS_USER: UserProfile = {
  id: 'guest-anonymous-101',
  name: 'زائر Wedنك (ضيف)',
  phone: '',
  email: 'guest@wednak.app',
  city: 'بغداد',
  accountType: 'زبون',
  isGuest: true,
};

export const INITIAL_FIRESTORE_USERS: Record<string, UserProfile> = {
  'user-guest-101': {
    id: 'user-guest-101',
    name: 'علي الفتلاوي',
    phone: '07701122334',
    email: 'ali.wedding@gmail.com',
    city: 'بغداد',
    accountType: 'زبون',
  },
  'owner-1': {
    id: 'owner-1',
    name: 'سيف مجيد - قاعة الملكة',
    phone: '07709988776',
    email: 'saif.queen.hall@gmail.com',
    city: 'بغداد',
    accountType: 'صاحب قاعة',
    ownedHallId: 'hall-1',
  },
  'provider-user-1': {
    id: 'provider-user-1',
    name: 'أحمد المصور - استوديو العريس',
    phone: '07703344556',
    email: 'ahmed.royal.studio@gmail.com',
    city: 'بغداد',
    accountType: 'مزود خدمة',
    ownedProviderId: 'provider-1',
  },
  'admin-1': {
    id: 'admin-1',
    name: 'إدارة Wedنك (Admin)',
    phone: '07700000000',
    email: 'admin@wednak.com',
    city: 'بغداد',
    accountType: 'مدير Admin',
  },
};

/**
 * Simulates fetching a user document directly from Firestore by UID.
 * Ignores stale cached role in localStorage during fetch.
 */
export async function fetchUserFromFirestore(uid: string): Promise<UserProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  let db = { ...INITIAL_FIRESTORE_USERS };
  try {
    const saved = localStorage.getItem('wednak_firestore_users');
    if (saved) {
      db = { ...db, ...JSON.parse(saved) };
    }
  } catch {}

  return db[uid] || null;
}

/**
 * Searches for an existing user document in Firestore by phone number.
 */
export async function findUserByPhoneFromFirestore(phone: string): Promise<UserProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  let db = { ...INITIAL_FIRESTORE_USERS };
  try {
    const saved = localStorage.getItem('wednak_firestore_users');
    if (saved) {
      db = { ...db, ...JSON.parse(saved) };
    }
  } catch {}

  const cleanPhone = phone.trim().replace(/\s+/g, '');
  const found = Object.values(db).find(
    (u) => u.phone.trim().replace(/\s+/g, '') === cleanPhone
  );

  return found || null;
}

/**
 * Saves or updates a user document in Firestore.
 */
export async function saveUserToFirestore(user: UserProfile): Promise<UserProfile> {
  let db = { ...INITIAL_FIRESTORE_USERS };
  try {
    const saved = localStorage.getItem('wednak_firestore_users');
    if (saved) {
      db = { ...db, ...JSON.parse(saved) };
    }
  } catch {}

  db[user.id] = user;
  localStorage.setItem('wednak_firestore_users', JSON.stringify(db));
  return user;
}
