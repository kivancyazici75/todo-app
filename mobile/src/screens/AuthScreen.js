import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { signIn, signUp } from '../lib/supabase';

const PURPLE = '#4f46e5';

export default function AuthScreen({ onLogin }) {
  const [tab, setTab]           = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState({ text: '', type: '' });

  const passwordRef = useRef(null);

  const switchTab = (t) => {
    setTab(t);
    setMsg({ text: '', type: '' });
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setMsg({ text: 'E-posta ve şifre gerekli.', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      if (tab === 'register') {
        await signUp(email.trim(), password);
        setMsg({
          text: 'Kayıt başarılı! E-posta adresinize onay bağlantısı gönderildi. E-postanızı onayladıktan sonra giriş yapabilirsiniz.',
          type: 'success',
        });
        setTab('login');
        setPassword('');
      } else {
        const session = await signIn(email.trim(), password);
        onLogin(session);
      }
    } catch (e) {
      setMsg({ text: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Title */}
          <View style={s.hero}>
            <Text style={s.heroTitle}>Yapılacaklar</Text>
            <Text style={s.heroSub}>Hesabınıza giriş yapın veya kayıt olun</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Tabs */}
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, tab === 'login' && s.tabActive]}
                onPress={() => switchTab('login')}
              >
                <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>
                  Giriş Yap
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, tab === 'register' && s.tabActive]}
                onPress={() => switchTab('register')}
              >
                <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>
                  Kayıt Ol
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.form}>
              {/* Message */}
              {msg.text ? (
                <View style={[s.msgBox, msg.type === 'error' ? s.msgError : s.msgSuccess]}>
                  <Text style={msg.type === 'error' ? s.msgErrorText : s.msgSuccessText}>
                    {msg.text}
                  </Text>
                </View>
              ) : null}

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>E-posta</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@eposta.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              {/* Password */}
              <View style={s.field}>
                <Text style={s.label}>Şifre</Text>
                <TextInput
                  ref={passwordRef}
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={tab === 'register' ? 'En az 6 karakter' : 'Şifreniz'}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {/* Button */}
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.btnText}>
                    {tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f0f2f5' },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  hero:      { alignItems: 'center', marginBottom: 28 },
  heroTitle: { fontSize: 30, fontWeight: '700', color: PURPLE },
  heroSub:   { fontSize: 14, color: '#6b7280', marginTop: 6, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  tabs:         { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#e5e7eb' },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  tabActive:    { borderBottomColor: PURPLE },
  tabText:      { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive:{ color: PURPLE },

  form: { padding: 20, gap: 14 },

  msgBox:        { padding: 12, borderRadius: 8 },
  msgError:      { backgroundColor: '#fee2e2' },
  msgSuccess:    { backgroundColor: '#d1fae5' },
  msgErrorText:  { color: '#b91c1c', fontSize: 13, lineHeight: 19 },
  msgSuccessText:{ color: '#065f46', fontSize: 13, lineHeight: 19 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },

  btn:        { backgroundColor: PURPLE, borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});
