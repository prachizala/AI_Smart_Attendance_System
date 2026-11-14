import React from 'react';
import AttendanceHistoryScreen from '../../screens/AttendanceHistoryScreen';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_API_BASE_URL } from '../api/client';

export default function HistoryScreen({ navigation, route }) {
  let contextUser = null;
  let contextToken = null;
  try {
    const auth = useAuth();
    contextUser = auth?.user;
    contextToken = auth?.token;
  } catch (e) {}

  const user = route?.params?.user || contextUser;
  const token = route?.params?.token || contextToken;

  return (
    <AttendanceHistoryScreen
      user={user}
      token={token}
      serverUrl={DEFAULT_API_BASE_URL}
      navigation={navigation}
      onBack={() => navigation?.goBack()}
    />
  );
}
