import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, setAuthToken, setCustomBaseUrl } from '../api/client';

export default function LeaveScreen({ user: propUser, token, serverUrl, onBack, navigation }) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  let contextUser = null;
  try {
    const auth = useAuth();
    contextUser = auth?.user;
  } catch (e) {}
  const user = propUser || contextUser;

  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-02');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaves = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await api.getMyLeaves(user.id);
      setLeaves(data);
    } catch (err) {
      console.log('Error fetching leaves:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (serverUrl) setCustomBaseUrl(serverUrl);
    if (token) setAuthToken(token);
    fetchLeaves();
  }, [serverUrl, token]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a reason for the leave request.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.applyLeave(user.id, leaveType, startDate, endDate, reason.trim());
      Alert.alert('Success', 'Leave request submitted for administrative review.');
      setReason('');
      fetchLeaves();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit leave.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return {
          bg: colors.successBg,
          text: colors.successText,
          border: colors.successBorder,
        };
      case 'rejected':
        return {
          bg: colors.dangerBg,
          text: colors.dangerText,
          border: colors.dangerBorder,
        };
      default:
        return {
          bg: colors.warningBg,
          text: colors.warningText,
          border: colors.warningBorder,
        };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.navRow}>
        {(onBack || navigation) && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (onBack ? onBack() : navigation?.goBack())}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ Dashboard</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Leave Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Application Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Submit New Leave Request</Text>

        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.typeRow}>
          {['sick', 'casual', 'academic'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                leaveType === t && styles.typeBtnActive,
              ]}
              onPress={() => setLeaveType(t)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  leaveType === t && styles.typeBtnTextActive,
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reason}
          onChangeText={setReason}
          placeholder="Brief explanation for leave request..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Leave Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Previous Leave Requests */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Your Submitted Requests</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : leaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No previous leave requests.</Text>
          </View>
        ) : (
          leaves.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <View key={item.id} style={styles.leaveCard}>
                <View style={styles.leaveTop}>
                  <Text style={styles.leaveType}>{item.leave_type.toUpperCase()} LEAVE</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.leaveDates}>
                  {item.start_date} to {item.end_date}
                </Text>
                <Text style={styles.leaveReason}>{item.reason}</Text>
                {item.admin_remarks && (
                  <Text style={styles.leaveRemarks}>
                    Admin Note: {item.admin_remarks}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 18,
    gap: 18,
    paddingBottom: 110,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: {
    flex: 1,
    gap: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
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
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    gap: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  leaveCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  leaveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveType: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  leaveDates: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  leaveReason: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  leaveRemarks: {
    fontSize: 12,
    color: colors.primaryDark,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
