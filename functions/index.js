const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

exports.adminDeleteUser = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول.');
  const db = getFirestore();
  const adminSnap = await db.doc(`users/${request.auth.uid}`).get();
  const role = adminSnap.exists ? adminSnap.data().accountType : '';
  if (!['مدير', 'مدير Admin'].includes(role)) throw new HttpsError('permission-denied', 'هذه الصلاحية للمدير فقط.');
  const userId = String(request.data?.userId || '').trim();
  if (!userId || userId === request.auth.uid) throw new HttpsError('invalid-argument', 'معرف الحساب غير صالح.');

  const links = [
    ['halls', 'ownerId'], ['serviceProviders', 'ownerId'], ['posts', 'authorId'],
    ['offers', 'ownerId'], ['complaints', 'userId'], ['bookings', 'requesterId'],
    ['bookings', 'customerId'], ['bookings', 'targetOwnerId'], ['bookings', 'ownerId'],
  ];
  const refs = new Map();
  for (const [collectionName, field] of links) {
    const snapshot = await db.collection(collectionName).where(field, '==', userId).get();
    snapshot.docs.forEach((item) => refs.set(item.ref.path, item.ref));
  }
  for (const ref of refs.values()) await db.recursiveDelete(ref);
  await db.recursiveDelete(db.doc(`users/${userId}`));
  await db.doc(`deletedUsers/${userId}`).set({ userId, deletedAt: new Date().toISOString(), deletedBy: request.auth.uid }, { merge: true });
  try { await getAuth().deleteUser(userId); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  return { success: true, deletedUserId: userId, deletedDocuments: refs.size + 1 };
});
