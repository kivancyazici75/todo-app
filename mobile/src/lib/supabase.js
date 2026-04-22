import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPA_URL = 'https://lwaoegnarishkhzocbaw.supabase.co';
export const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3YW9lZ25hcmlzaGtoem9jYmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDkwMjEsImV4cCI6MjA5MjI4NTAyMX0.r6KQ7hsVajDZUiwN3QaquOQxGp19jkdeUBQCxfjHlvM';

const AUTH_URL = `${SUPA_URL}/auth/v1`;
export const TODOS_URL = `${SUPA_URL}/rest/v1/todos`;

export function apiHeaders(token) {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    Prefer: 'return=representation',
  };
}

// ── Session storage ──────────────────────────────────────
export async function getStoredSession() {
  try {
    const raw = await AsyncStorage.getItem('sb_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function storeSession(session) {
  await AsyncStorage.setItem('sb_session', JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem('sb_session');
}

function buildSession(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    user: { id: data.user.id, email: data.user.email },
  };
}

// ── Auth API ─────────────────────────────────────────────
export async function signUp(email, password) {
  const redirectTo = encodeURIComponent('https://kivancyazici75.github.io/todo-app/');
  const res = await fetch(`${AUTH_URL}/signup?redirect_to=${redirectTo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || 'Kayıt başarısız.');
  }
  return data;
}

export async function signIn(email, password) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error_description || data.msg || '';
    if (msg.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'E-posta adresiniz henüz onaylanmamış. Lütfen gelen kutunuzu kontrol edin.',
      );
    }
    if (msg.toLowerCase().includes('invalid login')) {
      throw new Error('E-posta veya şifre hatalı.');
    }
    throw new Error(msg || 'Giriş başarısız.');
  }
  const session = buildSession(data);
  await storeSession(session);
  return session;
}

export async function signOut(accessToken) {
  try {
    await fetch(`${AUTH_URL}/logout`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
  } catch {}
  await clearStoredSession();
}

export async function refreshSession(refreshToken) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const session = buildSession(data);
  await storeSession(session);
  return session;
}
