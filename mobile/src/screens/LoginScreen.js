import React, { useState, useMemo, useRef } from 'react';
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
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { 
  ScanFace, 
  User, 
  Sun, 
  Moon, 
  Server, 
  Sparkles,
  Lock,
  XCircle,
  AlertCircle,
  Fingerprint
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { setCustomBaseUrl, DEFAULT_API_BASE_URL } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import { checkBiometricSupport, authenticateWithBiometrics, saveBiometricCredentials, getBiometricCredentials } from '../utils/biometrics';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState('EMP001');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_BASE_URL);
  const [error, setError] = useState('');
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
      await login(stored.identifier, stored.password);
    } catch (err) {
      Alert.alert(t('authFailedTitle'), err.message || t('biometricsFailed'));
    }
  };

  // Button press scale animation
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handleLogin = async () => {
    setError('');
    setModalError(null);

    if (!identifier.trim() || !password.trim()) {
      const msg = t('missingFieldsMsg');
      setError(msg);
      setModalError({
        title: t('missingFieldsTitle'),
        message: msg,
      });
      Alert.alert(t('missingFieldsTitle'), msg);
      return;
    }

    setCustomBaseUrl(serverUrl);
    const result = await login(identifier.trim(), password);
    if (result.success) {
      saveBiometricCredentials(identifier.trim(), password);
      return;
    }
    if (!result.success) {
      let rawMsg = result.error || '';
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
      } else {
        userFriendlyMsg = rawMsg || t('serverErrorMsg');
      }

      setError(userFriendlyMsg);
      setModalError({
        title,
        message: userFriendlyMsg,
      });
      Alert.alert(title, userFriendlyMsg, [{ text: 'OK', onPress: () => {} }]);
    }
  };

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* High Visibility Error Popup Modal */}
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Floating Bar with Language Selector & Theme Toggle */}
        <View style={styles.topBar}>
          <View style={styles.topProjectTag}>
            <Sparkles size={13} color={colors.primary} />
            <Text style={styles.topProjectText}>{t('bcaTag')}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LanguageSelector compact={true} />
            {/* Theme Toggle Button (Min 44x44 touch area) */}
            <TouchableOpacity
              style={styles.themeToggleBtn}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDark ? (
                <Sun size={18} color="#FBBF24" />
              ) : (
                <Moon size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Card */}
        <View style={styles.card}>
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <ScanFace size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('appTitle')}</Text>
            <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
          </View>

          {/* Error Notice */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Employee ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee ID / Email</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <User size={18} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. EMP001"
                  placeholderTextColor={colors.textMuted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <PasswordInput
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Server IP Config Toggle */}
            <TouchableOpacity
              style={styles.configToggle}
              onPress={() => setShowConfig(!showConfig)}
              activeOpacity={0.7}
            >
              <Server size={13} color={colors.primary} />
              <Text style={styles.configToggleText}>
                {showConfig ? 'Hide Server URL Settings' : 'Configure Server IP for Demo'}
              </Text>
            </TouchableOpacity>

            {showConfig && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>FastAPI Server URL</Text>
                <TextInput
                  style={[styles.inputStandalone, styles.monoInput]}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Animated Large Sign In Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>{t('signInToWorkstation')}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Biometric Quick Login Button */}
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

          {/* Footer Context */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Standard Demo Account: EMP001
            </Text>
            <Text style={styles.footerAcademic}>
              AI Smart Attendance • Shanti Business School HQ
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 32,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    topProjectTag: {
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
    topProjectText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    themeToggleBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 32,
      padding: 28,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    logoBadge: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 3,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 8,
    },
    errorBox: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 20,
    },
    errorText: {
      color: colors.dangerText,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    form: {
      gap: 16,
    },
    inputGroup: {
      gap: 6,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginLeft: 2,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      minHeight: 52,
    },
    inputIconContainer: {
      paddingLeft: 16,
      paddingRight: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      paddingVertical: 13,
      paddingRight: 16,
      color: colors.textPrimary,
      fontSize: 15,
    },
    inputStandalone: {
      backgroundColor: colors.inputBg,
      borderRadius: 16,
      paddingHorizontal: 16,
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
    },
    configToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 6,
      paddingVertical: 4,
    },
    configToggleText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    button: {
      backgroundColor: colors.primaryDark || colors.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 5,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    biometricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginTop: 12,
      gap: 8,
    },
    biometricBtnText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    footer: {
      marginTop: 26,
      alignItems: 'center',
      gap: 4,
    },
    footerNote: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    footerAcademic: {
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
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
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
