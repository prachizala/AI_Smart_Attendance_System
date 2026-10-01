import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import LeaveScreen from './src/screens/LeaveScreen';
import { saveSecureToken, getSecureToken, deleteSecureToken } from './src/utils/secureStorage';

// ==============================================================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ==============================================================================
// Office Geofence Target: SBS Shanti Business School, Shela, Ahmedabad, Gujarat 380058
const OFFICE_LAT = 23.002217;
const OFFICE_LON = 72.455763;
const GEOFENCE_RADIUS = 100.0; // Allowed radius in meters

// Default backend API URL configured for local Wi-Fi LAN IP (10.115.36.66)
const LAN_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.115.36.66:8000';
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
  const [identifier, setIdentifier] = useState('EMP001');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter both Employee ID and password.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      let response;
      let activeUrl = cleanUrl;

      try {
        response = await fetch(`${cleanUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: identifier.trim(),
            password: password.trim(),
          }),
        });
      } catch (netErr) {
        // If port 8000 is unreachable due to firewall/router restrictions, fallback to port 3000 proxy
        if (cleanUrl.includes(':8000')) {
          const fallbackUrl = cleanUrl.replace(':8000', ':3000');
          try {
            response = await fetch(`${fallbackUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identifier: identifier.trim(),
                password: password.trim(),
              }),
            });
            activeUrl = fallbackUrl;
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

      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      setErrorMsg(err.message || 'Connection error. Check server URL and network.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.loginScroll}>
        <View style={styles.loginCard}>
          {/* Header */}
          <View style={styles.loginHeader}>
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>DUAL-FACTOR BIOMETRIC SYSTEM</Text>
            </View>
            <Text style={styles.loginTitle}>AI Smart Attendance</Text>
            <Text style={styles.loginSubtitle}>
              Workforce verification via Facial Biometrics & GPS Geofencing
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.loginErrorBox}>
              <Text style={styles.loginErrorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Employee ID or Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. EMP001"
              placeholderTextColor="#64748b"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Server Config Accordion (Essential for phone testing via Wi-Fi IP) */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? '▼ Hide Server Settings' : '⚙ Configure Server IP for Demo'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>FastAPI Server URL</Text>
              <TextInput
                style={[styles.textInput, styles.monoInput]}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.configHint}>
                * Direct FastAPI Backend: http://10.115.36.66:8000{'\n'}
                * Vite Proxy Backend: http://10.115.36.66:3000{'\n'}
                * Android Emulator: http://10.0.2.2:8000
              </Text>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In to Workstation</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginFooter}>
            <Text style={styles.loginFooterText}>
              College Minor Project BCA (Bachelor of Computer Applications)
            </Text>
          </View>
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

  // Dynamic Feedback Banner & Modal
  const [statusBanner, setStatusBanner] = useState(null);
  const [resultModal, setResultModal] = useState({
    visible: false,
    type: 'success', // 'success' | 'geofence_error' | 'face_error' | 'duplicate_error' | 'error'
    title: '',
    message: '',
    details: null,
  });

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
        'Face Profile Saved',
        `128-D biometric profile successfully registered for ${user?.full_name} (${user?.employee_id}). You can now perform attendance check-in.`,
        [{ text: 'Proceed to Check-In' }]
      );
      setStatusBanner({
        type: 'success',
        text: 'Biometric profile registered successfully! Ready for attendance check-in.',
      });
    } catch (err) {
      Alert.alert('Registration Issue', err.message || 'Face detection failed. Ensure exactly 1 face is clearly visible.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Acquire high-precision GPS coordinates from device hardware
  const fetchCurrentLocation = async (mode = demoMode) => {
    setIsLocating(true);
    try {
      if (mode === 'mock_inside') {
        const mockCoords = { latitude: 23.002220, longitude: 72.455770 }; // ~1.5m from SBS center
        setLocation(mockCoords);
        const d = calculateHaversine(mockCoords.latitude, mockCoords.longitude, OFFICE_LAT, OFFICE_LON);
        setDistance(d);
        setIsInsideGeofence(d <= GEOFENCE_RADIUS);
        return mockCoords;
      } else if (mode === 'mock_outside') {
        const mockCoords = { latitude: 23.020000, longitude: 72.490000 }; // ~3.8 km outside SBS geofence
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
          text: 'Location permission denied. GPS geofence verification is required.',
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
        text: 'GPS Sensor Error: ' + (err.message || 'Failed to read coordinates.'),
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

  // DOMAINS 1 & 2 SIMULTANEOUS TRIGGER:
  // Starts acquiring high-precision GPS AND opens the Camera Viewfinder concurrently
  const handleStartCheckIn = async () => {
    if (!user?.has_face_registered) {
      Alert.alert(
        'Biometric Profile Required',
        'You have not registered your biometric face reference yet. Would you like to enroll your face profile now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enroll Face Now',
            onPress: async () => {
              if (!cameraPermission?.granted) {
                const res = await requestCameraPermission();
                if (!res.granted) {
                  Alert.alert('Camera Access Required', 'Camera permission is required for face enrollment.');
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
          'Dual-factor verification requires camera permission to capture live biometrics.'
        );
        return;
      }
    }

    setStatusBanner(null);

    // 1. Concurrently trigger background GPS location refresh
    fetchCurrentLocation(demoMode);

    // 2. Concurrently open the Camera Viewfinder for face alignment
    setCameraActive(true);
  };

  // DOMAIN 3: CHECK-IN API REQUEST WITH BEARER TOKEN AND DYNAMIC UI ALERTS
  const handleCaptureAndCheckIn = async () => {
    if (!cameraRef.current) return;

    setIsProcessing(true);
    setProcessingStatus('Capturing biometric frame...');

    try {
      // 1. Capture base64 image from device camera optimized for fast API upload
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6, // Lightweight payload for fast upload + OpenCV facial clarity
        skipProcessing: false,
      });

      setCameraActive(false);

      // 2. Ensure high-accuracy GPS coordinates are ready
      setProcessingStatus('Locking GPS coordinates...');
      let currentCoords = location;
      if (!currentCoords) {
        currentCoords = await fetchCurrentLocation(demoMode);
      }

      if (!currentCoords) {
        throw new Error('Could not acquire valid GPS fix. Ensure location services are enabled.');
      }

      // 3. Dispatch POST request with Authorization: Bearer <token>
      setProcessingStatus('Verifying face and geofence with AI server...');
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

      // Dynamic Error Handling based on Exact HTTP Status Codes
      if (!response.ok) {
        const statusCode = response.status;
        const detailMsg = data.detail || 'Check-in failed.';

        if (statusCode === 403) {
          // Geofence Perimeter Violation
          setResultModal({
            visible: true,
            type: 'geofence_error',
            title: 'Geofence Perimeter Violation (403)',
            message: detailMsg,
            details: {
              Reason: 'Device is physically located outside the 100-meter office perimeter.',
              Office: `Campus HQ (${OFFICE_LAT} N, ${OFFICE_LON} E)`,
              'Tip for Viva': 'Use the Viva Demo Toggle above to test inside vs outside.',
            },
          });
        } else if (statusCode === 401) {
          // Biometric Face Mismatch
          setResultModal({
            visible: true,
            type: 'face_error',
            title: 'Biometric Face Mismatch (401)',
            message: detailMsg,
            details: {
              Reason: 'Live camera selfie does not match the enrolled 128-D biometric profile.',
              Action: 'Ensure good lighting and hold face steady inside the oval frame.',
            },
          });
        } else if (statusCode === 409) {
          // Anti-Duplicate Daily Punch Rule
          setResultModal({
            visible: true,
            type: 'duplicate_error',
            title: 'Duplicate Punch Blocked (409)',
            message: detailMsg,
            details: {
              Rule: 'Daily attendance has already been logged for today.',
            },
          });
        } else {
          // Generic Error
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

      // HTTP 200 OK: Attendance Verified
      const checkInTime = data.check_in
        ? new Date(data.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Confirmed';

      setResultModal({
        visible: true,
        type: 'success',
        title: 'Check-In Verified!',
        message: `Attendance successfully recorded as ${data.status.toUpperCase()}.\nBoth Geofence and Facial Biometrics verified.`,
        details: {
          Time: checkInTime,
          Status: data.status.toUpperCase(),
          Employee: `${user?.full_name} (${user?.employee_id})`,
          Distance: `${data.distance_meters?.toFixed(1) || distance || 0}m to Office HQ`,
        },
      });

      setStatusBanner({
        type: 'success',
        text: `Checked in successfully as ${data.status.toUpperCase()} at ${checkInTime}`,
      });
      fetchTodayStatus();
    } catch (err) {
      setCameraActive(false);
      const msg = err.message || 'Check-in request failed.';
      setResultModal({
        visible: true,
        type: 'error',
        title: 'Network / Verification Error',
        message: msg,
        details: null,
      });
      setStatusBanner({ type: 'error', text: msg });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Check-Out handler with location re-verification
  const handleCheckOut = async () => {
    setIsProcessing(true);
    setProcessingStatus('Verifying location for Check-Out...');
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
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          user_id: user?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Check-out failed.');
      }

      const outTime = data.check_out
        ? new Date(data.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Confirmed';

      setResultModal({
        visible: true,
        type: 'success',
        title: 'Check-Out Completed',
        message: `Shift ended successfully at ${outTime}. Have a great evening!`,
        details: {
          Time: outTime,
          Employee: `${user?.full_name}`,
        },
      });

      setStatusBanner({
        type: 'success',
        text: `Checked out at ${outTime}`,
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
    <ScrollView style={styles.dashboardContainer} contentContainerStyle={styles.scroll}>
      {/* Top Employee Profile Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.badgeRow}>
            <Text style={styles.empId}>{user?.employee_id || 'EMP001'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{(user?.role || 'employee').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.empName}>{user?.full_name || 'Workforce Member'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Status Alert Banner */}
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

      {/* VIVA DEMO GPS SIMULATOR (Negative & Positive Test Showcase) */}
      <View style={styles.demoCard}>
        <View style={styles.demoHeader}>
          <Text style={styles.demoTitle}>🎯 Viva Demo GPS Simulator</Text>
          <Text style={styles.demoSubtitle}>Demonstrate geofencing without physically traveling</Text>
        </View>
        <View style={styles.demoBtnRow}>
          <TouchableOpacity
            style={[styles.demoModeBtn, demoMode === 'real' && styles.demoModeBtnActive]}
            onPress={() => {
              setDemoMode('real');
              fetchCurrentLocation('real');
            }}
          >
            <Text style={[styles.demoModeText, demoMode === 'real' && styles.demoModeTextActive]}>
              📱 Real GPS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoModeBtn, demoMode === 'mock_inside' && styles.demoModeBtnActive]}
            onPress={() => {
              setDemoMode('mock_inside');
              fetchCurrentLocation('mock_inside');
            }}
          >
            <Text style={[styles.demoModeText, demoMode === 'mock_inside' && styles.demoModeTextActive]}>
              ✅ Inside (Pass)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoModeBtn, demoMode === 'mock_outside' && styles.demoModeBtnActive]}
            onPress={() => {
              setDemoMode('mock_outside');
              fetchCurrentLocation('mock_outside');
            }}
          >
            <Text style={[styles.demoModeText, demoMode === 'mock_outside' && styles.demoModeTextActive]}>
              🚫 Outside (403)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GPS Geofence Perimeter Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>GPS Geofence Perimeter</Text>
          <TouchableOpacity onPress={() => fetchCurrentLocation(demoMode)} disabled={isLocating}>
            <Text style={styles.refreshLink}>{isLocating ? 'Syncing...' : 'Refresh GPS'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.geoRow}>
          <View
            style={[
              styles.statusPill,
              isInsideGeofence ? styles.pillSuccess : styles.pillDanger,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isInsideGeofence ? styles.textSuccess : styles.textDanger,
              ]}
            >
              {isInsideGeofence ? '● INSIDE OFFICE PERIMETER' : '● OUTSIDE OFFICE PERIMETER'}
            </Text>
          </View>

          <Text style={styles.distanceText}>
            Distance to HQ: <Text style={styles.highlight}>{distance !== null ? `${distance} m` : 'Acquiring...'}</Text> (Max allowed: {GEOFENCE_RADIUS}m)
          </Text>
        </View>

        {location && (
          <View style={styles.coordsBox}>
            <Text style={styles.coordsText}>
              Lat: {location.latitude.toFixed(6)} | Lon: {location.longitude.toFixed(6)}
            </Text>
            <Text style={styles.officeCoordsText}>
              Campus HQ: {OFFICE_LAT} N, {OFFICE_LON} E (SBS Shanti Business School, Shela, Ahmedabad)
            </Text>
          </View>
        )}
      </View>

      {/* Biometric Face Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Biometric Face Profile</Text>
          {!user?.has_face_registered && (
            <TouchableOpacity
              onPress={async () => {
                if (!cameraPermission?.granted) {
                  const res = await requestCameraPermission();
                  if (!res.granted) {
                    Alert.alert('Camera Access Required', 'Camera permission is required for face enrollment.');
                    return;
                  }
                }
                setEnrollModalVisible(true);
              }}
            >
              <Text style={styles.enrollLink}>+ Enroll Face</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.bioRow}>
          <View style={styles.bioStatusPill}>
            <Text style={user?.has_face_registered ? styles.textSuccess : styles.textWarning}>
              {user?.has_face_registered ? '✓ 128-D Vector Ready' : '⚠ No Biometrics Enrolled'}
            </Text>
          </View>
          <Text style={styles.bioSubtext}>
            {user?.has_face_registered
              ? 'Stored in database for real-time Euclidean distance matching (threshold <= 0.50).'
              : 'Register face photo before attempting attendance check-in.'}
          </Text>
        </View>
        {!user?.has_face_registered && (
          <TouchableOpacity
            style={styles.enrollActionBtn}
            onPress={async () => {
              if (!cameraPermission?.granted) {
                const res = await requestCameraPermission();
                if (!res.granted) {
                  Alert.alert('Camera Access Required', 'Camera permission is required for face enrollment.');
                  return;
                }
              }
              setEnrollModalVisible(true);
            }}
          >
            <Text style={styles.enrollActionBtnText}>📸 Capture & Enroll Biometric Face</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Live Camera Viewfinder Overlay for Check-In */}
      {cameraActive && (
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderTitle}>Biometric Face Verification</Text>
            <TouchableOpacity
              onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
            >
              <Text style={styles.cameraFlipText}>Flip Camera</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraFacing}
            />

            {/* Subtle dark overlay behind guide */}
            <View style={styles.cameraDarkOverlay} pointerEvents="none" />

            {/* Target Face Oval Reticle */}
            <View style={styles.faceReticleContainer} pointerEvents="none">
              <View style={styles.faceOval} />
              <Text style={styles.reticleInstruction}>Position face within the oval</Text>
            </View>

            {/* Viewfinder Controls */}
            <View style={styles.cameraActions}>
              <TouchableOpacity
                style={styles.cancelCameraBtn}
                onPress={() => setCameraActive(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureBtn, isProcessing && styles.btnDisabled]}
                onPress={handleCaptureAndCheckIn}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.captureText}>Verify & Check-In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isProcessing && (
            <View style={styles.processingBar}>
              <ActivityIndicator color="#38bdf8" size="small" />
              <Text style={styles.processingText}>{processingStatus}</Text>
            </View>
          )}
        </View>
      )}

      {/* TODAY'S ATTENDANCE STATUS CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Attendance Status</Text>
          <TouchableOpacity onPress={fetchTodayStatus} disabled={isLoadingToday}>
            <Text style={styles.refreshLink}>{isLoadingToday ? 'Syncing...' : 'Refresh Status'}</Text>
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
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
              </Text>
            </View>

            <View style={styles.todayPunchesRow}>
              <View style={styles.todayPunchCol}>
                <Text style={styles.todayPunchLabel}>PUNCH IN</Text>
                <Text style={styles.todayPunchVal}>
                  {todayRecord.check_in
                    ? new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '--:--'}
                </Text>
              </View>
              <View style={styles.todayPunchDivider} />
              <View style={styles.todayPunchCol}>
                <Text style={styles.todayPunchLabel}>PUNCH OUT</Text>
                <Text style={[styles.todayPunchVal, !todayRecord.check_out && styles.todayPunchActive]}>
                  {todayRecord.check_out
                    ? new Date(todayRecord.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'Active Shift'}
                </Text>
              </View>
            </View>

            <View style={styles.todayBadgeRow}>
              <Text style={styles.todayBadgeText}>
                {todayRecord.face_verified ? '✓ Face Biometrics Verified' : '✗ Face Unverified'}
              </Text>
              <Text style={styles.todayBadgeText}>
                {todayRecord.location_verified
                  ? `✓ GPS Perimeter (${todayRecord.distance_meters !== null && todayRecord.distance_meters !== undefined ? `${todayRecord.distance_meters.toFixed(1)}m` : '0m'})`
                  : '✗ Outside Perimeter'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.todayEmptyBox}>
            <Text style={styles.todayEmptyTitle}>No punch recorded today yet</Text>
            <Text style={styles.todayEmptySub}>
              Use the Punch Check-In button below with live camera inside SBS Shanti Business School perimeter.
            </Text>
          </View>
        )}
      </View>

      {/* Main Action Buttons */}
      {!cameraActive && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, isProcessing && styles.btnDisabled]}
            onPress={handleStartCheckIn}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>Punch Check-In</Text>
                <Text style={styles.btnSubtext}>Dual-Factor Biometrics + GPS Geofencing</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, isProcessing && styles.btnDisabled]}
            onPress={handleCheckOut}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryBtnText}>Punch Check-Out (End Shift)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QUICK PORTAL NAVIGATION CARDS */}
      {!cameraActive && (
        <View style={styles.portalNavBox}>
          <Text style={styles.portalNavHeader}>Employee Portal</Text>

          <TouchableOpacity
            style={styles.historyNavCard}
            onPress={onNavigateToHistory}
            activeOpacity={0.8}
          >
            <View style={styles.historyNavIconCircle}>
              <Text style={styles.historyNavIconText}>📋</Text>
            </View>
            <View style={styles.historyNavInfo}>
              <View style={styles.historyNavTitleRow}>
                <Text style={styles.historyNavTitle}>Attendance History</Text>
                <Text style={styles.historyNavArrow}>View Logs →</Text>
              </View>
              <Text style={styles.historyNavSub}>
                Inspect historical attendance records, timestamps, late arrivals & geofence telemetry
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.leaveNavCard}
            onPress={onNavigateToLeave}
            activeOpacity={0.8}
          >
            <View style={[styles.historyNavIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Text style={styles.historyNavIconText}>📝</Text>
            </View>
            <View style={styles.historyNavInfo}>
              <View style={styles.historyNavTitleRow}>
                <Text style={styles.historyNavTitle}>Leave Management</Text>
                <Text style={styles.leaveNavArrow}>Apply / Review →</Text>
              </View>
              <Text style={styles.historyNavSub}>
                Submit academic/sick leave requests and track administrative approval status
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* DYNAMIC RESULT MODAL */}
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
              <Text style={styles.modalDismissText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BIOMETRIC FACE ENROLLMENT MODAL */}
      <Modal
        visible={enrollModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEnrollModalVisible(false)}
      >
        <View style={styles.enrollModalContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderTitle}>Biometric Face Enrollment</Text>
            <TouchableOpacity
              onPress={() => setEnrollFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
            >
              <Text style={styles.cameraFlipText}>Flip Camera</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.enrollInfoBox}>
            <Text style={styles.enrollInfoTitle}>Enrolling: {user?.full_name} ({user?.employee_id})</Text>
            <Text style={styles.enrollInfoSub}>
              Center your face within the blue oval reticle. Ensure adequate lighting and remove face coverings. Exactly one face must be visible.
            </Text>
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              ref={enrollCameraRef}
              style={styles.camera}
              facing={enrollFacing}
            />
            {/* Subtle dark overlay behind guide */}
            <View style={styles.cameraDarkOverlay} pointerEvents="none" />
            <View style={styles.faceReticleContainer} pointerEvents="none">
              <View style={[styles.faceOval, { borderColor: '#38bdf8' }]} />
              <Text style={styles.reticleInstruction}>Position face inside the blue oval</Text>
            </View>
          </View>

          <View style={styles.enrollActions}>
            <TouchableOpacity
              style={styles.cancelCameraBtn}
              onPress={() => setEnrollModalVisible(false)}
              disabled={isEnrolling}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureBtn, isEnrolling && styles.btnDisabled]}
              onPress={handleEnrollFace}
              disabled={isEnrolling}
            >
              {isEnrolling ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.captureText}>Capture & Save Reference</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* College Minor Project Footer */}
      <View style={styles.dashboardFooter}>
        <Text style={styles.dashboardFooterText}>
          College Minor Project BCA (Bachelor of Computer Applications)
        </Text>
      </View>
    </ScrollView>
  );
}

// ==============================================================================
// 4. ROOT APP ENTRY & VIEW CONTROLLER
// ==============================================================================
export default function App() {
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
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
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
                  Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bottomTabItem, currentScreen === 'history' && styles.bottomTabItemActive]}
                onPress={() => setCurrentScreen('history')}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>📋</Text>
                <Text style={[styles.bottomTabText, currentScreen === 'history' && styles.bottomTabTextActive]}>
                  History
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bottomTabItem, currentScreen === 'leave' && styles.bottomTabItemActive]}
                onPress={() => setCurrentScreen('leave')}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>📝</Text>
                <Text style={[styles.bottomTabText, currentScreen === 'leave' && styles.bottomTabTextActive]}>
                  Leaves
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomTabItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomTabIcon}>🚪</Text>
                <Text style={[styles.bottomTabText, { color: '#ef4444' }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ==============================================================================
// 5. STYLES
// ==============================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scroll: {
    padding: 18,
    gap: 16,
    paddingBottom: 40,
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 16,
  },
  loginHeader: {
    gap: 6,
  },
  systemBadge: {
    backgroundColor: '#0284c720',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c740',
  },
  systemBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  loginErrorBox: {
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 8,
    padding: 10,
  },
  loginErrorText: {
    color: '#f87171',
    fontSize: 12,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#38bdf8',
  },
  configToggle: {
    alignSelf: 'flex-end',
  },
  configToggleText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  configHint: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  loginBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  loginFooter: {
    marginTop: 10,
    alignItems: 'center',
  },
  loginFooterText: {
    fontSize: 11,
    color: '#64748b',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: '#0284c725',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0284c740',
  },
  roleBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  empName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  logoutText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: '#10b98115',
    borderColor: '#10b98140',
  },
  bannerError: {
    backgroundColor: '#ef444415',
    borderColor: '#ef444440',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bannerTextSuccess: {
    color: '#34d399',
  },
  bannerTextError: {
    color: '#f87171',
  },
  demoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#38bdf840',
    gap: 10,
  },
  demoHeader: {
    gap: 2,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  demoSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoModeBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoModeBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  demoModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  demoModeTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  refreshLink: {
    color: '#38bdf8',
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
    borderRadius: 6,
  },
  pillSuccess: {
    backgroundColor: '#10b98125',
  },
  pillDanger: {
    backgroundColor: '#ef444425',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textSuccess: {
    color: '#34d399',
  },
  textDanger: {
    color: '#f87171',
  },
  textWarning: {
    color: '#fbbf24',
  },
  distanceText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  highlight: {
    fontWeight: '700',
    color: '#f8fafc',
  },
  coordsBox: {
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  coordsText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  officeCoordsText: {
    color: '#64748b',
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
    color: '#94a3b8',
    lineHeight: 16,
  },
  cameraCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#38bdf880',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  cameraHeaderTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraFlipText: {
    color: '#38bdf8',
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
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
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
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  captureBtn: {
    flex: 2,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  captureText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#0f172a',
    gap: 8,
  },
  processingText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnSubtext: {
    color: '#bae6fd',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  secondaryBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 12,
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
    borderColor: '#10b981',
    backgroundColor: '#10b98120',
  },
  ringWarning: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b20',
  },
  ringDanger: {
    borderColor: '#ef4444',
    backgroundColor: '#ef444420',
  },
  ringInfo: {
    borderColor: '#38bdf8',
    backgroundColor: '#38bdf820',
  },
  modalIconText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalDetailsBox: {
    backgroundColor: '#090d16',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailKey: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  detailVal: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  modalDismissBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  modalDismissText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  enrollLink: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  enrollActionBtn: {
    marginTop: 12,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  enrollActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  enrollModalContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
  },
  enrollInfoBox: {
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  enrollInfoTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  enrollInfoSub: {
    color: '#94a3b8',
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
    borderTopColor: '#1e293b',
    marginTop: 24,
    marginBottom: 16,
  },
  dashboardFooterText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Portal Nav Cards
  portalNavBox: {
    marginTop: 18,
    marginBottom: 10,
  },
  portalNavHeader: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  historyNavCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  leaveNavCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  historyNavIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  historyNavArrow: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  leaveNavArrow: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  historyNavSub: {
    color: '#94a3b8',
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
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  todayPunchesRow: {
    flexDirection: 'row',
    backgroundColor: '#0c1222',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  todayPunchCol: {
    flex: 1,
    alignItems: 'center',
  },
  todayPunchDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#1e293b',
  },
  todayPunchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  todayPunchVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  todayPunchActive: {
    color: '#38bdf8',
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
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayEmptyBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  todayEmptyTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayEmptySub: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Bottom Navigation Bar
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0c1222',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomTabItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bottomTabItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  bottomTabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  bottomTabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  bottomTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});
