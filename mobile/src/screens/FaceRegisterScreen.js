import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

export default function FaceRegisterScreen({ navigation }) {
  const { user, updateUserProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const cameraRef = useRef(null);

  const captureAndRegister = async () => {
    if (!cameraRef.current) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      const res = await api.registerFace(user.id, photo.base64);
      updateUserProfile({ has_face_registered: true });

      Alert.alert(
        'Biometric Profile Saved',
        res.message || '128-D Facial Embedding extracted successfully.',
        [{ text: 'Return to Home', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Face enrollment failed.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.subtitle}>
          We need access to your camera to capture your reference biometric photo.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.btnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enroll Biometric Face Reference</Text>
        <Text style={styles.subtitle}>
          Position your face squarely within the oval. Ensure adequate lighting and remove face coverings.
        </Text>
      </View>

      {statusMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{statusMessage.text}</Text>
        </View>
      )}

      <View style={styles.cameraBox}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.ovalGuide} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.captureBtn, isProcessing && styles.btnDisabled]}
          onPress={captureAndRegister}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.captureBtnText}>Capture & Save 128-D Embedding</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  header: {
    paddingTop: 10,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
  },
  cameraBox: {
    flex: 1,
    marginVertical: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  ovalGuide: {
    width: 220,
    height: 300,
    borderRadius: 110,
    borderWidth: 2.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  footer: {
    paddingBottom: 20,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnText: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  captureBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  captureBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
