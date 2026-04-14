import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import { Input } from '../../src/components/ui/Input'
import { Btn } from '../../src/components/ui/Btn'
import { Chip } from '../../src/components/ui/Chip'
import { updateStreak } from '../../src/lib/utils/streak'
import { useStore } from '../../src/lib/store'

const CHIPS: Record<number, string[]> = {
  1: ['Patient and deliberate', 'Fully present', 'Decisive', 'Disciplined'],
  2: ['Finishing what I started', 'The conversation I\'ve been avoiding', 'Deep work, no distractions'],
  3: ['I showed up as who I said I\'d be', 'I completed the one thing', 'I closed the gap, even slightly'],
}

const QUESTIONS = [
  { q: 'Who do I need to be today?',              sub: 'Not what you need to do. Who you need to be. Identity first, actions follow.',    placeholder: 'Today I need to be someone who…' },
  { q: 'What\'s the one thing that matters most today?', sub: 'One thing. Not a list. If everything is important, nothing is.',          placeholder: 'The one thing is…' },
  { q: 'What would make today a win?',            sub: 'Be specific. Vague intentions produce vague outcomes.',                          placeholder: 'Today is a win if…' },
]

export default function FirstCheckinScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const insets  = useSafeAreaInsets()
  const markMorningDone = useStore(s => s.markMorningDone)
  const [step, setStep]     = useState(0)
  const [answers, setAnswers] = useState(['', '', ''])
  const [done, setDone]     = useState(false)

  function setAnswer(v: string) {
    const next = [...answers]; next[step] = v; setAnswers(next)
  }

  function complete() {
    // Advance immediately — never block on network
    markMorningDone()
    setDone(true)
    // Save in background — fire-and-forget
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const today = new Date().toISOString().split('T')[0]
          supabase.from('morning_checkins').upsert({
            user_id: user.id, date: today,
            q1_intention: answers[0], q2_focus: answers[1], q6_win: answers[2], is_abbreviated: true,
          }).then(() => {}).catch(() => {})
          updateStreak(user.id, supabase).catch(() => {})
        }
      } catch {
        // silently ignore — store already updated
      }
    })()
  }

  if (done) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={[s.scroll, { alignItems: 'center' }]}>
          <View style={[s.circle, { borderColor: t.teal }]}>
            <Text style={[s.check, { color: t.teal }]}>✓</Text>
          </View>
          <Text style={[s.doneTitle, { color: t.textPrimary }]}>First session done.</Text>
          <Text style={[s.doneSub, { color: t.textSecondary }]}>That's all it takes. A few minutes of honest intention. You've started the practice.</Text>
          <View style={{ width: '100%', gap: 12, marginBottom: 36 }}>
            {[
              { label: 'Who you\'re being today', text: answers[0] },
              { label: 'The one thing',            text: answers[1] },
              { label: 'What makes it a win',      text: answers[2] },
            ].map((card, i) => (
              <View key={i} style={[s.ansCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: t.blue }]}>
                <Text style={[s.ansLabel, { color: t.blue }]}>{card.label}</Text>
                <Text style={[s.ansText, { color: t.textSecondary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{card.text}</Text>
              </View>
            ))}
          </View>
          <Btn label="Set my check-in times →" onPress={() => router.push('/onboarding/schedule')} variant="teal" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const q = QUESTIONS[step]

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Progress dots */}
        <View style={s.dotsRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={{ width: i === 3 ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === 3 ? t.blue : t.bg3 }} />
          ))}
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.badge}>
            <View style={[s.dot, { backgroundColor: t.blue }]} />
            <Text style={[s.badgeText, { color: t.blue }]}>Your first session</Text>
          </View>

          <Text style={[s.qNum, { color: t.textSecondary }]}>Question {step + 1} of 3</Text>
          <Text style={[s.question, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{q.q}</Text>
          <Text style={[s.qSub, { color: t.textSecondary }]}>{q.sub}</Text>

          <Input value={answers[step]} onChangeText={setAnswer} placeholder={q.placeholder} multiline numberOfLines={4} focusColor="blue" style={{ marginBottom: 16 }} />

          <View style={s.chips}>
            {CHIPS[step + 1].map(chip => (
              <Chip key={chip} label={chip} onPress={() => setAnswer(chip)} />
            ))}
          </View>
        </ScrollView>

        {/* Fixed footer — always visible above keyboard */}
        <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
          <View style={s.navRow}>
            {step > 0 && (
              <Btn label="← Back" onPress={() => setStep(s => s - 1)} variant="ghost" style={{ flex: 0, paddingHorizontal: 20, width: 'auto' }} />
            )}
            {step < 2 ? (
              <Btn label="Next →" onPress={() => setStep(s => s + 1)} variant="blue" disabled={answers[step].trim().length < 10} />
            ) : (
              <Btn label="Complete session →" onPress={complete} variant="teal" disabled={answers[step].trim().length < 10} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  dotsRow:   { flexDirection: 'row', gap: 6, justifyContent: 'center', padding: 20, paddingBottom: 8 },
  scroll:    { padding: 24, paddingBottom: 24 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  qNum:      { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 20 },
  question:  { fontSize: 24, lineHeight: 32, marginBottom: 10 },
  qSub:      { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  footer:    { padding: 12, paddingHorizontal: 20, borderTopWidth: 1 },
  navRow:    { flexDirection: 'row', gap: 10 },
  circle:    { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  check:     { fontSize: 28 },
  doneTitle: { fontSize: 26, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  doneSub:   { fontSize: 15, lineHeight: 24, marginBottom: 36, textAlign: 'center' },
  ansCard:   { borderRadius: 16, padding: 16, borderWidth: 1, borderLeftWidth: 3 },
  ansLabel:  { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  ansText:   { fontSize: 15, lineHeight: 24 },
})
