/**
 * Secure Storage Vault for Mobile Client
 * Uses Expo SecureStore (Android KeyStore / iOS Keychain) for encrypted token persistence.
 * Gracefully falls back to an in-memory vault if running on Web or unsupported environments.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_jwt_token';

// In-memory fallback vault (non-persistent, zero-disk footprint)
let inMemoryVault = {};

export async function isSecureStoreAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveSecureToken(token) {
  if (!token) return;
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } else {
      inMemoryVault[TOKEN_KEY] = token;
    }
  } catch (error) {
    inMemoryVault[TOKEN_KEY] = token;
  }
}

export async function getSecureToken() {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
    return inMemoryVault[TOKEN_KEY] || null;
  } catch (error) {
    return inMemoryVault[TOKEN_KEY] || null;
  }
}

export async function deleteSecureToken() {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    delete inMemoryVault[TOKEN_KEY];
  } catch (error) {
    delete inMemoryVault[TOKEN_KEY];
  }
}
