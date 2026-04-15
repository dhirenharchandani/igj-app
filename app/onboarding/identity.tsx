import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase, getUser } from '../../src/lib/supabase'
import { Input } from '../../src/components/ui/Input'
import { Btn } from '../../src/components/ui/Btn'
import { Chip } from '../../src/components/ui/Chip'

const GAP_CHIPS = [
  "I know what to do but I don't consistently do it",
  "I react emotionally when I should respond with intention",
  "I start strong but lose momentum before the finish",
  "I'm building the business but losing myself in the process",
  "I chase distraction instead of doing the hard thing",
  "I play small to avoid the risk of going all in",
  "I repeat the same patterns no matter how much I learn",
  "I sacrifice depth for the appearance of productivity",
  "I put everyone else first and run on empty",
  "I'm successful on paper but disconnected from purpose",
]

type Step = 1 | 2 | 3 | 4

const GOALS = [
  { value: 'inner_clarity',       label: 'Inner Clarity',         desc: 'I know what I want. I don\'t know why I keep getting in my own way.' },
  { value: 'identity_beliefs',    label: 'Identity & Beliefs',    desc: 'The story I tell about myself is the thing holding me back most.' },
  { value: 'emotional_resilience',label: 'Emotional Resilience',  desc: 'My patterns under pressure are the problem. I react when I should respond.' },
] as const

function ProgressDots({ current }: { current: number }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{
          width: i === current ? 20 : 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i === current ? t.purple : t.bg3,
        }} />
      ))}
    </View>
  )
}

export default function IdentityScreen() {
  const router = useRouter()
  const t      = useTheme()
  const [step, setStep]     = useState<Step>(1)
  const [gapText, setGapText] = useState('')
  const [goal, setGoal]     = useState('')

  async function saveAndContinue() {
    // Navigate immediately — save in background so there's no wait
    setStep(4)
    const user = await getUser()
    if (user) {
      supabase.from('user_profiles').upsert({
        id: user.id,
        identity_gap_text: gapText, focus_pillar: goal,
      }).then(() => {}).catch(() => {})
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.dotsContainer}>
          <ProgressDots current={step === 4 ? 2 : step === 3 ? 2 : step} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {step === 1 && (
            <View>
              <Text style={[s.stepLabel, { color: t.purple }]}>Step 1 of 4 · Your gap</Text>
              <Text style={[s.heading, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
                What's the gap between who you are and who you're capable of being?
              </Text>
              <Text style={[s.sub, { color: t.textSecondary }]}>No right answer. Write what's actually true right now.</Text>
              <Input value={gapText} onChangeText={setGapText} placeholder="The gap I keep running into is…" multiline numberOfLines={4} focusColor="purple" style={{ marginBottom: 14 }} />
              <Text style={[s.chipsLabel, { color: t.textTertiary }]}>Common gaps — tap to use</Text>
              <View style={s.chips}>
                {GAP_CHIPS.map(chip => (
                  <Chip key={chip} label={chip} onPress={() => setGapText(chip)} />
                ))}
              </View>
              <Btn label="Continue →" onPress={() => setStep(2)} variant="purple" disabled={gapText.trim().length < 10} />
            </View>
          )}

          {step === 2 && (
            <View>
              <TouchableOpacity onPress={() => setStep(1)} style={s.back}>
                <Text style={[s.backText, { color: t.textSecondary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[s.heading2, { color: t.textPrimary }]}>Which of these feels most urgent right now?</Text>
              <Text style={[s.sub, { color: t.textSecondary }]}>Pick one. Force the choice — that's the first act of clarity.</Text>
              <View style={{ gap: 12, marginBottom: 24 }}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    onPress={() => setGoal(g.value)}
                    activeOpacity={0.8}
                    style={[s.goalCard, {
                      backgroundColor: goal === g.value ? t.purpleDim : t.bg3,
                      borderColor: goal === g.value ? t.purple : t.border,
                      borderLeftWidth: goal === g.value ? 3 : 1,
                      borderLeftColor: goal === g.value ? t.purple : t.border,
                    }]}
                  >
                    <Text style={[s.goalTitle, { color: t.textPrimary }]}>{g.label}</Text>
                    <Text style={[s.goalDesc, { color: t.textSecondary }]}>{g.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Btn label="This is my focus →" onPress={() => setStep(3)} variant="purple" disabled={!goal} />
            </View>
          )}

          {step === 3 && (
            <View style={{ alignItems: 'center' }}>
              <View style={[s.circle, { backgroundColor: t.purpleDim, borderColor: t.purple }]}>
                <Text style={{ fontSize: 28, color: t.purple }}>✓</Text>
              </View>
              <Text style={[s.heading2, { color: t.textPrimary, textAlign: 'center' }]}>Your starting point is set.</Text>
              <Text style={[s.sub, { color: t.textSecondary, textAlign: 'center' }]}>What you just named is the work. The journal will help you track the patterns underneath it.</Text>
              <View style={[s.gapCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: t.purple }]}>
                <Text style={[s.gapLabel, { color: t.purple }]}>Your gap</Text>
                <Text style={[s.gapText, { color: t.textSecondary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{gapText}</Text>
              </View>
              <View style={[s.gapCard, { backgroundColor: t.bg2, borderColor: t.border, borderLeftColor: t.purple }]}>
                <Text style={[s.gapLabel, { color: t.purple }]}>Your focus</Text>
                <Text style={[s.focusValue, { color: t.textPrimary }]}>{GOALS.find(g => g.value === goal)?.label}</Text>
                <Text style={[s.focusDesc, { color: t.textSecondary }]}>{GOALS.find(g => g.value === goal)?.desc}</Text>
              </View>
              <Btn label="Start your first session →" onPress={saveAndContinue} variant="purple" style={{ marginTop: 16 }} />
              <TouchableOpacity onPress={() => setStep(2)} style={{ marginTop: 16 }}>
                <Text style={[s.backText, { color: t.textSecondary }]}>Change my focus</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 4 && (
            <View style={{ alignItems: 'center' }}>
              <View style={[s.circle, { backgroundColor: t.tealDim, borderColor: t.teal }]}>
                <Text style={{ fontSize: 28, color: t.teal }}>▶</Text>
              </View>
              <Text style={[s.heading2, { color: t.textPrimary, textAlign: 'center' }]}>First session, starting now.</Text>
              <Text style={[s.sub, { color: t.textSecondary, textAlign: 'center' }]}>This is an abbreviated check-in — just 3 questions. No pressure.</Text>
              <Btn label="Begin →" onPress={() => router.push('/onboarding/first-checkin')} variant="teal" style={{ marginTop: 24 }} />
              <Text style={[s.hint, { color: t.textSecondary }]}>Takes about 3 minutes</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  dotsContainer: { paddingTop: 20, paddingHorizontal: 24 },
  scroll:      { padding: 24, paddingBottom: 48 },
  stepLabel:   { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 20 },
  heading:     { fontSize: 26, lineHeight: 34, marginBottom: 12 },
  heading2:    { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  sub:         { fontSize: 14, lineHeight: 22, marginBottom: 28 },
  back:        { marginBottom: 24 },
  backText:    { fontSize: 14 },
  chipsLabel:  { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  goalCard:    { borderRadius: 14, padding: 16, borderWidth: 1 },
  goalTitle:   { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  goalDesc:    { fontSize: 13, lineHeight: 20 },
  circle:      { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  gapCard:     { borderRadius: 16, padding: 20, borderWidth: 1, borderLeftWidth: 3, marginBottom: 16, width: '100%' },
  gapLabel:    { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  gapText:     { fontSize: 15, lineHeight: 24 },
  focusValue:  { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  focusDesc:   { fontSize: 13, lineHeight: 20 },
  hint:        { fontSize: 12, marginTop: 12 },
})
