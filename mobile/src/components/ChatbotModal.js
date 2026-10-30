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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, Bot, Sparkles, User, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

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
  const scrollViewRef = useRef(null);

  // Default welcome message on mount
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcome = {
        id: 'welcome_1',
        sender: 'bot',
        text:
          language === 'hi'
            ? `Namaste ${user?.full_name || 'Employee'}! Main aapka Smart Attendance AI Assistant hoon. Aaj aapki kya madad karoon?`
            : language === 'gu'
            ? `નમસ્તે ${user?.full_name || 'Employee'}! હું તમારો સ્માર્ટ એટેન્ડન્સ AI આસિસ્ટન્ટ છું. આજે હું તમારી શું મદદ કરી શકું?`
            : `Hello ${user?.full_name || 'Employee'}! I am your Smart Attendance AI Assistant. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcome]);
      setChips([
        t('todayStatus') || 'Today Status',
        'Leave Balance',
        'Trust Score',
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
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const cleanUrl = (serverUrl || 'http://192.168.1.3:8000').replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: user?.id || 1,
          message: text,
          language: language || 'en',
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
            ? 'Maaf kijiye, server se connect nahi ho pa raha hai. Par aap offline punch kar sakte hain aur network aane par auto-sync ho jayega.'
            : language === 'gu'
            ? 'માફ કરશો, સર્વર સાથે સંપર્ક થઈ શકતો નથી. પરંતુ તમે ઓફલાઇન પંચ કરી શકો છો.'
            : 'I am unable to reach the backend server right now. If you are marking attendance, offline queue will save your punch locally.',
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

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
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
                  <Text
                    style={[
                      styles.bubbleText,
                      m.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                    ]}
                  >
                    {m.text}
                  </Text>
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
                  <Text style={styles.loadingText}>AI is thinking...</Text>
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
                  style={styles.chipBtn}
                  onPress={() => handleSendMessage(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText}>✨ {chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.inputField}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder={
                language === 'hi'
                  ? 'मुझसे कुछ भी पूछें...'
                  : language === 'gu'
                  ? 'મને કંઈપણ પૂછો...'
                  : 'Ask AI assistant anything...'
              }
              placeholderTextColor={colors.textMuted}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputMessage.trim() && styles.sendBtnDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
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
      height: '82%',
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    botIconRing: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
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
      maxWidth: '82%',
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
    timestampText: {
      fontSize: 10,
      marginTop: 4,
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
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 16 : 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    inputField: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
