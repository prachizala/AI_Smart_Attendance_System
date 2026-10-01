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
import { api, setAuthToken, setCustomBaseUrl } from '../api/client';

export default function LeaveScreen({ user: propUser, token, serverUrl, onBack, navigation }) {
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
        return { bg: '#10b98120', text: '#34d399' };
      case 'rejected':
        return { bg: '#ef444420', text: '#f87171' };
      default:
        return { bg: '#f59e0b20', text: '#fbbf24' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {(onBack || navigation) && (
          <TouchableOpacity
            style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8 }}
            onPress={() => (onBack ? onBack() : navigation?.goBack())}
          >
            <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>‹ Dashboard</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { marginBottom: 0 }]}>Leave Management</Text>
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
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reason}
          onChangeText={setReason}
          placeholder="Brief explanation for leave request..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Leave Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Previous Leave Requests */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Your Submitted Requests</Text>

        {isLoading ? (
          <ActivityIndicator color="#38bdf8" />
        ) : leaves.length === 0 ? (
          <Text style={styles.emptyText}>No previous leave requests.</Text>
        ) : (
          leaves.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <View key={item.id} style={styles.leaveCard}>
                <View style={styles.leaveTop}>
                  <Text style={styles.leaveType}>{item.leave_type.toUpperCase()} LEAVE</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scroll: {
    padding: 18,
    gap: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  typeBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0284c725',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  typeBtnTextActive: {
    color: '#38bdf8',
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
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    gap: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  leaveCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 6,
    marginBottom: 8,
  },
  leaveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  leaveDates: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  leaveReason: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  leaveRemarks: {
    fontSize: 12,
    color: '#a78bfa',
    fontStyle: 'italic',
  },
});
