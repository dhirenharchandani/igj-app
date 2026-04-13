import React, { useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../src/ThemeContext'
import { useStore } from '../../src/lib/store'
import { supabase } from '../../src/lib/supabase'
import { updateStreak } from '../../src/lib/utils/streak'
import { BottomNav } from '../../src/components/BottomNav'
import { Input } from '../../src/components/ui/Input'
import { Btn } from '../../src/components/ui/Btn'
import { Chip } from '../../src/components/ui/Chip'

const CHIPS = {
  gratitude: [
    "The relationships I've built",
    "My health and ability to show up",
    "The progress I've made, even if slow",
    "My ability to learn and adapt",
  ],
  q1: ['Patient and deliberate', 'Fully present', 'Decisive', 'Disciplined', 'Calm under pressure'],
  q2: ["Finishing what I started", "The conversation I've been avoiding", 'Deep work, no distractions', "The decision I've been putting off"],
  q3: ['High — clear and focused', "Low — didn't rest enough", 'Scattered — too many open loops', 'Anxious — avoiding something', 'Flat — disconnected from purpose'],
  q4: ['Avoidance', 'Overthinking', 'Reactivity', 'Control', 'People-pleasing', 'Distraction'],
  q5: ['I respond instead of react', 'I finish what I start', 'I do what I said I would', "I don't complain, I solve", 'I show up fully, not partially'],
  q6: ['I completed the one thing', "I showed up as who I said I'd be", 'I closed the gap, even slightly', 'I moved the needle on what matters most'],
}

interface Form { gratitude: string; q1: string; q2: string; q3: string; q4: string; q5: string; q6: string }

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

// ── Outside component to prevent keyboard-dismissal on keystroke ──
type QProps = {
  label: string; sub: string; value: string
  onChangeText: (v: string) => void; placeholder: string; chips?: string[]
}

function QuestionBlock({ label, sub, value, onChangeText, placeholder, chips }: QProps) {
  const t = useTheme()
  const count = wordCount(value)
  return (
    <View style={s.qBlock}>
      <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{label}</Text>
      <Text style={[s.qSub, { color: t.textSecondary }]}>{sub}</Text>
      <Input value={value} onChangeText={onChangeText} placeholder={placeholder} multiline numberOfLines={3} focusColor="blue" />
      {value.length > 0 && (
        <Text style={[s.wordCount, { color: t.textTertiary }]}>{count} {count === 1 ? 'word' : 'words'}</Text>
      )}
      {chips && (
        <View style={s.chips}>
          {chips.map(c => <Chip key={c} label={c} onPress={() => onChangeText(c)} />)}
        </View>
      )}
    </View>
  )
}

export default function MorningScreen() {
  const router = useRouter()
  const t = useTheme()
  const { markMorningDone } = useStore()
  const [form, setForm] = useState<Form>({ gratitude: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '' })
  const [saving, setSaving] = useState(false)
  // Always start null (loading) — never show the blank form until we've checked Supabase
  const [saved, setSaved] = useState<boolean | null>(null)
  const [eveningTime, setEveningTime] = useState('')
  const [yesterdayWin, setYesterdayWin] = useState('')
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-runs every time the screen gains focus.
  // Always checks Supabase first — so on a new day, no data is found → fresh form automatically.
  useFocusEffect(useCallback(() => {
    setSaved(null) // show spinner while we check

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaved(false); return }
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const [{ data }, { data: profile }, { data: winData }] = await Promise.all([
        supabase.from('morning_checkins')
          .select('gratitude_entry,q1_intention,q2_focus,q3_energy,q4_pattern,q5_standard,q6_win')
          .eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('user_profiles').select('evening_time').eq('id', user.id).maybeSingle(),
        supabase.from('morning_checkins').select('q6_win').eq('user_id', user.id).eq('date', yesterday).maybeSingle(),
      ])
      if (profile?.evening_time) {
        const [h, m] = (profile.evening_time as string).split(':').map(Number)
        const fmt = new Date(); fmt.setHours(h, m, 0)
        setEveningTime(fmt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
      }
      if (winData?.q6_win) {
        setYesterdayWin(winData.q6_win)
      } else {
        setYesterdayWin('')
      }
      if (data) {
        // Data found — populate form and show recap
        setForm({
          gratitude: data.gratitude_entry ?? '',
          q1: data.q1_intention ?? '',
          q2: data.q2_focus ?? '',
          q3: data.q3_energy ?? '',
          q4: data.q4_pattern ?? '',
          q5: data.q5_standard ?? '',
          q6: data.q6_win ?? '',
        })
        setSaved(true)
      } else {
        // No data for today — check AsyncStorage for a draft
        const draftKey = `igj_morning_draft_${today}`
        try {
          const raw = await AsyncStorage.getItem(draftKey)
          if (raw) {
            const draft = JSON.parse(raw) as Partial<Form>
            setForm(f => ({ ...f, ...draft }))
          } else {
            setForm({ gratitude: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '' })
          }
        } catch {
          setForm({ gratitude: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '' })
        }
        setSaved(false)
      }
    }
    load()
  }, []))

  function scheduleDraftSave(nextForm: Form) {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(async () => {
      const today = new Date().toISOString().split('T')[0]
      const draftKey = `igj_morning_draft_${today}`
      try {
        await AsyncStorage.setItem(draftKey, JSON.stringify(nextForm))
      } catch { /* ignore storage errors */ }
    }, 1500)
  }

  function set(k: keyof Form) {
    return (v: string) => setForm(f => {
      const next = { ...f, [k]: v }
      scheduleDraftSave(next)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().split('T')[0]
    if (user) {
      await supabase.from('morning_checkins').upsert({
        user_id: user.id, date: today, gratitude_entry: form.gratitude,
        q1_intention: form.q1, q2_focus: form.q2, q3_energy: form.q3,
        q4_pattern: form.q4, q5_standard: form.q5, q6_win: form.q6, is_abbreviated: false,
      })
      await updateStreak(user.id, supabase)
    }
    markMorningDone()
    // Clear draft after successful save
    try {
      const today2 = new Date().toISOString().split('T')[0]
      await AsyncStorage.removeItem(`igj_morning_draft_${today2}`)
    } catch { /* ignore */ }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSaving(false)
    setSaved(true)
  }

  // ── Checking Supabase — show brief spinner, not a blank form ──
  if (saved === null) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.blue} />
        </View>
      </SafeAreaView>
    )
  }

  // ── Already done today — show all responses ──
  if (saved) {
    const RECAP = [
      { label: "What's already working", value: form.gratitude, color: t.teal },
      { label: 'Who I need to be today',           value: form.q1,       color: t.blue },
      { label: 'The one thing that matters most',  value: form.q2,       color: t.blue },
      { label: 'Energy level',                     value: form.q3,       color: t.amber },
      { label: 'Pattern to watch for',             value: form.q4,       color: t.amber },
      { label: 'Standard I\'m holding',            value: form.q5,       color: t.purple },
      { label: 'What would make today a win',      value: form.q6,       color: t.teal },
    ].filter(r => r.value)

    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.doneScroll}>
          <View style={s.doneWrap}>
            <View style={[s.doneIcon, { backgroundColor: t.tealDim, borderColor: t.tealBorder }]}>
              <Text style={s.doneIconText}>✓</Text>
            </View>
            <Text style={[s.doneTitle, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular' }]}>
              Morning locked in.
            </Text>
            <Text style={[s.doneSub, { color: t.textSecondary }]}>
              You've set the field for today. Come back this evening to reflect on how it actually went.
            </Text>
          </View>

          {/* All responses */}
          {RECAP.length > 0 ? RECAP.map(r => (
            <View key={r.label} style={[s.recapCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: r.color }]}>
              <Text style={[s.recapLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={[s.recapText, { color: t.textPrimary }]}>{r.value}</Text>
            </View>
          )) : (
            <View style={[s.recapCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: t.teal }]}>
              <Text style={[s.recapText, { color: t.textSecondary }]}>Your responses are saved. Loading…</Text>
            </View>
          )}

          <View style={[s.reminderBox, { backgroundColor: t.bg3, borderColor: t.border }]}>
            <Text style={[s.reminderText, { color: t.textSecondary }]}>
              🌙  Evening check-in opens{eveningTime ? ` at ${eveningTime}` : ' this evening'}
            </Text>
          </View>

          <Btn label="Back to home" onPress={() => router.back()} variant="teal" style={{ marginTop: 8 }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Not done yet — show the form ──
  const gratitudeWordCount = wordCount(form.gratitude)
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.tabBar, { backgroundColor: t.bg2, borderBottomColor: t.border }]}>
        {[
          { label: 'Morning',   active: true,  href: '/checkin/morning' },
          { label: 'Evening',   active: false, href: '/checkin/evening' },
          { label: 'Scorecard', active: false, href: '/checkin/scorecard' },
        ].map(tab => (
          <TouchableOpacity key={tab.label} onPress={() => router.push(tab.href as any)} style={s.tab} activeOpacity={0.7}>
            <Text style={[s.tabText, { color: tab.active ? t.blue : t.textSecondary, fontWeight: tab.active ? '500' : '400' }]}>{tab.label}</Text>
            {tab.active && <View style={[s.tabLine, { backgroundColor: t.blue }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Yesterday's win mirror */}
          {yesterdayWin.length > 0 && (
            <View style={[s.yesterdayCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: t.amber }]}>
              <Text style={[s.yesterdayLabel, { color: t.amber }]}>YESTERDAY'S WIN</Text>
              <Text style={[s.yesterdayText, { color: t.textSecondary }]}>"{yesterdayWin}"</Text>
            </View>
          )}

          <View style={s.qBlock}>
            <Text style={[s.sectionLabel, { color: t.textTertiary }]}>State primer</Text>
            <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
              What's already working in your life that you're not giving enough credit to?
            </Text>
            <Text style={[s.qSub, { color: t.textSecondary }]}>This isn't positivity. It's pattern calibration. You can't see clearly from a deficit lens.</Text>
            <Input value={form.gratitude} onChangeText={set('gratitude')} placeholder="What's already working is…" multiline numberOfLines={3} focusColor="blue" />
            {form.gratitude.length > 0 && (
              <Text style={[s.wordCount, { color: t.textTertiary }]}>{gratitudeWordCount} {gratitudeWordCount === 1 ? 'word' : 'words'}</Text>
            )}
            <View style={s.chips}>
              {CHIPS.gratitude.map(c => <Chip key={c} label={c} onPress={() => set('gratitude')(c)} />)}
            </View>
          </View>

          <QuestionBlock label="Who do I need to be today?" sub="Identity first. Actions follow." value={form.q1} onChangeText={set('q1')} placeholder="Today I need to be someone who…" chips={CHIPS.q1} />
          <QuestionBlock label="What's the one thing that matters most?" sub="One thing. Not a list." value={form.q2} onChangeText={set('q2')} placeholder="The one thing is…" chips={CHIPS.q2} />
          <QuestionBlock label="What's my energy level — and what's driving it?" sub="Name it accurately. You can only manage what you can see." value={form.q3} onChangeText={set('q3')} placeholder="My energy is… because…" chips={CHIPS.q3} />
          <QuestionBlock label="What pattern am I watching for today?" sub="Name it before it shows up. That's the practice." value={form.q4} onChangeText={set('q4')} placeholder="The pattern I'm watching for is…" chips={CHIPS.q4} />
          <QuestionBlock label="What standard am I holding myself to today?" sub="Not a goal. A non-negotiable." value={form.q5} onChangeText={set('q5')} placeholder="My standard today is…" chips={CHIPS.q5} />
          <QuestionBlock label="What would make today a win?" sub="Be specific. Vague intentions produce vague outcomes." value={form.q6} onChangeText={set('q6')} placeholder="Today is a win if…" chips={CHIPS.q6} />

          <Btn label={saving ? 'Saving…' : 'Save morning check-in'} onPress={save} variant="blue" loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  tabBar:         { flexDirection: 'row', borderBottomWidth: 1 },
  tab:            { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabText:        { fontSize: 13 },
  tabLine:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  scroll:         { padding: 20, paddingTop: 28, paddingBottom: 100 },
  sectionLabel:   { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  question:       { fontSize: 20, lineHeight: 28, marginBottom: 8 },
  qSub:           { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  qBlock:         { marginBottom: 32 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  wordCount:      { fontSize: 11, textAlign: 'right', marginTop: 4 },
  yesterdayCard:  { borderRadius: 12, padding: 14, borderWidth: 1, borderLeftWidth: 3, marginBottom: 28 },
  yesterdayLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  yesterdayText:  { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  // Done / recap screen
  doneScroll:     { padding: 28, paddingTop: 60, paddingBottom: 60 },
  doneWrap:       { alignItems: 'center', marginBottom: 32 },
  doneIcon:       { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  doneIconText:   { fontSize: 28, color: '#4ecdc4' },
  doneTitle:      { fontSize: 28, textAlign: 'center', marginBottom: 14 },
  doneSub:        { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  recapCard:      { borderRadius: 16, padding: 18, borderWidth: 1, borderLeftWidth: 3, marginBottom: 12 },
  recapLabel:     { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  recapText:      { fontSize: 15, lineHeight: 24 },
  reminderBox:    { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 8, marginBottom: 28, alignItems: 'center' },
  reminderText:   { fontSize: 13 },
})
