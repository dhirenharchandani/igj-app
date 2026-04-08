import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
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
    'The relationships I've built',
    'My health and ability to show up',
    'The progress I've made, even if slow',
    'My ability to learn and adapt',
  ],
  q1: ['Patient and deliberate', 'Fully present', 'Decisive', 'Disciplined', 'Calm under pressure'],
  q2: ['Finishing what I started', 'The conversation I've been avoiding', 'Deep work, no distractions', 'The decision I've been putting off'],
  q3: ['High — clear and focused', 'Low — didn't rest enough', 'Scattered — too many open loops', 'Anxious — avoiding something', 'Flat — disconnected from purpose'],
  q4: ['Avoidance', 'Overthinking', 'Reactivity', 'Control', 'People-pleasing', 'Distraction'],
  q5: ['I respond instead of react', 'I finish what I start', 'I do what I said I would', 'I don't complain, I solve', 'I show up fully, not partially'],
  q6: ['I completed the one thing', 'I showed up as who I said I'd be', 'I closed the gap, even slightly', 'I moved the needle on what matters most'],
}

interface Form { gratitude: string; q1: string; q2: string; q3: string; q4: string; q5: string; q6: string }

// ── Outside component to prevent keyboard-dismissal on keystroke ──
type QProps = {
  label: string; sub: string; value: string
  onChangeText: (v: string) => void; placeholder: string; chips?: string[]
}

function QuestionBlock({ label, sub, value, onChangeText, placeholder, chips }: QProps) {
  const t = useTheme()
  return (
    <View style={s.qBlock}>
      <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{label}</Text>
      <Text style={[s.qSub, { color: t.textSecondary }]}>{sub}</Text>
      <Input value={value} onChangeText={onChangeText} placeholder={placeholder} multiline numberOfLines={3} focusColor="blue" />
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
  const [saved, setSaved] = useState(false)

  function set(k: keyof Form) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }))
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
    // ── Mark done in store immediately — dashboard reads this, no async delay ──
    markMorningDone()
    setSaving(false)
    setSaved(true)
  }

  if (saved) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
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

          {form.q1 ? (
            <View style={[s.intentionCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: t.blue }]}>
              <Text style={[s.intentionLabel, { color: t.blue }]}>Your intention today</Text>
              <Text style={[s.intentionText, { color: t.textSecondary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
                "{form.q1}"
              </Text>
            </View>
          ) : null}

          <View style={[s.reminderBox, { backgroundColor: t.bg3, borderColor: t.border }]}>
            <Text style={[s.reminderText, { color: t.textTertiary }]}>
              🌙  Evening check-in available at your scheduled time
            </Text>
          </View>

          <Btn label="Back to home" onPress={() => router.back()} variant="teal" style={{ marginTop: 8 }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.tabBar, { backgroundColor: t.bg2, borderBottomColor: t.border }]}>
        {[
          { label: 'Morning',   active: true,  href: '/checkin/morning' },
          { label: 'Evening',   active: false, href: '/checkin/evening' },
          { label: 'Scorecard', active: false, href: '/checkin/scorecard' },
        ].map(tab => (
          <TouchableOpacity key={tab.label} onPress={() => router.push(tab.href as any)} style={s.tab} activeOpacity={0.7}>
            <Text style={[s.tabText, { color: tab.active ? t.blue : t.textTertiary, fontWeight: tab.active ? '500' : '400' }]}>{tab.label}</Text>
            {tab.active && <View style={[s.tabLine, { backgroundColor: t.blue }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.qBlock}>
            <Text style={[s.sectionLabel, { color: t.textTertiary }]}>State primer</Text>
            <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
              What's already working in your life that you're not giving enough credit to?
            </Text>
            <Text style={[s.qSub, { color: t.textSecondary }]}>This isn't positivity. It's pattern calibration. You can't see clearly from a deficit lens.</Text>
            <Input value={form.gratitude} onChangeText={set('gratitude')} placeholder="What's already working is…" multiline numberOfLines={3} focusColor="blue" />
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
  scroll:         { padding: 20, paddingTop: 28, paddingBottom: 40 },
  sectionLabel:   { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  question:       { fontSize: 20, lineHeight: 28, marginBottom: 8 },
  qSub:           { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  qBlock:         { marginBottom: 32 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  doneWrap:       { flex: 1, padding: 28, paddingTop: 60, alignItems: 'center' },
  doneIcon:       { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  doneIconText:   { fontSize: 28, color: '#4ecdc4' },
  doneTitle:      { fontSize: 28, textAlign: 'center', marginBottom: 14 },
  doneSub:        { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 28 },
  intentionCard:  { width: '100%', borderRadius: 16, padding: 20, borderWidth: 1, borderLeftWidth: 3, marginBottom: 20 },
  intentionLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  intentionText:  { fontSize: 16, lineHeight: 25 },
  reminderBox:    { width: '100%', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 28, alignItems: 'center' },
  reminderText:   { fontSize: 13 },
})
