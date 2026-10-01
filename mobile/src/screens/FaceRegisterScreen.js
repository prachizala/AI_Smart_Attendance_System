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
import { api } from '../api/client';

export default function FaceRegisterScreen({ navigation }) {
  const { user, updateUserProfile } = useAuth();
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
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
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
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.captureBtnText}>Capture & Save 128-D Embedding</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
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
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444450',
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
  cameraBox: {
    flex: 1,
    marginVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38bdf8',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 2,
    borderColor: '#38bdf880',
    borderStyle: 'dashed',
  },
  footer: {
    paddingBottom: 20,
  },
  btn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  captureBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  captureBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
