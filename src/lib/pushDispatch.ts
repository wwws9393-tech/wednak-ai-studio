import { auth } from './firebase';

const PUSH_WORKER_URL = 'https://wednak-notifications.wwws-9393.workers.dev';

export async function dispatchBookingPush(
  bookingId: string,
  action: 'created' | 'updated',
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !bookingId) return;

  try {
    const idToken = await user.getIdToken();
    const response = await fetch(PUSH_WORKER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId, action }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      console.warn('Push dispatch was not completed:', result?.error || response.statusText);
    }
  } catch (error) {
    // A push delivery failure must never undo a valid booking operation.
    console.warn('Push dispatch skipped:', error);
  }
}
