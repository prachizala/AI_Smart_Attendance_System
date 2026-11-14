import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_CREDENTIALS_KEY = 'smart_attendance_bio_creds';

/**
 * Checks if the device has biometric hardware and enrolled biometrics
 * Returns { isAvailable: boolean, hasHardware: boolean, isEnrolled: boolean, type: string }
 */
export async function checkBiometricSupport() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let type = 'Biometrics';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      type = 'Fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      type = 'Face ID';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      type,
    };
  } catch (err) {
    console.warn('Biometric support check error:', err);
    return { isAvailable: false, hasHardware: false, isEnrolled: false, type: 'None' };
  }
}

/**
 * Triggers native system fingerprint / biometric prompt
 */
export async function authenticateWithBiometrics(promptMessage = 'Scan your fingerprint to authenticate') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false,
    });
    return result;
  } catch (err) {
    console.warn('Biometric authentication failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Save user credentials securely for biometric quick login
 */
export async function saveBiometricCredentials(identifier, password) {
  try {
    const payload = JSON.stringify({ identifier, password });
    await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, payload);
    return true;
  } catch (err) {
    console.warn('Failed to save biometric credentials:', err);
    return false;
  }
}

/**
 * Retrieve saved credentials for biometric quick login
 */
export async function getBiometricCredentials() {
  try {
    const data = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.warn('Failed to get biometric credentials:', err);
    return null;
  }
}

/**
 * Clear stored biometric credentials
 */
export async function clearBiometricCredentials() {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    return true;
  } catch (err) {
    return false;
  }
}
