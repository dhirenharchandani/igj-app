import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/ThemeContext'
import { supabase } from '../src/lib/supabase'
import { Btn } from '../src/components/ui/Btn'
import { ProgressBar } from '../src/components/ui/ProgressBar'
import { BottomNav } from '../src/components/BottomNav'

const AREAS = [
  { key: 'body_energy',    label: 'Body & Energy',          desc: 'Sleep, movement, and nutrition aren\'t afterthoughts — they\'re the foundation everything else is built on.' },
  { key: 'mind_dialogue',  label: 'Mind & Inner Dialogue',  desc: 'I\'m aware of the voice in my head. I don\'t believe every thought. I direct my mental state.' },
  { key: 'intimacy',       label: 'Intimacy & Presence',    desc: 'My closest relationship gets my real presence, not my leftovers.' },
  { key: 'family',         label: 'Family & Roots',         desc: 'I\'m building connection, not just coexisting. My family knows I\'m in their corner.' },
  { key: 'circle',         label: 'Circle & Influence',     desc: 'The people around me raise the standard. I invest in relationships that challenge and expand me.' },
  { key: 'purpose',        label: 'Purpose & Impact',       desc: 'My work is an expression of something real. I\'m not just executing tasks.' },
  { key: 'experiences',    label: 'Experiences & Aliveness', desc: 'I\'m creating a life worth living, not just managing one.' },
  { key: 'alignment',      label: 'Inner Alignment',        desc: 'My actions match my values. I\'m not performing a version of myself.' },
  { key: 'wealth',         label: 'Wealth & Responsibility', desc: 'I take full ownership of my financial reality. Building, not just earning.' },
  { key: 'growth',         label: 'Growth & Curiosity',     desc: 'I\'m always in the game of becoming. I seek feedback. I question assumptions.' },
]

function getColor(v: number, t: { coral: string; amber: string; teal: string }): string {
  if (v <= 3) return t.coral; if (v <= 6) return t.amber; return t.teal
}

export default function AssessmentScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const [current, setCurrent] = useState(0)
  const [scores, setScores]   = useState<Record<string, number>>({})
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  const area  = AREAS[current]
  const score = scores[area.key] ?? 0

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('life_assessments').insert({ user_id: user.id, ...scores })
    }
    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={[s.eyebrow, { color: t.purple }]}>Assessment complete</Text>
          <Text style={[s.doneTitle, { color: t.textPrimary }]}>Your baseline is set.</Text>
          <View style={{ gap: 8, marginBottom: 32 }}>
            {AREAS.map(a => (
              <View key={a.key} style={s.barRow}>
                <Text style={[s.barLabel, { color: t.textSecondary }]}>{a.label}</Text>
                <View style={[s.barTrack, { backgroundColor: t.bg3, flex: 1 }]}>
                  <View style={[s.barFill, { width: `${(scores[a.key] ?? 0) * 10}%`, backgroundColor: getColor(scores[a.key] ?? 0, t) }]} />
                </View>
                <Text style={[s.barVal, { color: getColor(scores[a.key] ?? 0, t) }]}>{scores[a.key] ?? 0}</Text>
              </View>
            ))}
          </View>
          <Btn label="Back to dashboard →" onPress={() => router.replace('/dashboard')} variant="teal" />
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={s.progressArea}>
        <View style={s.progressHeader}>
          <Text style={[s.eyebrow, { color: t.purple }]}>Whole life assessment</Text>
          <Text style={[s.counter, { color: t.textTertiary }]}>{current + 1}/{AREAS.length}</Text>
        </View>
        <ProgressBar value={((current + 1) / AREAS.length) * 100} color={t.purple} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.areaTitle, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>{area.label}</Text>
        <Text style={[s.areaDesc, { color: t.textSecondary }]}>{area.desc}</Text>

        <Text style={[s.rateQ, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>Not where you want to be. Where you actually are.</Text>
        <Text style={[s.rateHint, { color: t.textTertiary }]}>Rate 1 (very low) to 10 (excellent)</Text>

        <View style={s.ratingGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <TouchableOpacity
              key={i}
              onPress={() => setScores(ss => ({ ...ss, [area.key]: i }))}
              activeOpacity={0.7}
              style={[s.ratingBtn, {
                backgroundColor: i <= score ? getColor(score, t) : t.bg3,
                borderColor: i <= score ? getColor(score, t) : t.border,
              }]}
            >
              <Text style={[s.ratingNum, {
                color: i <= score ? (score <= 6 ? '#0e0e0c' : '#fff') : t.textTertiary,
              }]}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {score > 0 && (
          <View style={[s.scoreBarTrack, { backgroundColor: t.bg3 }]}>
            <View style={[s.scoreBarFill, { width: `${score * 10}%`, backgroundColor: getColor(score, t) }]} />
          </View>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[s.bottom, { backgroundColor: t.bg2, borderTopColor: t.border }]}>
        {current > 0 && (
          <TouchableOpacity onPress={() => setCurrent(c => c - 1)} style={[s.backBtn, { backgroundColor: t.bg3, borderColor: t.border }]} activeOpacity={0.8}>
            <Text style={[s.backBtnText, { color: t.textSecondary }]}>←</Text>
          </TouchableOpacity>
        )}
        {current < AREAS.length - 1 ? (
          <Btn label="Next →" onPress={() => setCurrent(c => c + 1)} variant="purple" disabled={!score} />
        ) : (
          <Btn label={saving ? 'Saving…' : 'Save my assessment →'} onPress={save} variant="purple" disabled={!score || saving} loading={saving} />
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  progressArea: { padding: 16, paddingBottom: 16 },
  progressHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eyebrow:      { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4 },
  counter:      { fontSize: 12 },
  scroll:       { padding: 20, paddingBottom: 24 },
  areaTitle:    { fontSize: 24, lineHeight: 32, marginBottom: 12 },
  areaDesc:     { fontSize: 15, lineHeight: 24, marginBottom: 36 },
  rateQ:        { fontSize: 17, lineHeight: 26, marginBottom: 8 },
  rateHint:     { fontSize: 13, marginBottom: 24 },
  ratingGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  ratingBtn:    { width: '18%', aspectRatio: 1.2, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ratingNum:    { fontSize: 14, fontWeight: '600' },
  scoreBarTrack:{ height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  bottom:       { flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 20, borderTopWidth: 1 },
  backBtn:      { padding: 14, borderRadius: 14, borderWidth: 1, paddingHorizontal: 20 },
  backBtnText:  { fontSize: 16 },
  doneTitle:    { fontSize: 24, fontWeight: '600', marginBottom: 28 },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barLabel:     { fontSize: 12, width: 130 },
  barTrack:     { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },
  barVal:       { fontSize: 12, fontWeight: '600', width: 20, textAlign: 'right' },
})
