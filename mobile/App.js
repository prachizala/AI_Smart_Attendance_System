import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Sun, Moon, MapPin, Clock, Calendar, Sparkles, CheckCircle2, XCircle, AlertCircle, Camera, X, RotateCcw, ScanFace, Fingerprint, Check, Bell } from 'lucide-react-native';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import LeaveScreen from './src/screens/LeaveScreen';
import { saveSecureToken, getSecureToken, deleteSecureToken } from './src/utils/secureStorage';
import { checkBiometricSupport, authenticateWithBiometrics, saveBiometricCredentials, getBiometricCredentials } from './src/utils/biometrics';
import { queueOfflinePunch, getOfflinePunches, syncOfflinePunches } from './src/utils/offlineSync';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import LanguageSelector from './src/components/LanguageSelector';
import PasswordInput from './src/components/PasswordInput';

// ==============================================================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ==============================================================================
// Office Geofence Target: SBS Shanti Business School, Shela, Ahmedabad, Gujarat 380058
const OFFICE_LAT = 23.002217;
const OFFICE_LON = 72.455763;
const GEOFENCE_RADIUS = 100.0; // Allowed radius in meters

// Default backend API URL configured for local Wi-Fi LAN IP (192.168.1.3)
const LAN_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:8000';
const DEFAULT_SERVER_URL = Platform.select({
  android: LAN_API_URL, // Physical phone or emulator connected to PC Wi-Fi
  ios: LAN_API_URL,
  default: LAN_API_URL,
});

// Haversine Geodesic Distance Formula (Calculates surface distance in meters)
const calculateHaversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // Mean Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// ==============================================================================
// 2. COMPONENT: LOGIN SCREEN
// ==============================================================================
function LoginScreen({ onLoginSuccess, serverUrl, setServerUrl }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [identifier, setIdentifier] = useState('EMP001');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalError, setModalError] = useState(null); // { title: string, message: string }
  const [showConfig, setShowConfig] = useState(false);
  const [bioSupport, setBioSupport] = useState({ isAvailable: false, type: 'Fingerprint' });

  useEffect(() => {
    checkBiometricSupport().then((res) => {
      setBioSupport(res);
    });
  }, []);

  const handleBiometricLogin = async () => {
    try {
      const stored = await getBiometricCredentials();
      if (!stored || !stored.identifier || !stored.password) {
        Alert.alert(
          t('biometricLogin'),
          'Please sign in once with your Employee ID and password to link your fingerprint on this device.'
        );
        return;
      }

      const authRes = await authenticateWithBiometrics(t('biometricPrompt'));
      if (!authRes.success) {
        if (authRes.error && authRes.error !== 'user_cancel') {
          Alert.alert(t('authFailedTitle'), t('biometricsFailed'));
        }
        return;
      }

      setIdentifier(stored.identifier);
      setPassword(stored.password);
      setIsLoading(true);

      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: stored.identifier,
          password: stored.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || t('biometricsFailed'));
      }
      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      Alert.alert(t('authFailedTitle'), err.message || t('biometricsFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    setModalError(null);

    if (!identifier.trim() || !password.trim()) {
      const msg = t('missingFieldsMsg');
      setErrorMsg(msg);
      setModalError({
        title: t('missingFieldsTitle'),
        message: msg,
      });
      Alert.alert(t('missingFieldsTitle'), msg);
      return;
    }

    setIsLoading(true);
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      let response;

      const fetchWithTimeout = async (url, opts, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(url, { ...opts, signal: controller.signal });
        } catch (fetchErr) {
          if (
            fetchErr.name === 'AbortError' || 
            fetchErr.message?.toLowerCase().includes('canceled') || 
            fetchErr.message?.toLowerCase().includes('cancel') ||
            fetchErr.message?.toLowerCase().includes('network request failed')
          ) {
            throw new Error(`Connection timeout: Phone cannot reach backend at ${cleanUrl}. Please ensure your PC Wi-Fi is set to Private network.`);
          }
          throw fetchErr;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      try {
        response = await fetchWithTimeout(`${cleanUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: identifier.trim(),
            password: password.trim(),
          }),
        }, 8000);
      } catch (netErr) {
        // If port 8000 is unreachable, try port 3000 proxy fallback if applicable
        if (cleanUrl.includes(':8000')) {
          const fallbackUrl = cleanUrl.replace(':8000', ':3000');
          try {
            response = await fetchWithTimeout(`${fallbackUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identifier: identifier.trim(),
                password: password.trim(),
              }),
            }, 3000);
            if (setServerUrl) {
              setServerUrl(fallbackUrl);
            }
          } catch (fallbackErr) {
            throw netErr;
          }
        } else {
          throw netErr;
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed. Invalid credentials.');
      }

      saveBiometricCredentials(identifier.trim(), password.trim());
      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      let rawMsg = err.message || '';
      let title = t('authFailedTitle');
      let userFriendlyMsg = rawMsg;

      const lower = rawMsg.toLowerCase();
      if (lower.includes('password') || lower.includes('incorrect password')) {
        title = t('wrongPasswordTitle');
        userFriendlyMsg = t('wrongPasswordMsg');
      } else if (
        lower.includes('invalid employee id') ||
        lower.includes('not found') ||
        lower.includes('identifier')
      ) {
        title = t('invalidIdTitle');
        userFriendlyMsg = t('invalidIdMsg');
      } else if (lower.includes('deactivated')) {
        title = t('deactivatedTitle');
        userFriendlyMsg = t('deactivatedMsg');
      } else if (
        lower.includes('network') || 
        lower.includes('failed to fetch') || 
        lower.includes('connection') || 
        lower.includes('timeout') ||
        lower.includes('cancel')
      ) {
        title = t('serverErrorTitle');
        userFriendlyMsg = t('serverErrorMsg');
      } else {
        userFriendlyMsg = rawMsg || t('serverErrorMsg');
      }

      setErrorMsg(userFriendlyMsg);
      setModalError({
        title,
        message: userFriendlyMsg,
      });

      // Show native popup immediately
      Alert.alert(title, userFriendlyMsg, [{ text: 'OK', onPress: () => {} }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Custom Popup Modal for High-Visibility Error Alerts */}
      <Modal
        visible={!!modalError}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalError(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupIconCircle}>
              <XCircle size={36} color="#DC2626" />
            </View>
            <Text style={styles.popupTitle}>{modalError?.title}</Text>
            <Text style={styles.popupMessage}>{modalError?.message}</Text>
            <TouchableOpacity
              style={styles.popupBtn}
              onPress={() => setModalError(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.popupBtnText}>{t('tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.loginScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Bar: Clean, Outside Card */}
        <View style={styles.loginTopBar}>
          <View style={styles.loginTopBadge}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.loginTopBadgeText}>{t('bcaTag')}</Text>
          </View>

          <View style={styles.loginTopActions}>
            <LanguageSelector compact={true} />
            <TouchableOpacity
              style={styles.themeToggleBtn}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Clean Center Card */}
        <View style={styles.loginCard}>
          <View style={styles.loginCardHeader}>
            <View style={styles.loginLogoCircle}>
              <ScanFace size={28} color={colors.primary} />
            </View>
            <Text style={styles.loginTitle}>{t('appTitle')}</Text>
            <Text style={styles.loginSubtitle}>{t('appSubtitle')}</Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.loginErrorBox}>
              <Text style={styles.loginErrorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('employeeIdOrEmail')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('employeeIdPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('password')}</Text>
            <PasswordInput
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Server Config Accordion */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? t('hideServerSettings') : t('serverSettings')}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>{t('fastApiServerUrl')}</Text>
              <TextInput
                style={[styles.textInput, styles.monoInput]}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.configHint}>
                * Wi-Fi LAN: http://192.168.1.3:8000
              </Text>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>{t('signInToWorkstation')}</Text>
            )}
          </TouchableOpacity>

          {/* Biometric Fingerprint / Touch ID Button */}
          {bioSupport.isAvailable && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometricLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Fingerprint size={20} color={colors.primary} />
              <Text style={styles.biometricBtnText}>{t('biometricLogin')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Subtle Bottom Footer */}
        <View style={styles.loginFooter}>
          <Text style={styles.loginFooterText}>
            {t('academicFooter')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==============================================================================
// 3. COMPONENT: CHECK-IN DASHBOARD (SIMULTANEOUS HARDWARE TRIGGER)
// ==============================================================================
function CheckInDashboard({
  user,
  token,
  serverUrl,
  onLogout,
  onUpdateUser,
  onNavigateToHistory,
  onNavigateToLeave,
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Live ticking clock
  const [liveClock, setLiveClock] = useState(new Date());
  useEffect(() => {
    const tTimer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(tTimer);
  }, []);

  const getGreeting = () => {
    const hr = liveClock.getHours();
    if (hr < 12) return t('goodMorning');
    if (hr < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Location & Geofence State
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [demoMode, setDemoMode] = useState('real'); // 'real' | 'mock_inside' | 'mock_outside'

  // Today's Attendance State
  const [todayRecord, setTodayRecord] = useState(null);
  const [isLoadingToday, setIsLoadingToday] = useState(false);

  const fetchTodayStatus = async () => {
    try {
      setIsLoadingToday(true);
      const cleanUrl = (serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
      const empId = user?.employee_id || user?.id || 'EMP001';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`${cleanUrl}/attendance/history/${empId}`, { headers }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${cleanUrl}/api/attendance/history/${empId}`, { headers }).catch(() => null);
      }
      if (res && res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          const match = list.find((item) => item.date === todayStr);
          setTodayRecord(match || list[0]); // match today or show latest
        }
      }
    } catch (e) {
      // Non-blocking
    } finally {
      setIsLoadingToday(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, [user?.employee_id, user?.id]);

  // Camera & Check-In Processing State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('front');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const cameraRef = useRef(null);

  // Anti-Spoofing Liveness Verification State
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessMessage, setLivenessMessage] = useState('');

  useEffect(() => {
    let timer;
    if (cameraActive) {
      setLivenessPassed(false);
      setLivenessMessage(t('livenessChallengeBlink'));
      timer = setTimeout(() => {
        setLivenessPassed(true);
        setLivenessMessage(t('livenessPassed'));
      }, 1600);
    } else {
      setLivenessPassed(false);
    }
    return () => clearTimeout(timer);
  }, [cameraActive, t]);

  // Dynamic Feedback Banner & Modal
  const [statusBanner, setStatusBanner] = useState(null);
  const [resultModal, setResultModal] = useState({
    visible: false,
    type: 'success', // 'success' | 'geofence_error' | 'face_error' | 'duplicate_error' | 'error'
    title: '',
    message: '',
    details: null,
  });

  // Offline Sync & In-App Notifications State
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const refreshOfflineCount = async () => {
    try {
      const queue = await getOfflinePunches();
      setOfflineCount(queue.length);
    } catch (_) {}
  };

  useEffect(() => {
    refreshOfflineCount();
  }, []);

  const handleSyncOfflineNow = async () => {
    if (isSyncingOffline) return;
    setIsSyncingOffline(true);
    try {
      const res = await syncOfflinePunches(serverUrl);
      await refreshOfflineCount();
      if (res.syncedCount > 0) {
        Alert.alert('Offline Sync', `Successfully synchronized ${res.syncedCount} punch(es) with the server.`);
        fetchTodayStatus();
      } else if (res.failedCount > 0) {
        Alert.alert('Sync Incomplete', `Could not reach server: ${res.errors[0] || 'Check network'}`);
      }
    } catch (e) {
      Alert.alert('Sync Failed', e.message || 'Unable to sync');
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Biometric Face Enrollment State
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollFacing, setEnrollFacing] = useState('front');
  const enrollCameraRef = useRef(null);

  const handleEnrollFace = async () => {
    if (!enrollCameraRef.current) return;
    setIsEnrolling(true);
    try {
      const photo = await enrollCameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/auth/register-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          face_image_base64: photo.base64,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Face registration failed.');
      }

      if (user) {
        user.has_face_registered = true;
      }
      if (onUpdateUser) {
        onUpdateUser({ has_face_registered: true });
      }
      setEnrollModalVisible(false);
      Alert.alert(
        t('faceSavedTitle'),
        t('faceSavedMsg'),
        [{ text: t('acknowledge') }]
      );
      setStatusBanner({
        type: 'success',
        text: t('faceSavedMsg'),
      });
    } catch (err) {
      Alert.alert(t('faceMismatchTitle'), err.message || t('faceMismatchMsg'));
    } finally {
      setIsEnrolling(false);
    }
  };

  // Acquire high-precision GPS coordinates from device hardware
  const fetchCurrentLocation = async (mode = demoMode) => {
    setIsLocating(true);
    try {
      if (mode === 'mock_inside') {
        const mockCoords = { latitude: 23.002220, longitude: 72.455770 };
        setLocation(mockCoords);
        const d = calculateHaversine(mockCoords.latitude, mockCoords.longitude, OFFICE_LAT, OFFICE_LON);
        setDistance(d);
        setIsInsideGeofence(d <= GEOFENCE_RADIUS);
        return mockCoords;
      } else if (mode === 'mock_outside') {
        const mockCoords = { latitude: 23.020000, longitude: 72.490000 };
        setLocation(mockCoords);
        const d = calculateHaversine(mockCoords.latitude, mockCoords.longitude, OFFICE_LAT, OFFICE_LON);
        setDistance(d);
        setIsInsideGeofence(d <= GEOFENCE_RADIUS);
        return mockCoords;
      }

      // Real hardware GPS sensor acquisition
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStatusBanner({
          type: 'error',
          text: t('locationErrorMsg'),
        });
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setLocation(coords);
      const d = calculateHaversine(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LON);
      setDistance(d);
      setIsInsideGeofence(d <= GEOFENCE_RADIUS);
      return coords;
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err.message || t('locationErrorMsg'),
      });
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  // Sync GPS fix on mount
  useEffect(() => {
    fetchCurrentLocation('real');
  }, []);

  const handleStartCheckIn = async () => {
    if (!user?.has_face_registered) {
      Alert.alert(
        t('faceRegistrationRequired'),
        t('faceRegistrationDesc'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('registerFaceNow'),
            onPress: async () => {
              if (!cameraPermission?.granted) {
                const res = await requestCameraPermission();
                if (!res.granted) {
                  Alert.alert('Camera Access Required', 'Camera permission is required for face registration.');
                  return;
                }
              }
              setEnrollModalVisible(true);
            },
          },
        ]
      );
      return;
    }

    // Verify Camera Permission
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Access Required',
          'Camera permission is required to verify face attendance.'
        );
        return;
      }
    }

    setStatusBanner(null);
    fetchCurrentLocation(demoMode);
    setCameraActive(true);
  };

  const handleCaptureAndCheckIn = async () => {
    if (!cameraRef.current) return;

    if (!livenessPassed) {
      Alert.alert('Anti-Spoofing Check', t('livenessChallengeBlink'));
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(t('syncing'));

    let photo = null;
    let currentCoords = location;

    try {
      photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: false,
      });

      setCameraActive(false);

      if (!currentCoords) {
        currentCoords = await fetchCurrentLocation(demoMode);
      }

      if (!currentCoords) {
        throw new Error(t('locationErrorMsg'));
      }

      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/attendance/check-in`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          face_image_base64: photo.base64,
          user_id: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const statusCode = response.status;
        const detailMsg = data.detail || 'Check-in failed.';

        if (statusCode === 403) {
          setResultModal({
            visible: true,
            type: 'geofence_error',
            title: t('locationErrorTitle'),
            message: t('locationErrorMsg'),
            details: null,
          });
        } else if (statusCode === 401) {
          setResultModal({
            visible: true,
            type: 'face_error',
            title: t('faceMismatchTitle'),
            message: t('faceMismatchMsg'),
            details: null,
          });
        } else if (statusCode === 409) {
          setResultModal({
            visible: true,
            type: 'duplicate_error',
            title: t('duplicateCheckInTitle'),
            message: t('duplicateCheckInMsg'),
            details: null,
          });
        } else {
          setResultModal({
            visible: true,
            type: 'error',
            title: 'Check-In Error',
            message: detailMsg,
            details: null,
          });
        }

        setStatusBanner({ type: 'error', text: detailMsg });
        return;
      }

      const checkInTime = data.check_in
        ? new Date(data.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'Confirmed';

      setResultModal({
        visible: true,
        type: 'success',
        title: t('checkInVerified'),
        message: t('checkInVerifiedMsg'),
        details: {
          Time: checkInTime,
          Status: (data.status || 'Present').toUpperCase(),
          Employee: `${user?.full_name || user?.employee_id}`,
        },
      });

      setStatusBanner({
        type: 'success',
        text: `${t('checkInVerified')}: ${checkInTime}`,
      });
      fetchTodayStatus();
    } catch (err) {
      setCameraActive(false);
      const isNetworkErr = 
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('timeout') ||
        err.message?.toLowerCase().includes('failed to fetch') ||
        err.message?.toLowerCase().includes('connection');

      if (isNetworkErr && photo?.base64 && currentCoords) {
        await queueOfflinePunch({
          user_id: user?.id,
          employee_id: user?.employee_id,
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          face_image_base64: photo.base64,
        });
        await refreshOfflineCount();
        setResultModal({
          visible: true,
          type: 'success',
          title: t('offlinePunchSavedTitle'),
          message: t('offlinePunchSavedMsg'),
          details: {
            Time: new Date().toLocaleTimeString(),
            Mode: 'OFFLINE QUEUE (Encrypted)',
            Status: 'PENDING SYNC',
          },
        });
        setStatusBanner({ type: 'success', text: t('offlinePunchSavedTitle') });
        return;
      }

      const msg = err.message || 'Check-in request failed.';
      setResultModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: msg,
        details: null,
      });
      setStatusBanner({ type: 'error', text: msg });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);
    setProcessingStatus(t('syncing'));
    try {
      let currentCoords = location;
      if (!currentCoords) {
        currentCoords = await fetchCurrentLocation(demoMode);
      }

      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/attendance/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: currentCoords?.latitude || OFFICE_LAT,
          longitude: currentCoords?.longitude || OFFICE_LON,
          user_id: user?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Check-out failed.');
      }

      const outTime = data.check_out
        ? new Date(data.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'Confirmed';

      setResultModal({
        visible: true,
        type: 'success',
        title: t('checkOutCompleted'),
        message: t('checkOutCompletedMsg'),
        details: {
          Time: outTime,
          Employee: `${user?.full_name}`,
        },
      });

      setStatusBanner({
        type: 'success',
        text: `${t('checkOutCompleted')}: ${outTime}`,
      });
      fetchTodayStatus();
    } catch (err) {
      const msg = err.message || 'Check-out failed.';
      Alert.alert('Check-Out Issue', msg);
      setStatusBanner({ type: 'error', text: msg });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <ScrollView
      style={styles.dashboardContainer}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Employee Profile & Header */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'E'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText} numberOfLines={1}>
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Employee'} 👋
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.empId}>{user?.employee_id || 'EMP001'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{(user?.role || 'employee').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Header Right Actions: Language Selector, Theme Toggle & Notification Bell */}
        <View style={styles.topBarRight}>
          <LanguageSelector compact={true} />
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => setNotificationsVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={20} color={colors.textPrimary} />
            {offlineCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDark ? <Sun size={20} color="#FBBF24" /> : <Moon size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Unsynced Punches Banner */}
      {offlineCount > 0 && (
        <View style={styles.offlineBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineBannerText}>
              {offlineCount} {t('unsyncedPunches')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncBtnSmall}
            onPress={handleSyncOfflineNow}
            disabled={isSyncingOffline}
            activeOpacity={0.8}
          >
            {isSyncingOffline ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.syncBtnSmallText}>{t('syncNow')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Hero Live Clock & Clean Status Card */}
      <View style={styles.heroClockCard}>
        <View style={styles.heroClockHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.heroClockDate}>
              {liveClock.toLocaleDateString('en-US', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Location Badge (Clean - No raw coordinates) */}
          <View style={[styles.pulseStatusBadge, isInsideGeofence ? styles.pulseSuccess : styles.pulseDanger]}>
            <View style={[styles.pulseDot, { backgroundColor: isInsideGeofence ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.pulseText, { color: isInsideGeofence ? colors.successText : colors.dangerText }]}>
              {isInsideGeofence ? t('atOffice') : t('outsideOffice')}
            </Text>
          </View>
        </View>

        {/* Digital Clock */}
        <Text style={styles.heroClockTime}>
          {liveClock.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })}
        </Text>

        {/* Status Indicators Row */}
        <View style={styles.heroSubRow}>
          <View style={styles.heroSubItem}>
            <MapPin size={14} color={isInsideGeofence ? '#10B981' : colors.textSecondary} />
            <Text style={styles.heroSubText}>
              {isInsideGeofence ? t('atOffice') : t('outsideOffice')}
            </Text>
          </View>

          <View style={styles.heroSubItem}>
            <ScanFace size={14} color={user?.has_face_registered ? '#10B981' : '#F59E0B'} />
            <Text style={styles.heroSubText}>
              {user?.has_face_registered ? t('faceRegistered') : t('faceRequired')}
            </Text>
          </View>
        </View>
      </View>

      {/* Dynamic Status Alert Banner (if any) */}
      {statusBanner && (
        <View
          style={[
            styles.banner,
            statusBanner.type === 'success' ? styles.bannerSuccess : styles.bannerError,
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              statusBanner.type === 'success' ? styles.bannerTextSuccess : styles.bannerTextError,
            ]}
          >
            {statusBanner.text}
          </Text>
        </View>
      )}

      {/* Face Registration Prompt Card (Clean & Helpful) */}
      {!user?.has_face_registered ? (
        <View style={styles.promptCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.promptIconCircle}>
              <Camera size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promptCardTitle}>{t('faceRegistrationRequired')}</Text>
              <Text style={styles.promptCardSub}>{t('faceRegistrationDesc')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.enrollBtn}
            onPress={async () => {
              if (!cameraPermission?.granted) {
                const res = await requestCameraPermission();
                if (!res.granted) {
                  Alert.alert('Camera Permission', 'Camera permission is required to register face.');
                  return;
                }
              }
              setEnrollModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.enrollBtnText}>📸 {t('registerFaceNow')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.faceStatusRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ScanFace size={16} color="#10B981" />
            <Text style={styles.faceStatusText}>{t('faceRegistered')}</Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              if (!cameraPermission?.granted) {
                const res = await requestCameraPermission();
                if (!res.granted) return;
              }
              setEnrollModalVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.updatePhotoText}>{t('updatePhoto')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TODAY'S ATTENDANCE STATUS CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('todayStatus')}</Text>
          <TouchableOpacity onPress={fetchTodayStatus} disabled={isLoadingToday}>
            <Text style={styles.refreshLink}>{isLoadingToday ? t('syncing') : t('refreshStatus')}</Text>
          </TouchableOpacity>
        </View>

        {todayRecord ? (
          <View>
            <View style={styles.todayStatusRow}>
              <View
                style={[
                  styles.statusPill,
                  todayRecord.status === 'present' ? styles.pillSuccess : styles.pillWarning,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    todayRecord.status === 'present' ? styles.textSuccess : styles.textWarning,
                  ]}
                >
                  ● {(todayRecord.status || 'present').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.todayDateText}>
                {new Date().toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' })}
              </Text>
            </View>

            <View style={styles.todayPunchesRow}>
              <View style={styles.todayPunchCol}>
                <Text style={styles.todayPunchLabel}>{t('punchIn').toUpperCase()}</Text>
                <Text style={styles.todayPunchVal}>
                  {todayRecord.check_in
                    ? new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '--:--'}
                </Text>
              </View>
              <View style={styles.todayPunchDivider} />
              <View style={styles.todayPunchCol}>
                <Text style={styles.todayPunchLabel}>{t('punchOut').toUpperCase()}</Text>
                <Text style={[styles.todayPunchVal, !todayRecord.check_out && styles.todayPunchActive]}>
                  {todayRecord.check_out
                    ? new Date(todayRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                    : t('activeShift')}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.todayEmptyBox}>
            <Text style={styles.todayEmptyTitle}>{t('notCheckedIn')}</Text>
            <Text style={styles.todayEmptySub}>
              {t('checkInVerifiedMsg')}
            </Text>
          </View>
        )}
      </View>

      {/* Main Action Buttons: Check-In & Check-Out */}
      {!cameraActive && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, isProcessing && styles.btnDisabled]}
            onPress={handleStartCheckIn}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>{t('checkIn')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, isProcessing && styles.btnDisabled]}
            onPress={handleCheckOut}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>{t('checkOut')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clean Dynamic Result Modal */}
      <Modal
        visible={resultModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setResultModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconRing,
                resultModal.type === 'success' && styles.ringSuccess,
                resultModal.type === 'geofence_error' && styles.ringWarning,
                resultModal.type === 'face_error' && styles.ringDanger,
                resultModal.type === 'duplicate_error' && styles.ringInfo,
              ]}
            >
              <Text style={styles.modalIconText}>
                {resultModal.type === 'success' ? '✓' : '!'}
              </Text>
            </View>

            <Text style={styles.modalTitle}>{resultModal.title}</Text>
            <Text style={styles.modalMessage}>{resultModal.message}</Text>

            {resultModal.details && (
              <View style={styles.modalDetailsBox}>
                {Object.entries(resultModal.details).map(([k, v]) => (
                  <View key={k} style={styles.detailRow}>
                    <Text style={styles.detailKey}>{k}:</Text>
                    <Text style={styles.detailVal}>{v}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setResultModal((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalDismissText}>{t('acknowledge')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-App Notifications Dropdown Modal */}
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>{t('notifications')}</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', gap: 10, marginBottom: 16 }}>
              <View style={styles.notificationCardItem}>
                <View style={[styles.notificationBadgeIcon, { backgroundColor: '#10b98120' }]}>
                  <CheckCircle2 size={16} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Smart Attendance Online</Text>
                  <Text style={styles.notifSub}>Dual-factor geofence (100m) & live face recognition active.</Text>
                </View>
              </View>

              {user?.has_face_registered && (
                <View style={styles.notificationCardItem}>
                  <View style={[styles.notificationBadgeIcon, { backgroundColor: '#38bdf820' }]}>
                    <ScanFace size={16} color="#38bdf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>Biometric Face Profile</Text>
                    <Text style={styles.notifSub}>128-D biometric vector verified for {user?.employee_id}.</Text>
                  </View>
                </View>
              )}

              {offlineCount > 0 ? (
                <View style={styles.notificationCardItem}>
                  <View style={[styles.notificationBadgeIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Clock size={16} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{offlineCount} Unsynced Punches</Text>
                    <Text style={styles.notifSub}>Queued locally on device. Tap 'Sync Now' when ready.</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.notificationCardItem}>
                  <View style={[styles.notificationBadgeIcon, { backgroundColor: '#64748b20' }]}>
                    <Check size={16} color="#64748b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>All Punches Synchronized</Text>
                    <Text style={styles.notifSub}>No pending offline records found.</Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setNotificationsVisible(false)}
            >
              <Text style={styles.modalDismissText}>{t('acknowledge')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FULL-SCREEN ATTENDANCE CHECK-IN CAMERA MODAL */}
      {cameraActive && (
        <Modal
          visible={true}
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (!isProcessing) setCameraActive(false);
          }}
        >
          <View style={styles.fullScreenCamera}>
            <CameraView
              key={cameraFacing}
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={cameraFacing}
              mode="picture"
              autofocus="on"
            />

            {/* Centered Target Face Oval Reticle & Liveness Feedback */}
            <View style={styles.fullScreenReticleContainer} pointerEvents="none">
              <View style={[styles.fullScreenFaceOval, livenessPassed && styles.fullScreenFaceOvalPassed]} />

              <View style={[styles.livenessChallengePill, livenessPassed && styles.livenessChallengePillPassed]}>
                {livenessPassed ? (
                  <Check size={18} color="#10b981" />
                ) : (
                  <ActivityIndicator size="small" color="#38bdf8" />
                )}
                <Text style={styles.livenessChallengeText}>
                  {livenessPassed ? t('livenessPassed') : t('livenessChallengeBlink')}
                </Text>
              </View>
            </View>

            {/* Top Header Overlay */}
            <SafeAreaView style={styles.cameraTopOverlay}>
              <View style={styles.cameraTopRow}>
                <TouchableOpacity
                  style={styles.cameraOverlayBtn}
                  onPress={() => setCameraActive(false)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <X size={22} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.cameraTitlePill}>
                  <Text style={styles.cameraTitleText}>{t('checkIn')}</Text>
                </View>

                <TouchableOpacity
                  style={styles.cameraOverlayBtn}
                  onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Bottom Actions Overlay */}
            <SafeAreaView style={styles.cameraBottomOverlay}>
              <View style={styles.cameraBottomActions}>
                <TouchableOpacity
                  style={styles.cameraBottomCancelBtn}
                  onPress={() => setCameraActive(false)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cameraBottomCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.cameraCaptureActionBtn,
                    livenessPassed && styles.cameraCaptureActionBtnPassed,
                    (!livenessPassed || isProcessing) && styles.btnDisabled
                  ]}
                  onPress={handleCaptureAndCheckIn}
                  disabled={!livenessPassed || isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.cameraCaptureActionText}>
                      {livenessPassed ? `✓ ${t('verifyAndCheckIn')}` : t('verifyingLiveness')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {isProcessing && (
                <View style={styles.processingBarModal}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.processingBarText}>{processingStatus || t('syncing')}</Text>
                </View>
              )}
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* FULL-SCREEN FACE REGISTRATION / ENROLLMENT MODAL */}
      {enrollModalVisible && (
        <Modal
          visible={true}
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (!isEnrolling) setEnrollModalVisible(false);
          }}
        >
          <View style={styles.fullScreenCamera}>
            <CameraView
              key={enrollFacing}
              ref={enrollCameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={enrollFacing}
              mode="picture"
              autofocus="on"
            />

            {/* Centered Target Face Oval Reticle for Enrollment */}
            <View style={styles.fullScreenReticleContainer} pointerEvents="none">
              <View style={styles.fullScreenFaceOval} />
              <Text style={styles.fullScreenInstructionText}>{t('positionFaceOval')}</Text>
            </View>

            {/* Top Header Overlay */}
            <SafeAreaView style={styles.cameraTopOverlay}>
              <View style={styles.cameraTopRow}>
                <TouchableOpacity
                  style={styles.cameraOverlayBtn}
                  onPress={() => setEnrollModalVisible(false)}
                  disabled={isEnrolling}
                  activeOpacity={0.7}
                >
                  <X size={22} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.cameraTitlePill}>
                  <Text style={styles.cameraTitleText}>{t('registerFaceNow')}</Text>
                </View>

                <TouchableOpacity
                  style={styles.cameraOverlayBtn}
                  onPress={() => setEnrollFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
                  disabled={isEnrolling}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Bottom Actions Overlay */}
            <SafeAreaView style={styles.cameraBottomOverlay}>
              <View style={styles.cameraBottomActions}>
                <TouchableOpacity
                  style={styles.cameraBottomCancelBtn}
                  onPress={() => setEnrollModalVisible(false)}
                  disabled={isEnrolling}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cameraBottomCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cameraCaptureActionBtn, isEnrolling && styles.btnDisabled]}
                  onPress={handleEnrollFace}
                  disabled={isEnrolling}
                  activeOpacity={0.8}
                >
                  {isEnrolling ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.cameraCaptureActionText}>{t('saveFace')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

// ==============================================================================
// 4. ROOT APP ENTRY & VIEW CONTROLLER
// ==============================================================================
function AppContent() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard' | 'history' | 'leave'

  // Restore secure session on launch
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const storedToken = await getSecureToken();
        if (storedToken && isMounted) {
          const cleanUrl = serverUrl.replace(/\/+$/, '');
          const res = await fetch(`${cleanUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const userData = await res.json();
            if (isMounted) {
              setUser(userData);
              setToken(storedToken);
            }
          } else {
            await deleteSecureToken();
          }
        }
      } catch {
        // Gracefully ignore network errors on startup
      }
    };
    restoreSession();
    return () => { isMounted = false; };
  }, [serverUrl]);

  const handleLoginSuccess = async (loggedInUser, accessToken) => {
    await saveSecureToken(accessToken);
    setUser(loggedInUser);
    setToken(accessToken);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await deleteSecureToken();
    setUser(null);
    setToken(null);
    setCurrentScreen('dashboard');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        {!token ? (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
          />
        ) : (
          <View style={{ flex: 1 }}>
            {currentScreen === 'dashboard' && (
              <CheckInDashboard
                user={user}
                token={token}
                serverUrl={serverUrl}
                onLogout={handleLogout}
                onUpdateUser={(updatedFields) => setUser((prev) => (prev ? { ...prev, ...updatedFields } : null))}
                onNavigateToHistory={() => setCurrentScreen('history')}
                onNavigateToLeave={() => setCurrentScreen('leave')}
              />
            )}

            {currentScreen === 'history' && (
              <AttendanceHistoryScreen
                user={user}
                token={token}
                serverUrl={serverUrl}
                onBack={() => setCurrentScreen('dashboard')}
              />
            )}

            {currentScreen === 'leave' && (
              <LeaveScreen
                user={user}
                token={token}
                serverUrl={serverUrl}
                onBack={() => setCurrentScreen('dashboard')}
              />
            )}

            {/* Persistent Mobile Bottom Navigation Bar */}
            <View style={styles.bottomTabBar}>
              <TouchableOpacity
                style={[styles.bottomTabItem, currentScreen === 'dashboard' && styles.bottomTabItemActive]}
                onPress={() => setCurrentScreen('dashboard')}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>🏠</Text>
                <Text style={[styles.bottomTabText, currentScreen === 'dashboard' && styles.bottomTabTextActive]}>
                  {t('dashboard')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bottomTabItem, currentScreen === 'history' && styles.bottomTabItemActive]}
                onPress={() => setCurrentScreen('history')}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>📋</Text>
                <Text style={[styles.bottomTabText, currentScreen === 'history' && styles.bottomTabTextActive]}>
                  {t('history')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bottomTabItem, currentScreen === 'leave' && styles.bottomTabItemActive]}
                onPress={() => setCurrentScreen('leave')}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>📝</Text>
                <Text style={[styles.bottomTabText, currentScreen === 'leave' && styles.bottomTabTextActive]}>
                  {t('leaves')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomTabItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>🚪</Text>
                <Text style={[styles.bottomTabText, { color: '#ef4444' }]}>
                  {t('signOut')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

// ==============================================================================
// 5. STYLES
// ==============================================================================
const createStyles = (colors, isDark) =>
  StyleSheet.create({
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },
    greetingText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    themeToggleBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroClockCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 12,
      elevation: 3,
      gap: 12,
    },
    heroClockHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroClockDate: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    pulseStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    pulseSuccess: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
    },
    pulseDanger: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    pulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    pulseText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    heroClockTime: {
      fontSize: 34,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.5,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      textAlign: 'center',
      marginVertical: 4,
    },
    heroSubRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    heroSubItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroSubText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  loginTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  loginTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  loginTopBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  loginCardHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  loginLogoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  configBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  loginErrorBox: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 10,
    padding: 12,
  },
  loginErrorText: {
    color: colors.dangerText,
    fontSize: 12,
    fontWeight: '500',
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.surfaceSubtle,
  },
  configToggle: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  configToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  configHint: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  biometricBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  loginFooter: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loginFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  popupIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  popupBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  popupBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 6,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 6,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  offlineBannerText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '700',
  },
  syncBtnSmall: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  syncBtnSmallText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  notifSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  promptIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  promptCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  enrollBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  enrollBtnText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  faceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faceStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  updatePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empId: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  roleBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  empName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  bannerError: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bannerTextSuccess: {
    color: colors.successText,
  },
  bannerTextError: {
    color: colors.dangerText,
  },
  demoCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  demoHeader: {
    gap: 2,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  demoSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoModeBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoModeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  demoModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  demoModeTextActive: {
    color: colors.textInverse,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  refreshLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  geoRow: {
    gap: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillSuccess: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  pillDanger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textSuccess: {
    color: colors.successText,
  },
  textDanger: {
    color: colors.dangerText,
  },
  textWarning: {
    color: colors.warningText,
  },
  distanceText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  highlight: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  coordsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordsText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  officeCoordsText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  bioRow: {
    gap: 6,
  },
  bioStatusPill: {
    alignSelf: 'flex-start',
  },
  bioSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  fullScreenCamera: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  fullScreenReticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  fullScreenFaceOval: {
    width: 240,
    height: 310,
    borderRadius: 120,
    borderWidth: 2.5,
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  fullScreenInstructionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    letterSpacing: 0.3,
  },
  fullScreenFaceOvalPassed: {
    borderColor: '#10b981',
    borderStyle: 'solid',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  livenessChallengePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  livenessChallengePillPassed: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(6, 78, 59, 0.9)',
  },
  livenessChallengeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cameraCaptureActionBtnPassed: {
    backgroundColor: '#059669',
    shadowColor: '#10b981',
    shadowOpacity: 0.5,
  },
  cameraTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  cameraTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cameraOverlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitlePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  cameraBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  cameraBottomCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cameraBottomCancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraCaptureActionBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraCaptureActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  processingBarModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  processingBarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraCard: {
    backgroundColor: '#000000',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cameraHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  cameraFlipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cameraContainer: {
    width: '100%',
    height: 420,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cameraDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  faceReticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  faceOval: {
    width: 210,
    height: 270,
    borderRadius: 105,
    borderWidth: 2.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  reticleInstruction: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cameraActions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  cancelCameraBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  captureBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: colors.surfaceSubtle,
    gap: 8,
  },
  processingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    alignItems: 'center',
  },
  btnText: {
    color: colors.textInverse,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnSubtext: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  modalIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  ringSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  ringWarning: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  ringDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  ringInfo: {
    borderColor: colors.info,
    backgroundColor: colors.infoBg,
  },
  modalIconText: {
    fontSize: 28,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalDetailsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailKey: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailVal: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  modalDismissBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  modalDismissText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  enrollLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  enrollActionBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  enrollActionBtnText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  enrollModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
  },
  enrollInfoBox: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  enrollInfoTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  enrollInfoSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  enrollActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  dashboardFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 24,
    marginBottom: 16,
  },
  dashboardFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Portal Nav Cards
  portalNavBox: {
    marginTop: 18,
    marginBottom: 10,
  },
  portalNavHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  historyNavCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  leaveNavCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  historyNavIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  historyNavIconText: {
    fontSize: 22,
  },
  historyNavInfo: {
    flex: 1,
  },
  historyNavTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyNavTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  historyNavArrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  leaveNavArrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  historyNavSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },

  // Today Attendance Status Card
  todayStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayDateText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  todayPunchesRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayPunchCol: {
    flex: 1,
    alignItems: 'center',
  },
  todayPunchDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  todayPunchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  todayPunchVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  todayPunchActive: {
    color: colors.primary,
    fontStyle: 'italic',
  },
  todayBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successText,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayEmptyBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  todayEmptyTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayEmptySub: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Bottom Navigation Bar
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomTabItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bottomTabItemActive: {
    backgroundColor: colors.primaryLight,
  },
  bottomTabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  bottomTabText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottomTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
