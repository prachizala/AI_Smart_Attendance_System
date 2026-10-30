import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';

/**
 * AttendanceHistoryScreen - Displays real-time chronological attendance logs
 * Fetches from GET /attendance/history/{employee_id}
 * Displays: Date, Check-in, Check-out, Status, Late minutes, Early exit, Overtime, Location, Biometrics
 */
export default function AttendanceHistoryScreen({
  user,
  token,
  serverUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:8000',
  onBack,
  navigation,
}) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Authenticated employee identification
  const employeeId = user?.employee_id || user?.id || 'EMP001';
  const cleanServerUrl = (serverUrl || process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:8000').replace(/\/+$/, '');

  const fetchAttendanceHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Primary Endpoint: GET /attendance/history/{employee_id}
      let endpoint = `${cleanServerUrl}/attendance/history/${employeeId}`;
      let response;

      try {
        response = await fetch(endpoint, { method: 'GET', headers });
      } catch (netErr) {
        // Fallback port 3000 proxy if direct 8000 port was blocked
        if (cleanServerUrl.includes(':8000')) {
          const fallbackBase = cleanServerUrl.replace(':8000', ':3000');
          endpoint = `${fallbackBase}/attendance/history/${employeeId}`;
          try {
            response = await fetch(endpoint, { method: 'GET', headers });
          } catch (fbErr) {
            throw netErr;
          }
        } else {
          throw netErr;
        }
      }

      // If 404 on direct prefix, try /api/attendance/history/{employee_id} or user_id fallback
      if (response && response.status === 404) {
        let altEndpoint = `${cleanServerUrl}/api/attendance/history/${employeeId}`;
        let altRes = await fetch(altEndpoint, { method: 'GET', headers }).catch(() => null);
        if (altRes && altRes.ok) {
          response = altRes;
        } else if (user?.id) {
          let userEndpoint = `${cleanServerUrl}/api/attendance/user/${user.id}`;
          let userRes = await fetch(userEndpoint, { method: 'GET', headers }).catch(() => null);
          if (userRes && userRes.ok) {
            response = userRes;
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned error (${response.status})`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      setErrorMsg(
        err.message || 'Unable to load attendance history. Check server connection.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cleanServerUrl, employeeId, token, user?.id]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper time formatter
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  // Calculate high-level summary counts from real records
  const totalDays = records.length;
  const presentDays = records.filter(
    (r) => r?.status === 'present' || r?.status === 'late'
  ).length;
  const lateDays = records.filter(
    (r) => Number(r?.late_minutes || 0) > 0 || r?.status === 'late'
  ).length;
  const verifiedCount = records.filter(
    (r) => Boolean(r?.face_verified && r?.location_verified)
  ).length;

  const renderAttendanceCard = ({ item }) => {
    if (!item) return null;
    const lateMinutes = Number(item.late_minutes || 0);
    const isLate = lateMinutes > 0 || item.status === 'late';
    const isPresent = item.status === 'present';
    const isHalfDay = item.status === 'half_day';
    const hasEarlyExit = Boolean(item.early_exit);
    const overtimeMinutes = Number(item.overtime_minutes || 0);
    const hasOvertime = overtimeMinutes > 0;

    return (
      <View style={styles.card}>
        {/* Card Header: Date & Status Badge */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateTitle}>{formatDate(item.date)}</Text>
            <Text style={styles.recordIdText}>Record #{item.id || '--'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isPresent && styles.badgeSuccess,
              isLate && styles.badgeWarning,
              isHalfDay && styles.badgeWarning,
              !isPresent && !isLate && !isHalfDay && styles.badgeDanger,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isPresent && styles.textSuccess,
                isLate && styles.textWarning,
                isHalfDay && styles.textWarning,
                !isPresent && !isLate && !isHalfDay && styles.textDanger,
              ]}
            >
              {(item.status || 'present').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Timestamps Row: Check-In & Check-Out */}
        <View style={styles.timestampsRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>CHECK-IN</Text>
            <Text style={styles.timeValue}>{formatTime(item.check_in)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>CHECK-OUT</Text>
            <Text style={[styles.timeValue, !item.check_out && styles.timePending]}>
              {item.check_out ? formatTime(item.check_out) : 'In-Progress'}
            </Text>
          </View>
        </View>

        {/* Dynamic Metric Tags (Late, Early Exit, Overtime) */}
        {(isLate || hasEarlyExit || hasOvertime) && (
          <View style={styles.metricsRow}>
            {isLate && (
              <View style={styles.metricPillWarning}>
                <Text style={styles.metricPillWarningText}>
                  ⚠️ Late by {lateMinutes > 0 ? `${lateMinutes}m` : 'shift rule'}
                </Text>
              </View>
            )}
            {hasEarlyExit && (
              <View style={styles.metricPillWarning}>
                <Text style={styles.metricPillWarningText}>🚪 Early Exit</Text>
              </View>
            )}
            {hasOvertime && (
              <View style={styles.metricPillBlue}>
                <Text style={styles.metricPillBlueText}>
                  ⏱️ OT: {Math.floor(overtimeMinutes / 60)}h {overtimeMinutes % 60}m
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Verification & Location Badges */}
        <View style={styles.verificationRow}>
          <View
            style={[
              styles.verifyTag,
              item.face_verified ? styles.verifyTagSuccess : styles.verifyTagMuted,
            ]}
          >
            <Text
              style={[
                styles.verifyTagText,
                item.face_verified ? styles.textSuccess : styles.textMuted,
              ]}
            >
              {item.face_verified ? '✓ Face Biometrics Verified' : '✗ Face Unverified'}
            </Text>
          </View>

          <View
            style={[
              styles.verifyTag,
              item.location_verified ? styles.verifyTagInfo : styles.verifyTagMuted,
            ]}
          >
            <Text
              style={[
                styles.verifyTagText,
                item.location_verified ? styles.textInfo : styles.textMuted,
              ]}
            >
              {item.location_verified
                ? `✓ GPS Geofence (${item.distance_meters !== null && item.distance_meters !== undefined && !isNaN(Number(item.distance_meters)) ? `${Number(item.distance_meters).toFixed(1)}m` : '0m'})`
                : '✗ Outside Perimeter'}
            </Text>
          </View>
        </View>

        {/* Coordinates Telemetry if available */}
        {item.latitude !== null && item.latitude !== undefined && !isNaN(Number(item.latitude)) && item.longitude !== null && item.longitude !== undefined && !isNaN(Number(item.longitude)) && (
          <View style={styles.geoFooter}>
            <Text style={styles.geoText}>
              📍 Coordinates: {Number(item.latitude).toFixed(5)}° N, {Number(item.longitude).toFixed(5)}° E
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchAttendanceHistory(true)}
          disabled={isLoading || isRefreshing}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshBtnText}>
            {isRefreshing ? '...' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Employee Context Subheader */}
      <View style={styles.employeeBanner}>
        <View>
          <Text style={styles.employeeName}>{user?.full_name || 'Workforce Member'}</Text>
          <Text style={styles.employeeCode}>
            ID: <Text style={styles.highlight}>{employeeId}</Text> | Department: {user?.department || 'Computer Applications'}
          </Text>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{(user?.role || 'employee').toUpperCase()}</Text>
        </View>
      </View>

      {/* Metric Stats Banner */}
      {!isLoading && !errorMsg && records.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{totalDays}</Text>
            <Text style={styles.statLabel}>Total Logs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, styles.textSuccess]}>{presentDays}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, lateDays > 0 ? styles.textWarning : styles.textSuccess]}>
              {lateDays}
            </Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, styles.textInfo]}>{verifiedCount}</Text>
            <Text style={styles.statLabel}>Dual-Auth</Text>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching attendance history from backend...</Text>
          <Text style={styles.subLoadingText}>Target: GET /attendance/history/{employeeId}</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorMessage}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAttendanceHistory(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconText}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
          <Text style={styles.emptySubtitle}>
            No attendance punches recorded for employee {employeeId}.
            Once you perform dual-factor GPS and Face check-in, your records will appear here.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => fetchAttendanceHistory(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Refresh Logs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          renderItem={renderAttendanceCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchAttendanceHistory(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors, isDark) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshBtnText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  employeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  employeeName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  employeeCode: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  highlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  roleTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  roleTagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  recordIdText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  badgeWarning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  badgeDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  textSuccess: {
    color: colors.successText,
  },
  textWarning: {
    color: colors.warningText,
  },
  textDanger: {
    color: colors.dangerText,
  },
  textInfo: {
    color: colors.infoText,
  },
  textMuted: {
    color: colors.textSecondary,
  },
  timestampsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timePending: {
    color: colors.warningText,
    fontStyle: 'italic',
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricPillWarning: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  metricPillWarningText: {
    color: colors.warningText,
    fontSize: 11,
    fontWeight: '700',
  },
  metricPillBlue: {
    backgroundColor: colors.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  metricPillBlueText: {
    color: colors.infoText,
    fontSize: 11,
    fontWeight: '700',
  },
  verificationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verifyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifyTagSuccess: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  verifyTagInfo: {
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  verifyTagMuted: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifyTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  geoFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  geoText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subLoadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.danger,
    marginBottom: 16,
  },
  errorIconText: {
    color: colors.danger,
    fontSize: 28,
    fontWeight: '900',
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  retryBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
