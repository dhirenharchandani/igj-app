import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Switch, KeyboardAvoidingView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useTheme } from '../src/ThemeContext'
import { useStore } from '../src/lib/store'
import { supabase, getUser } from '../src/lib/supabase'
import { BottomNav } from '../src/components/BottomNav'
import { Input } from '../src/components/ui/Input'

const NOTIF_KEY = 'igj_notifications_enabled'

export default function SettingsScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const { profile, setTheme, updateProfile, resetForSignOut } = useStore()
  const isDark  = profile.theme === 'dark'

  // Seed time pickers from store so values show immediately on every visit
  const parseTime = (t: string) => {
    const [h, m] = (t ?? '07:00:00').split(':').map(Number)
    const d = new Date(); d.setHours(h, m, 0, 0); return d
  }

  const [morningDate, setMorningDate] = useState(() => parseTime(profile.morning_time || '07:00:00'))
  const [eveningDate, setEveningDate] = useState(() => parseTime(profile.evening_time || '21:00:00'))
  const [showMorningPicker, setShowMorningPicker] = useState(false)
  const [showEveningPicker, setShowEveningPicker] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(false)

  // Seed from store for instant display
  const [identityGapText, setIdentityGapText] = useState(profile.identity_gap_text || '')
  const [displayName, setDisplayName]         = useState(profile.display_name || '')

  // Sync local state when store rehydrates from AsyncStorage (async on app start)
  useEffect(() => {
    if (profile.display_name)       setDisplayName(profile.display_name)
    if (profile.identity_gap_text)  setIdentityGapText(profile.identity_gap_text)
    if (profile.morning_time)       setMorningDate(parseTime(profile.morning_time))
    if (profile.evening_time)       setEveningDate(parseTime(profile.evening_time))
  }, [profile.display_name, profile.identity_gap_text, profile.morning_time, profile.evening_time])

  useFocusEffect(useCallback(() => {
    async function load() {
      try {
        const user = await getUser()
        if (!user) return

        const timeout = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 6000)
        )
        const { data } = await Promise.race([
          supabase
            .from('user_profiles')
            .select('morning_time, evening_time, identity_gap_text, display_name')
            .eq('id', user.id)
            .maybeSingle(),
          timeout,
        ])
        if (data) {
          // Only overwrite local state if DB has a real value — never blank out what user entered
          if (data.morning_time)       setMorningDate(parseTime(data.morning_time))
          if (data.evening_time)       setEveningDate(parseTime(data.evening_time))
          if (data.identity_gap_text)  setIdentityGapText(data.identity_gap_text)
          if (data.display_name)       setDisplayName(data.display_name)
          // Keep store in sync with DB values
          updateProfile({
            morning_time:      data.morning_time      ?? profile.morning_time,
            evening_time:      data.evening_time      ?? profile.evening_time,
            identity_gap_text: data.identity_gap_text ?? profile.identity_gap_text,
            display_name:      data.display_name      ?? profile.display_name,
          })
        }

        if (Platform.OS !== 'web') {
          const stored = await AsyncStorage.getItem(NOTIF_KEY)
          setNotifEnabled(stored === 'true')
        }
      } catch {
        // network error — already showing store-seeded values, nothing to do
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []))

  function fmtTime(d: Date) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function toTimeStr(d: Date) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
  }

  async function handleNotifToggle(value: boolean) {
    setNotifEnabled(value)
    await AsyncStorage.setItem(NOTIF_KEY, value ? 'true' : 'false')

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') {
        setNotifEnabled(false)
        await AsyncStorage.setItem(NOTIF_KEY, 'false')
        return
      }
      await scheduleNotifications()
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync()
    }
  }

  async function scheduleNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync()
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Morning check-in', body: 'Set the field for today. 5 minutes.' },
      trigger: { hour: morningDate.getHours(), minute: morningDate.getMinutes(), repeats: true } as any,
    })
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Evening check-in', body: 'Time to harvest your day.' },
      trigger: { hour: eveningDate.getHours(), minute: eveningDate.getMinutes(), repeats: true } as any,
    })
  }

  async function save() {
    setSaveError('')

    // Update store immediately — fields are correct on next visit even if network fails
    updateProfile({
      display_name: displayName,
      morning_time: toTimeStr(morningDate),
      evening_time: toTimeStr(eveningDate),
      identity_gap_text: identityGapText,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)

    // Save to Supabase in background
    setSaving(true)
    try {
      const user = await getUser()
      if (!user) { setSaving(false); return }

      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        morning_time: toTimeStr(morningDate),
        evening_time: toTimeStr(eveningDate),
        identity_gap_text: identityGapText,
        display_name: displayName,
      }, { onConflict: 'id' })

      if (error) setSaveError('Saved locally. Will sync when connection improves.')

      if (notifEnabled && Platform.OS !== 'web') {
        await scheduleNotifications()
      }
    } catch {
      setSaveError('Saved locally. Will sync when connection improves.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    resetForSignOut()   // clear all per-user store state before navigating away
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore errors — navigate away regardless
    }
    router.replace('/')
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={s.backBtn} activeOpacity={0.7}>
          <Text style={[s.backText, { color: t.textSecondary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: t.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Check-in Schedule */}
        <Text style={[s.sectionTitle, { color: t.textPrimary }]}>Check-in Schedule</Text>

        {loading ? (
          <Text style={{ color: t.textTertiary, fontSize: 14, marginBottom: 32 }}>Loading…</Text>
        ) : (
          <View style={{ marginBottom: 32 }}>
            {/* Morning */}
            <TouchableOpacity
              onPress={() => { setShowMorningPicker(true); setShowEveningPicker(false) }}
              activeOpacity={0.8}
              style={[s.timeRow, { backgroundColor: t.bg2, borderColor: showMorningPicker ? t.blue : t.border }]}
            >
              <View>
                <Text style={[s.timeLabel, { color: t.textSecondary }]}>☀️  Morning check-in</Text>
                <Text style={[s.timeValue, { color: t.textPrimary }]}>{fmtTime(morningDate)}</Text>
              </View>
              <Text style={[s.chevron, { color: t.textSecondary }]}>›</Text>
            </TouchableOpacity>

            {showMorningPicker && (
              <View style={[s.pickerWrap, { backgroundColor: t.bg2, borderColor: t.border }]}>
                <DateTimePicker
                  value={morningDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_, d) => { if (d) setMorningDate(d); if (Platform.OS !== 'ios') setShowMorningPicker(false) }}
                  style={{ width: '100%' }}
                />
              </View>
            )}

            {/* Evening */}
            <TouchableOpacity
              onPress={() => { setShowEveningPicker(true); setShowMorningPicker(false) }}
              activeOpacity={0.8}
              style={[s.timeRow, { backgroundColor: t.bg2, borderColor: showEveningPicker ? t.purple : t.border }]}
            >
              <View>
                <Text style={[s.timeLabel, { color: t.textSecondary }]}>🌙  Evening check-in</Text>
                <Text style={[s.timeValue, { color: t.textPrimary }]}>{fmtTime(eveningDate)}</Text>
              </View>
              <Text style={[s.chevron, { color: t.textSecondary }]}>›</Text>
            </TouchableOpacity>

            {showEveningPicker && (
              <View style={[s.pickerWrap, { backgroundColor: t.bg2, borderColor: t.border }]}>
                <DateTimePicker
                  value={eveningDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_, d) => { if (d) setEveningDate(d); if (Platform.OS !== 'ios') setShowEveningPicker(false) }}
                  style={{ width: '100%' }}
                />
              </View>
            )}

            <Text style={[s.hint, { color: t.textSecondary }]}>
              The evening check-in button on your dashboard becomes active at your scheduled time.
            </Text>

            {/* Push notification toggle — native only */}
            {Platform.OS !== 'web' && (
              <View style={[s.row, { backgroundColor: t.bg2, borderColor: t.border }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[s.rowLabel, { color: t.textPrimary }]}>Reminders</Text>
                  <Text style={[s.rowSub, { color: t.textSecondary }]}>Daily reminders at your morning and evening check-in times</Text>
                </View>
                <Switch
                  value={notifEnabled}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: t.border, true: t.teal }}
                  thumbColor={notifEnabled ? '#fff' : t.textTertiary}
                />
              </View>
            )}
          </View>
        )}

        {/* Your Mission */}
        <Text style={[s.sectionTitle, { color: t.textPrimary }]}>Your Mission</Text>
        <View style={{ marginBottom: 32 }}>
          <Text style={[s.fieldLabel, { color: t.textSecondary }]}>The gap I'm here to close:</Text>
          <Input
            value={identityGapText}
            onChangeText={setIdentityGapText}
            placeholder="Between who I am and who I know I can be…"
            multiline
            numberOfLines={4}
            style={[s.missionInput, { backgroundColor: t.bg2, borderColor: t.border, color: t.textPrimary }]}
          />
        </View>

        {/* Appearance */}
        <Text style={[s.sectionTitle, { color: t.textPrimary }]}>Appearance</Text>
        <View style={[s.row, { backgroundColor: t.bg2, borderColor: t.border, marginBottom: 32 }]}>
          <View>
            <Text style={[s.rowLabel, { color: t.textPrimary }]}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
            <Text style={[s.rowSub, { color: t.textSecondary }]}>{isDark ? 'Switch to light' : 'Switch to dark'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            activeOpacity={0.8}
            style={[s.toggleBtn, { backgroundColor: isDark ? t.teal : t.bg3, borderColor: t.border }]}
          >
            <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={[s.sectionTitle, { color: t.textPrimary }]}>Account</Text>
        <View style={{ marginBottom: 32 }}>
          <Text style={[s.fieldLabel, { color: t.textSecondary }]}>Your name</Text>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            style={[{ backgroundColor: t.bg2, borderColor: t.border, color: t.textPrimary }]}
          />
        </View>

        {/* Single save button covers everything */}
        <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.8}
          style={[s.saveBtn, { backgroundColor: t.teal, opacity: saving ? 0.6 : 1, marginBottom: 12 }]}>
          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save settings'}</Text>
        </TouchableOpacity>
        {saved     && <Text style={[s.savedText, { color: t.teal }]}>✓ All settings saved.</Text>}
        {saveError && <Text style={[s.savedText, { color: t.coral }]}>{saveError}</Text>}

        <TouchableOpacity onPress={signOut} activeOpacity={0.8}
          style={[s.signOutBtn, { backgroundColor: t.bg2, borderColor: t.border, marginTop: 24 }]}>
          <Text style={[s.signOutText, { color: t.coral }]}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  backBtn:     { width: 40 },
  backText:    { fontSize: 22 },
  title:       { fontSize: 17, fontWeight: '600' },
  scroll:      { padding: 24, paddingBottom: 100 },
  sectionTitle:{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 },
  timeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  timeLabel:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  timeValue:   { fontSize: 22, fontWeight: '700' },
  chevron:     { fontSize: 22 },
  hint:        { fontSize: 12, lineHeight: 18, marginBottom: 20 },
  saveBtn:     { padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  savedText:   { textAlign: 'center', marginTop: 12, fontSize: 13, fontWeight: '500' },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16, borderWidth: 1 },
  rowLabel:    { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  rowSub:      { fontSize: 12 },
  toggleBtn:   { padding: 10, borderRadius: 20, borderWidth: 1 },
  signOutBtn:  { padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '500' },
  pickerWrap:  { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12, alignItems: 'center' },
  fieldLabel:  { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  missionInput:{ borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 100, textAlignVertical: 'top' },
})
