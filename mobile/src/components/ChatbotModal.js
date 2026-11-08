import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, Bot, Sparkles, User, RefreshCw, Camera, PhoneCall, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const ADMIN_PHONE_NUMBER = '+919265272082';
const ADMIN_DISPLAY_PHONE = '+91 9265272082';

export default function ChatbotModal({
  visible,
  onClose,
  user,
  token,
  serverUrl,
}) {
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chips, setChips] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // { uri, base64 }
  const scrollViewRef = useRef(null);

  const handleCallAdmin = () => {
    Linking.openURL(`tel:${ADMIN_PHONE_NUMBER}`).catch(() => {
      Alert.alert(
        'Call Helpline',
        `Could not launch dialer automatically. Please call Admin directly at: ${ADMIN_DISPLAY_PHONE}`
      );
    });
  };

  const handlePickScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Gallery access is needed to attach an error screenshot for AI diagnosis.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let b64 = asset.base64;
        if ((!b64 || typeof b64 !== 'string') && asset.uri) {
          try {
            const resp = await fetch(asset.uri);
            const blob = await resp.blob();
            b64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const res = reader.result;
                if (typeof res === 'string') {
                  const comma = res.indexOf(',');
                  resolve(comma !== -1 ? res.substring(comma + 1) : res);
                } else {
                  resolve(null);
                }
              };
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn('FileReader blob conversion failed:', e);
          }
        }
        setSelectedImage({ uri: asset.uri, base64: b64 });
      }
    } catch (err) {
      Alert.alert('Picker Error', err.message || 'Could not select image.');
    }
  };

  // Default welcome message on mount
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcome = {
        id: 'welcome_1',
        sender: 'bot',
        text:
          language === 'hi'
            ? `Namaste ${user?.full_name || 'Employee'}! Main aapka Smart Attendance AI Assistant hoon.\n\n• Attendance kaise record karein step-by-step poochne ke liye 'Guide Me' dabayein.\n• Agar koi technical issue aa raha ho toh camera icon se screenshot upload karein ya seedhe Admin Help Call (+91 9265272082) lagayein!`
            : language === 'gu'
            ? `નમસ્તે ${user?.full_name || 'Employee'}! હું તમારો સ્માર્ટ એટેન્ડન્સ AI આસિસ્ટન્ટ છું.\n\n• હાજરી કેવી રીતે પૂરવી તે જાણવા 'Guide Me' દબાવો.\n• કોઈ ટેકનિકલ સમસ્યા હોય તો સ્ક્રીનશોટ અપલોડ કરો અથવા એડમિન હેલ્પ કોલ (+91 9265272082) કરો!`
            : `Hello ${user?.full_name || 'Employee'}! I am your Smart Attendance AI Assistant.\n\n• Tap 'Guide Me' for step-by-step instructions on recording attendance.\n• Having technical issues? Attach a screenshot with 📷 or Call Admin Support at ${ADMIN_DISPLAY_PHONE}!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcome]);
      setChips([
        'Guide Me (Attendance Kaise Kare)',
        'Report Technical Issue',
        `Call Admin (${ADMIN_DISPLAY_PHONE})`,
        t('todayStatus') || 'Today Status',
        'Shift Rules',
      ]);
    }
  }, [visible, language, user]);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend = null) => {
    // If user tapped "Call Admin" chip
    if (textToSend && textToSend.includes('Call Admin')) {
      handleCallAdmin();
      return;
    }

    const text = (textToSend || inputMessage).trim();
    if ((!text && !selectedImage) || isLoading) return;

    const messageText = text || (selectedImage ? 'Technical Issue Screenshot Uploaded' : '');
    const currentAttached = selectedImage;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: messageText,
      imageUri: currentAttached?.uri || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const cleanUrl = (serverUrl || 'https://ai-smart-attendance-system-2m55.onrender.com').replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: user?.id || 1,
          message: messageText,
          language: language || 'en',
          image_base64: currentAttached?.base64 || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Chatbot server is unreachable');
      }

      const data = await response.json();
      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (Array.isArray(data.chips) && data.chips.length > 0) {
        setChips(data.chips);
      }
    } catch (err) {
      // Offline fallback answer
      const fallbackMsg = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text:
          language === 'hi'
            ? `Maaf kijiye, server se connect nahi ho pa raha hai. Agar koi urgent dikkat hai toh kripya Admin ko call karein: ${ADMIN_DISPLAY_PHONE}`
            : language === 'gu'
            ? `માફ કરશો, સર્વર સાથે સંપર્ક થઈ શકતો નથી. કોઈપણ મુશ્કેલી માટે એડમિન સંપર્ક કરો: ${ADMIN_DISPLAY_PHONE}`
            : `Unable to connect to the assistant server right now. For urgent help, please contact your Admin: ${ADMIN_DISPLAY_PHONE}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botIconRing}>
                <Bot size={22} color="#38bdf8" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>AI Smart Assistant</Text>
                  <Sparkles size={14} color="#f59e0b" />
                </View>
                <Text style={styles.headerSubtitle}>
                  {language === 'hi'
                    ? 'उपस्थिति और एचआर मित्र'
                    : language === 'gu'
                    ? 'હાજરી અને એચઆર સહાયક'
                    : 'Attendance & HR Companion'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* One-Click Call Admin Button in Header */}
              <TouchableOpacity
                style={styles.headerCallBtn}
                onPress={handleCallAdmin}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <PhoneCall size={13} color="#ffffff" />
                <Text style={styles.headerCallText}>Call Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages List */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  m.sender === 'user' ? styles.messageRowUser : styles.messageRowBot,
                ]}
              >
                {m.sender === 'bot' && (
                  <View style={styles.botAvatarMini}>
                    <Bot size={14} color="#38bdf8" />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    m.sender === 'user' ? styles.bubbleUser : styles.bubbleBot,
                  ]}
                >
                  {/* Attached Image Thumbnail */}
                  {m.imageUri && (
                    <View style={styles.bubbleImageContainer}>
                      <Image source={{ uri: m.imageUri }} style={styles.bubbleImage} />
                    </View>
                  )}

                  <Text
                    style={[
                      styles.bubbleText,
                      m.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                    ]}
                  >
                    {m.text}
                  </Text>

                  {/* Interactive Call Admin button inside bubble if phone number is mentioned */}
                  {m.sender === 'bot' && m.text && (m.text.includes(ADMIN_DISPLAY_PHONE) || m.text.includes('Contact your Admin') || m.text.includes('Help Support')) && (
                    <TouchableOpacity
                      style={styles.cardCallAdminBtn}
                      onPress={handleCallAdmin}
                      activeOpacity={0.8}
                    >
                      <PhoneCall size={14} color="#ffffff" />
                      <Text style={styles.cardCallAdminText}>📞 Call Admin ({ADMIN_DISPLAY_PHONE})</Text>
                    </TouchableOpacity>
                  )}

                  <Text
                    style={[
                      styles.timestampText,
                      m.sender === 'user' ? styles.timestampUser : styles.timestampBot,
                    ]}
                  >
                    {m.timestamp}
                  </Text>
                </View>
              </View>
            ))}

            {isLoading && (
              <View style={[styles.messageRow, styles.messageRowBot]}>
                <View style={styles.botAvatarMini}>
                  <Bot size={14} color="#38bdf8" />
                </View>
                <View style={[styles.bubble, styles.bubbleBot, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color="#38bdf8" />
                  <Text style={styles.loadingText}>AI is diagnosing & answering...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Suggestion Chips */}
          {chips.length > 0 && !isLoading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {chips.map((chip, idx) => (
                <TouchableOpacity
                  key={`chip_${idx}`}
                  style={[styles.chipBtn, chip.includes('Call Admin') && styles.chipBtnCall]}
                  onPress={() => handleSendMessage(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, chip.includes('Call Admin') && styles.chipTextCall]}>
                    {chip.includes('Call Admin') ? '📞' : '✨'} {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Attached Image Preview Bar Above Input */}
          {selectedImage && (
            <View style={styles.attachedPreviewBar}>
              <Image source={{ uri: selectedImage.uri }} style={styles.attachedThumbnail} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.attachedTitle}>📸 Error Screenshot Attached</Text>
                <Text style={styles.attachedSubtitle}>Tap send to let AI diagnose this problem</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={styles.removeAttachedBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            {/* Image / Screenshot Upload Button */}
            <TouchableOpacity
              style={[styles.cameraPickerBtn, selectedImage && styles.cameraPickerBtnActive]}
              onPress={handlePickScreenshot}
              activeOpacity={0.7}
              title="Upload Error Screenshot"
            >
              <Camera size={20} color={selectedImage ? '#38bdf8' : colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.inputField}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder={
                language === 'hi'
                  ? 'मुझसे कुछ भी पूछें या समस्या बताएं...'
                  : language === 'gu'
                  ? 'મને કંઈપણ પૂછો અથવા સમસ્યા જણાવો...'
                  : 'Ask AI assistant or describe issue...'
              }
              placeholderTextColor={colors.textMuted}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputMessage.trim() && !selectedImage) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
              activeOpacity={0.8}
            >
              <Send size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      height: '84%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 24,
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    headerCallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: '#10b981',
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    headerCallText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#ffffff',
    },
    botIconRing: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    messagesContent: {
      paddingVertical: 16,
      gap: 14,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowBot: {
      justifyContent: 'flex-start',
    },
    botAvatarMini: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    bubble: {
      maxWidth: '85%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleBot: {
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(241, 245, 249, 0.95)',
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleImageContainer: {
      marginBottom: 8,
      borderRadius: 12,
      overflow: 'hidden',
    },
    bubbleImage: {
      width: 180,
      height: 120,
      borderRadius: 12,
      backgroundColor: '#000000',
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 20,
    },
    bubbleTextUser: {
      color: '#ffffff',
      fontWeight: '600',
    },
    bubbleTextBot: {
      color: colors.textPrimary,
      fontWeight: '500',
    },
    cardCallAdminBtn: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: '#10b981',
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    cardCallAdminText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
    },
    timestampText: {
      fontSize: 10,
      marginTop: 6,
      alignSelf: 'flex-end',
    },
    timestampUser: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    timestampBot: {
      color: colors.textMuted,
    },
    loadingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    loadingText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipsScroll: {
      maxHeight: 46,
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    chipsContent: {
      gap: 8,
      paddingRight: 16,
    },
    chipBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)',
    },
    chipBtnCall: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    chipTextCall: {
      color: '#10b981',
    },
    attachedPreviewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(241, 245, 249, 0.95)',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    attachedThumbnail: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    attachedTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    attachedSubtitle: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    removeAttachedBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 16 : 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    cameraPickerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraPickerBtnActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      borderWidth: 1.5,
      borderColor: '#38bdf8',
    },
    inputField: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 9,
      color: colors.textPrimary,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
  });
}
