import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { setCustomBaseUrl, DEFAULT_API_BASE_URL } from '../api/client';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('EMP001');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_BASE_URL);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide Employee ID and password.');
      return;
    }
    setCustomBaseUrl(serverUrl);
    const result = await login(identifier.trim(), password);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DUAL-FACTOR BIOMETRIC SYSTEM</Text>
            </View>
            <Text style={styles.title}>AI Smart Attendance</Text>
            <Text style={styles.subtitle}>
              Sign in with your Employee ID to access GPS Geofencing and Face Verification.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee ID or Email</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. EMP001"
                placeholderTextColor="#64748b"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.configToggle}
              onPress={() => setShowConfig(!showConfig)}
            >
              <Text style={styles.configToggleText}>
                {showConfig ? 'Hide Server URL Settings' : 'Configure Server IP for Demo'}
              </Text>
            </TouchableOpacity>

            {showConfig && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>FastAPI Server URL</Text>
                <TextInput
                  style={[styles.input, styles.monoInput]}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign In to Workstation</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              College Minor Project BCA (Bachelor of Computer Applications)
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 26,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#0284c720',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c740',
    marginBottom: 10,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
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
  button: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 11,
    color: '#64748b',
  },
});
