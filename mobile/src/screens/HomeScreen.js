import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

// Target Headquarters: SBS Shanti Business School, Shela, Ahmedabad, Gujarat 380058
const OFFICE_LAT = 23.002217;
const OFFICE_LON = 72.455763;
const GEOFENCE_RADIUS = 100.0; // Allowed radius in meters

export default function HomeScreen({ navigation }) {
  const { user, logout, token } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Location & Geofence State
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [demoMode, setDemoMode] = useState('real'); // 'real' | 'mock_inside' | 'mock_outside'

  // Camera & Check-In Processing State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('front');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const cameraRef = useRef(null);

  // Dynamic In-App Status & Modal Feedback
  const [statusBanner, setStatusBanner] = useState(null);
  const [resultModal, setResultModal] = useState({
    visible: false,
    type: 'success', // 'success' | 'geofence_error' | 'face_error' | 'duplicate_error' | 'error'
    title: '',
    message: '',
    details: null,
  });

  // Haversine geodesic distance formula (client-side telemetry preview)
  const calculateHaversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Acquire high-precision GPS coordinates from device hardware
  const fetchCurrentLocation = async (overrideMode = demoMode) => {
    setIsLocating(true);
    try {
      if (overrideMode === 'mock_inside') {
        const mockCoords = { latitude: 23.002220, longitude: 72.455770 }; // ~1.5m from SBS center
        setLocation(mockCoords);
        const d = calculateHaversine(mockCoords.latitude, mockCoords.longitude, OFFICE_LAT, OFFICE_LON);
        setDistance(d);
        setIsInsideGeofence(d <= GEOFENCE_RADIUS);
        return mockCoords;
      } else if (overrideMode === 'mock_outside') {
        const mockCoords = { latitude: 23.020000, longitude: 72.490000 }; // ~3.8 km away
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

  // Initial GPS sync on component mount
  useEffect(() => {
    fetchCurrentLocation('real');
  }, []);

  // SIMULTANEOUS TRIGGER: Start acquiring high-precision GPS AND open Camera Viewfinder concurrently
  const handleStartCheckIn = async () => {
    if (!user?.has_face_registered) {
      Alert.alert(
        'Biometric Profile Needed',
        'You have not registered your face reference yet. Please enroll your face reference before marking attendance.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Enroll Face Now', onPress: () => navigation.navigate('FaceRegister') },
        ]
      );
      return;
    }

    // 1. Verify Camera Permissions
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

    // 2. Concurrently initiate GPS location refresh in the background while camera activates
    fetchCurrentLocation(demoMode);

    // 3. Open Live Camera Viewfinder
    setCameraActive(true);
  };

  // Capture face base64 from Camera and dispatch check-in API request
  const handleCaptureAndCheckIn = async () => {
    if (!cameraRef.current) return;

    setIsProcessing(true);
    setProcessingStatus('Capturing biometric frame...');

    try {
      // 1. Capture optimized Base64 photo for lightweight API transmission
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6, // Optimal balance between compression and OpenCV facial clarity
        skipProcessing: false,
      });

      // Close viewfinder overlay
      setCameraActive(false);

      // 2. Ensure we have the latest GPS coordinates (wait for ongoing fix if pending)
      setProcessingStatus('Locking GPS coordinates...');
      let currentCoords = location;
      if (!currentCoords) {
        currentCoords = await fetchCurrentLocation(demoMode);
      }

      if (!currentCoords) {
        throw new Error('Could not acquire valid GPS fix. Ensure location services are enabled.');
      }

      // 3. Dispatch POST /attendance/check-in with Bearer Token and payload
      setProcessingStatus('Verifying face and geofence with AI server...');
      const response = await api.checkIn({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        face_image_base64: photo.base64,
        user_id: user?.id,
      });

      // 4. Success: Display dynamic verification modal
      const checkInTime = response.check_in
        ? new Date(response.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Confirmed';

      setResultModal({
        visible: true,
        type: 'success',
        title: 'Check-In Verified!',
        message: `Attendance recorded as ${response.status.toUpperCase()}.\nBoth Geofence and Facial Biometrics verified.`,
        details: {
          Time: checkInTime,
          Status: response.status.toUpperCase(),
          Employee: `${user?.full_name} (${user?.employee_id})`,
          Distance: `${response.distance_meters?.toFixed(1) || distance || 0}m to HQ`,
        },
      });

      setStatusBanner({
        type: 'success',
        text: `Checked in successfully as ${response.status.toUpperCase()} at ${checkInTime}`,
      });
    } catch (err) {
      setCameraActive(false);
      const statusCode = err.response?.status;
      const detailMsg = err.response?.data?.detail || err.message || 'Check-in failed.';

      // Dynamic Error Classification based on exact HTTP status codes
      if (statusCode === 403) {
        // Geofence perimeter violation
        setResultModal({
          visible: true,
          type: 'geofence_error',
          title: 'Geofence Perimeter Violation (403)',
          message: detailMsg,
          details: {
            Reason: 'Device is physically located outside the 100-meter office perimeter.',
            Office: 'SBS Shanti Business School (23.002217 N, 72.455763 E)',
            'Tip for Viva': 'Use the Viva Demo Toggle above to test inside vs outside.',
          },
        });
      } else if (statusCode === 401) {
        // Biometric face mismatch
        setResultModal({
          visible: true,
          type: 'face_error',
          title: 'Biometric Face Mismatch (401)',
          message: detailMsg,
          details: {
            Reason: 'Live camera selfie does not match the enrolled 128-D biometric profile.',
            Action: 'Ensure good lighting, remove face coverings, or re-enroll your face.',
          },
        });
      } else if (statusCode === 409) {
        // Anti-duplicate rule
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
        // General or network error
        setResultModal({
          visible: true,
          type: 'error',
          title: 'Check-In Error',
          message: detailMsg,
          details: null,
        });
      }

      setStatusBanner({ type: 'error', text: detailMsg });
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

      if (!currentCoords) {
        throw new Error('GPS coordinates unavailable. Check location permissions.');
      }

      const res = await api.checkOut({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        user_id: user?.id,
      });

      const outTime = res.check_out
        ? new Date(res.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
    } catch (err) {
      const detailMsg = err.response?.data?.detail || err.message || 'Check-out failed.';
      Alert.alert('Check-Out Issue', detailMsg);
      setStatusBanner({ type: 'error', text: detailMsg });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color={colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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

      {/* VIVA DEMO COORDINATE TOGGLE */}
      <View style={styles.demoCard}>
        <View style={styles.demoHeader}>
          <Text style={styles.demoTitle}>🎯 Viva Demo GPS Simulator</Text>
          <Text style={styles.demoSubtitle}>For evaluation & defense without physically traveling</Text>
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
              HQ Target: {OFFICE_LAT} N, {OFFICE_LON} E (SBS Shanti Business School, Shela, Ahmedabad)
            </Text>
          </View>
        )}
      </View>

      {/* Biometric Face Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Biometric Face Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FaceRegister')}>
            <Text style={styles.refreshLink}>
              {user?.has_face_registered ? 'Update' : 'Enroll Now'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bioRow}>
          <View style={styles.bioStatusPill}>
            <Text style={user?.has_face_registered ? styles.textSuccess : styles.textWarning}>
              {user?.has_face_registered ? '✓ 128-D Vector Registered' : '⚠ No Biometrics Enrolled'}
            </Text>
          </View>
          <Text style={styles.bioSubtext}>
            {user?.has_face_registered
              ? 'Stored in database for real-time Euclidean distance matching (threshold <= 0.50).'
              : 'Register face photo before attempting attendance check-in.'}
          </Text>
        </View>
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

      {/* Main Action Buttons (Hidden when Camera Active) */}
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

      {/* Navigation Shortcuts */}
      <View style={styles.navGrid}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.navCardTitle}>Attendance History</Text>
          <Text style={styles.navCardDesc}>Inspect punch logs, timestamps & statuses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('Leave')}
        >
          <Text style={styles.navCardTitle}>Leave Portal</Text>
          <Text style={styles.navCardDesc}>Submit requests & view approvals</Text>
        </TouchableOpacity>
      </View>

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

      {/* College Minor Project Footer */}
      <View style={styles.homeFooter}>
        <Text style={styles.homeFooterText}>
          College Minor Project BCA (Bachelor of Computer Applications)
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    themeToggleBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  scroll: {
    padding: 18,
    gap: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  navGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  navCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  navCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  navCardDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
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
  homeFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 20,
    marginBottom: 10,
  },
  homeFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});
