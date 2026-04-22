import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import TodoScreen from './src/screens/TodoScreen';
import {
  clearStoredSession,
  getStoredSession,
  refreshSession,
} from './src/lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredSession();
        if (!stored) return;

        const isExpired = stored.expires_at && Date.now() > stored.expires_at - 60_000;
        if (isExpired) {
          const refreshed = await refreshSession(stored.refresh_token);
          if (refreshed) setSession(refreshed);
          else await clearStoredSession();
        } else {
          setSession(stored);
        }
      } catch {
        await clearStoredSession();
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const handleLogin = (newSession) => setSession(newSession);

  const handleLogout = async () => setSession(null);

  const handleSessionRefresh = (newSession) => setSession(newSession);

  if (booting) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={session ? 'light' : 'dark'} />
      {session ? (
        <TodoScreen
          session={session}
          onLogout={handleLogout}
          onSessionRefresh={handleSessionRefresh}
        />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}

const s = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
});
