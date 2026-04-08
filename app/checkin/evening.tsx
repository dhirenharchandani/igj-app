import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import { BottomNav } from '../../src/components/BottomNav'
import { Input } from '../../src/components/ui/Input'
import { Btn } from '../../src/components/ui/Btn'
import { Chip } from '../../src/components/ui/Chip'

const PATTERN_CHIPS = ['Avoidance', 'Overthinking', 'Reactivity', 'People-pleasing', 'Distraction', 'Seeking validation']

interface Form { q1: string; q2: string; q3: string; q4: string; q5: string }

// ── Defined OUTSIDE the screen component to prevent remount on each keystroke ──
type QProps = {
  label: string
  sub: string
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  chips?: string[]
  onChipPress?: (c: string) => void
}

function QuestionBlock({ label, sub, value, onChangeText, placeholder, chips, onChipPress }: QProps) {
  const t = useTheme()
  return (
    <View style={s.qBlock}>
      <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{label}</Text>
      <Text style={[s.qSub, { color: t.textSecondary }]}>{sub}</Text>
      <Input value={value} onChangeText={onChangeText} placeholder={placeholder} multiline numberOfLines={3} focusColor="blue" />
      {chips && onChipPress && (
        <View style={s.chips}>
          {chips.map(c => <Chip key={c} label={c} onPress={() => onChipPress(c)} />)}
        </View>
      )}
    </View>
  )
}

export default function EveningScreen() {
  const router = useRouter()
  const t      = useTheme()
  const [morningIntention, setMorningIntention] = useState('')
  const [morningDone, setMorningDone] = useState(false)
  const [form, setForm] = useState<Form>({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('morning_checkins').select('q1_intention').eq('user_id', user.id).eq('date', today).single()
      if (data?.q1_intention) { setMorningIntention(data.q1_intention); setMorningDone(true) }
    }
    load()
  }, [])

  function set(k: keyof Form) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().split('T')[0]
    if (user) {
      await supabase.from('evening_checkins').upsert({
        user_id: user.id, date: today,
        q1_delivered: form.q1, q2_pattern: form.q2, q3_gap: form.q3, q4_learning: form.q4, q5_tomorrow: form.q5,
      })
    }
    setSaving(false)
    router.push('/checkin/scorecard')
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.tabBar, { backgroundColor: t.bg2, borderBottomColor: t.border }]}>
        {[
          { label: 'Morning',   active: false, href: '/checkin/morning' },
          { label: 'Evening',   active: true,  href: '/checkin/evening' },
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

          {morningDone ? (
            <View style={[s.mirror, { backgroundColor: t.bg3, borderColor: t.border }]}>
              <Text style={[s.mirrorText, { color: t.textSecondary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
                This morning you said you needed to be: <Text style={{ fontStyle: 'italic' }}>"{morningIntention}"</Text>
              </Text>
            </View>
          ) : (
            <View style={[s.noMorning, { backgroundColor: t.amberDim, borderColor: t.amberBorder }]}>
              <Text style={[s.noMorningText, { color: t.amber }]}>You haven't done your morning check-in yet. That's okay — answer these from memory.</Text>
            </View>
          )}

          <QuestionBlock
            label="Did I show up as the person I said I'd be this morning?"
            sub="Not pass or fail. Just honest."
            value={form.q1} onChangeText={set('q1')}
            placeholder="I showed up as… / I didn't show up as…"
          />

          <View style={s.qBlock}>
            <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
              What pattern showed up today that I didn't want?
            </Text>
            <Text style={[s.qSub, { color: t.textSecondary }]}>Name the pattern, not just the event.</Text>
            <Input value={form.q2} onChangeText={set('q2')} placeholder="The pattern that showed up was…" multiline numberOfLines={3} focusColor="blue" />
            <View style={s.chips}>
              {PATTERN_CHIPS.map(c => <Chip key={c} label={c} onPress={() => setForm(f => ({ ...f, q2: c }))} />)}
            </View>
          </View>

          <QuestionBlock
            label="Where was the gap between my intention and my execution?"
            sub="Be specific. 'Everywhere' isn't an answer."
            value={form.q3} onChangeText={set('q3')}
            placeholder="The gap lived in…"
          />
          <QuestionBlock
            label="What's the one thing I'm taking from today?"
            sub="One thing. Distill it."
            value={form.q4} onChangeText={set('q4')}
            placeholder="Today taught me…"
          />
          <QuestionBlock
            label="What needs to shift tomorrow?"
            sub="Not a to-do list. What actually needs to change."
            value={form.q5} onChangeText={set('q5')}
            placeholder="Tomorrow I need to shift…"
          />

          <Btn label={saving ? 'Saving…' : 'Complete evening →'} onPress={save} variant="blue" loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1 },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabText:       { fontSize: 13 },
  tabLine:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  scroll:        { padding: 20, paddingTop: 28, paddingBottom: 40 },
  mirror:        { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 28 },
  mirrorText:    { fontSize: 15, lineHeight: 24 },
  noMorning:     { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 28 },
  noMorningText: { fontSize: 13 },
  qBlock:        { marginBottom: 32 },
  question:      { fontSize: 20, lineHeight: 28, marginBottom: 8 },
  qSub:          { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
})
