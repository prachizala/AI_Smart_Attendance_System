import * as SecureStore from 'expo-secure-store';

const OFFLINE_QUEUE_KEY = 'smart_attendance_offline_queue';

/**
 * Stores an attendance punch locally when phone has no internet / Wi-Fi connection
 */
export async function queueOfflinePunch(punchData) {
  try {
    const queue = await getOfflinePunches();
    const newEntry = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: punchData.user_id,
      latitude: punchData.latitude,
      longitude: punchData.longitude,
      face_image_base64: punchData.face_image_base64,
      offline_timestamp: new Date().toISOString(),
      employee_id: punchData.employee_id || 'EMP',
      created_at: new Date().toLocaleTimeString(),
    };

    queue.push(newEntry);
    await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return newEntry;
  } catch (err) {
    console.warn('Failed to queue offline punch:', err);
    return null;
  }
}

/**
 * Get all pending unsynced offline punches
 */
export async function getOfflinePunches() {
  try {
    const data = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.warn('Failed to read offline punches:', err);
    return [];
  }
}

/**
 * Remove a single punch by ID after successful sync
 */
export async function removeOfflinePunch(id) {
  try {
    const queue = await getOfflinePunches();
    const updated = queue.filter((item) => item.id !== id);
    await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to remove offline punch:', err);
    return [];
  }
}

/**
 * Sync all pending offline punches with FastAPI backend
 * Returns { syncedCount: number, failedCount: number, errors: string[] }
 */
export async function syncOfflinePunches(serverUrl) {
  const queue = await getOfflinePunches();
  if (!queue || queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  const cleanUrl = serverUrl.replace(/\/+$/, '');
  let syncedCount = 0;
  let failedCount = 0;
  const errors = [];
  const remainingQueue = [];

  for (const punch of queue) {
    try {
      const response = await fetch(`${cleanUrl}/api/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: punch.user_id,
          latitude: punch.latitude,
          longitude: punch.longitude,
          face_image_base64: punch.face_image_base64,
          offline_timestamp: punch.offline_timestamp,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        syncedCount++;
      } else {
        // If already checked in today, treat as resolved
        if (response.status === 409) {
          syncedCount++;
        } else {
          failedCount++;
          errors.push(data.detail || 'Sync failed');
          remainingQueue.push(punch);
        }
      }
    } catch (netErr) {
      failedCount++;
      errors.push(netErr.message || 'Network unreachable');
      remainingQueue.push(punch);
    }
  }

  await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  return { syncedCount, failedCount, errors };
}
