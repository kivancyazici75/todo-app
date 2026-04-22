import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ANON_KEY, TODOS_URL, apiHeaders, refreshSession, signOut } from '../lib/supabase';

const PURPLE = '#4f46e5';
const FILTERS = [
  { key: 'all',    label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'done',   label: 'Tamamlanan' },
];

export default function TodoScreen({ session, onLogout, onSessionRefresh }) {
  const [todos, setTodos]         = useState([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter]       = useState('all');
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText]   = useState('');
  const [error, setError]         = useState('');

  const inputRef = useRef(null);

  // ── HTTP helper with auto token-refresh ─────────────────
  const request = useCallback(
    async (method, url, body) => {
      const doFetch = (token) =>
        fetch(url, {
          method,
          headers: apiHeaders(token),
          body: body ? JSON.stringify(body) : undefined,
        });

      let res = await doFetch(session.access_token);

      if (res.status === 401) {
        const newSess = await refreshSession(session.refresh_token);
        if (!newSess) { onLogout(); return null; }
        onSessionRefresh(newSess);
        res = await doFetch(newSess.access_token);
      }

      if (!res.ok) throw new Error(await res.text());
      const txt = await res.text();
      return txt ? JSON.parse(txt) : [];
    },
    [session, onLogout, onSessionRefresh],
  );

  // ── Error banner ─────────────────────────────────────────
  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  }, []);

  // ── Load todos ───────────────────────────────────────────
  const loadTodos = useCallback(async () => {
    try {
      const data = await request('GET', `${TODOS_URL}?select=*&order=created_at.asc`);
      if (data !== null) setTodos(data);
    } catch (e) {
      showError('Yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request, showError]);

  useEffect(() => { loadTodos(); }, []);

  const onRefresh = () => { setRefreshing(true); loadTodos(); };

  // ── CRUD ─────────────────────────────────────────────────
  const addTodo = async () => {
    const text = inputText.trim();
    if (!text || adding) return;
    setAdding(true);
    setInputText('');
    try {
      const [created] = await request('POST', TODOS_URL, {
        text,
        done: false,
        user_id: session.user.id,
      });
      if (created) setTodos((prev) => [...prev, created]);
    } catch (e) {
      showError('Eklenemedi: ' + e.message);
      setInputText(text);
    } finally {
      setAdding(false);
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newDone = !todo.done;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    try {
      await request('PATCH', `${TODOS_URL}?id=eq.${id}`, { done: newDone });
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !newDone } : t)));
      showError('Güncellenemedi.');
    }
  };

  const deleteTodo = (id) => {
    Alert.alert('Görevi Sil', 'Bu görevi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setTodos((prev) => prev.filter((t) => t.id !== id));
          try {
            await request('DELETE', `${TODOS_URL}?id=eq.${id}`);
          } catch {
            showError('Silinemedi.');
            loadTodos();
          }
        },
      },
    ]);
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (id) => {
    const newText = editText.trim();
    if (!newText) return;
    const old = todos.find((t) => t.id === id)?.text;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: newText } : t)));
    setEditingId(null);
    setEditText('');
    try {
      await request('PATCH', `${TODOS_URL}?id=eq.${id}`, { text: newText });
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: old } : t)));
      showError('Güncellenemedi.');
    }
  };

  const clearDone = () => {
    if (!todos.some((t) => t.done)) return;
    Alert.alert('Tamamlananları Sil', 'Tüm tamamlanan görevler silinecek.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setTodos((prev) => prev.filter((t) => !t.done));
          try {
            await request('DELETE', `${TODOS_URL}?done=eq.true`);
          } catch {
            showError('Silinemedi.');
            loadTodos();
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut(session.access_token);
          onLogout();
        },
      },
    ]);
  };

  // ── Derived state ────────────────────────────────────────
  const filtered = todos.filter((t) =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true,
  );
  const activeCount = todos.filter((t) => !t.done).length;

  // ── Render item ──────────────────────────────────────────
  const renderItem = ({ item }) => {
    if (editingId === item.id) {
      return (
        <View style={s.item}>
          <TextInput
            style={s.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => saveEdit(item.id)}
            maxLength={120}
          />
          <TouchableOpacity style={s.saveBtn} onPress={() => saveEdit(item.id)}>
            <Text style={s.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={cancelEdit}>
            <Text style={s.cancelBtnText}>İptal</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.item}>
        <TouchableOpacity
          style={s.checkboxWrap}
          onPress={() => toggleTodo(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={[s.checkbox, item.done && s.checkboxDone]}>
            {item.done && <Text style={s.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <Text
          style={[s.itemText, item.done && s.itemTextDone]}
          numberOfLines={3}
        >
          {item.text}
        </Text>

        <TouchableOpacity
          onPress={() => startEdit(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.editIcon}>✎</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => deleteTodo(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Yapılacaklar</Text>
          <Text style={s.headerEmail} numberOfLines={1}>
            {session.user.email}
          </Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBar}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Input row */}
        <View style={s.inputRow}>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Yeni görev ekle..."
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
            onSubmitEditing={addTodo}
            maxLength={120}
          />
          <TouchableOpacity
            style={[s.addBtn, (adding || !inputText.trim()) && s.addBtnDisabled]}
            onPress={addTodo}
            disabled={adding || !inputText.trim()}
            activeOpacity={0.8}
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.addBtnText}>Ekle</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter buttons */}
        <View style={s.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PURPLE}
                colors={[PURPLE]}
              />
            }
            ListEmptyComponent={
              <View style={s.center}>
                <Text style={s.emptyText}>Görev bulunamadı</Text>
              </View>
            }
            contentContainerStyle={filtered.length === 0 ? s.emptyContainer : { paddingBottom: 8 }}
          />
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerCount}>
            {activeCount} aktif / {todos.length} görev
          </Text>
          <TouchableOpacity onPress={clearDone}>
            <Text style={s.clearText}>Tamamlananları sil</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft:  { flex: 1, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  errorBar: { backgroundColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { color: '#b91c1c', fontSize: 13 },

  inputRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  addBtn: {
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  filterBtnActive:  { backgroundColor: PURPLE, borderColor: PURPLE },
  filterText:       { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },

  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyText:      { color: '#9ca3af', fontSize: 15 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkboxWrap: { padding: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: { backgroundColor: PURPLE, borderColor: PURPLE },
  checkmark:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemText:     { flex: 1, fontSize: 15, color: '#111827', lineHeight: 21 },
  itemTextDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  editIcon:     { fontSize: 18, color: '#c4c9d4' },
  deleteIcon:   { fontSize: 16, color: '#c4c9d4' },

  editInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 15,
    color: '#111827',
  },
  saveBtn:       { backgroundColor: PURPLE, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn:     { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  cancelBtnText: { color: '#6b7280', fontSize: 13 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerCount: { fontSize: 13, color: '#6b7280' },
  clearText:   { fontSize: 13, color: '#ef4444', fontWeight: '500' },
});
