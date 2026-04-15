import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase, getUser } from '../../src/lib/supabase'
import { WEEKLY_DIMENSIONS } from '../../src/lib/utils/pillars'
import { getWeekStart } from '../../src/lib/utils/scoring'
import { BottomNav } from '../../src/components/BottomNav'
import { DotRating } from '../../src/components/ui/DotRating'
import { Btn } from '../../src/components/ui/Btn'
import { Input } from '../../src/components/ui/Input'
import { Card } from '../../src/components/ui/Card'

const LABELS: Record<string, { low: string; mid: string; high: string }> = {
  clarity:   { low: 'No clear direction', mid: 'Some clarity', high: 'Crystal clear all week' },
  ownership: { low: 'Full blame/avoidance', mid: 'Mixed', high: '100% ownership all week' },
  presence:  { low: 'Absent most of week', mid: 'Fluctuating', high: 'Fully present when it mattered' },
  standards: { low: 'Lowered repeatedly', mid: 'Held some', high: 'Non-negotiable all week' },
  courage:   { low: 'Avoided hard things', mid: 'Took some risks', high: 'Ran toward difficulty all week' },
  growth:    { low: 'Same week repeated', mid: 'Some learning', high: 'Genuinely shifted something' },
}

function getWeeklyDotStyle(i: number, value: number) {
  if (i > value) return 'none'
  if (value <= 2) return 'coral'
  if (value === 3) return 'amber'
  return 'teal'
}

export default function WeeklyScorecardScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const [scores, setScores] = useState<Record<string, number>>({ clarity: 0, ownership: 0, presence: 0, standards: 0, courage: 0, growth: 0 })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reflection, setReflection] = useState('')
  const [focus, setFocus]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [focusSaved, setFocusSaved] = useState(false)

  const allRated = Object.values(scores).every(v => v > 0)
  const total    = Object.values(scores).reduce((a, b) => a + b, 0)

  // Fully synchronous — flips to results view immediately, saves + fetches in background
  function submit() {
    setLoading(true) // show brief "synthesising" label on button
    setSubmitted(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) { setLoading(false); return }
      const weekStart = getWeekStart()
      supabase.from('weekly_scorecards')
        .upsert({ user_id: user.id, week_start: weekStart, ...scores }, { onConflict: 'user_id,week_start' })
        .then(() => {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL
          if (!apiUrl || apiUrl.includes('192.168')) { setLoading(false); return }
          const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
          const req = fetch(`${apiUrl}/api/weekly-reflection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekStart }),
          }).then(r => r.json()).catch(() => null)
          Promise.race([req, timeout]).then(data => {
            if (data?.reflection) setReflection(data.reflection)
            if (data?.suggestedShift) setFocus(data.suggestedShift)
          }).catch(() => {}).finally(() => setLoading(false))
        }).catch(() => { setLoading(false) })
    }).catch(() => { setLoading(false) })
  }

  async function saveFocus() {
    setSaving(true)
    try {
      const user = await getUser()
      if (user) {
        await supabase.from('weekly_reflections').upsert({ user_id: user.id, week_start: getWeekStart(), next_week_focus: focus }, { onConflict: 'user_id,week_start' })
      }
      setFocusSaved(true) // only mark saved on success
    } catch (e) {
      console.error('Save weekly focus failed:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.eyebrow, { color: t.amber }]}>Weekly Reset</Text>
        <Text style={[s.title, { color: t.textPrimary }]}>Weekly scorecard</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {!submitted ? (
            <>
              <Text style={[s.sub, { color: t.textSecondary }]}>Six dimensions. Did you live this, or just say it?</Text>

              {WEEKLY_DIMENSIONS.map(dim => {
                return (
                  <View key={dim.key} style={s.dimBlock}>
                    <View style={s.dimHeader}>
                      <Text style={[s.dimLabel, { color: t.textPrimary }]}>{dim.label}</Text>
                      {scores[dim.key] > 0 && <Text style={[s.dimScore, { color: t.textSecondary }]}>{scores[dim.key]}/5</Text>}
                    </View>
                    <Text style={[s.dimDesc, { color: t.textSecondary }]}>{dim.description}</Text>
                    <DotRating
                      value={scores[dim.key]}
                      onChange={v => setScores(ss => ({ ...ss, [dim.key]: v }))}
                    />
                    {scores[dim.key] > 0 && (
                      <Text style={[s.dimHint, { color: t.textTertiary }]}>
                        {scores[dim.key] <= 2 ? LABELS[dim.key]?.low : scores[dim.key] === 3 ? LABELS[dim.key]?.mid : LABELS[dim.key]?.high}
                      </Text>
                    )}
                  </View>
                )
              })}

              <View style={[s.totalRow, { borderTopColor: t.border }]}>
                <Text style={[s.totalLabel, { color: t.textSecondary }]}>Total</Text>
                <Text style={[s.totalVal, { color: t.textPrimary }]}>{total} / 30</Text>
              </View>

              <Btn label={loading ? 'Synthesising your week…' : 'See your weekly reflection →'} onPress={submit} variant="amber" disabled={!allRated || loading} loading={loading} />
            </>
          ) : (
            <>
              <Text style={[s.reflLabel, { color: t.amber }]}>Your week, reflected back.</Text>
              <Card accent="amber" style={{ marginBottom: 24, backgroundColor: t.bg3 }}>
                <Text style={[s.reflText, { color: t.textSecondary }]}>{reflection}</Text>
              </Card>

              <Text style={[s.focusLabel, { color: t.textPrimary }]}>Next week's focus:</Text>
              <Input value={focus} onChangeText={setFocus} placeholder="What you'll shift next week…" multiline numberOfLines={3} focusColor="amber" style={{ marginBottom: 10 }} />
              <Btn label={focusSaved ? '✓ Saved' : saving ? 'Saving…' : 'Save focus'} onPress={saveFocus} variant="ghost" disabled={saving || focusSaved} style={{ marginBottom: 12 }} />
              <Btn label="Close the week →" onPress={() => router.replace('/dashboard')} variant="amber" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  header:    { padding: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  eyebrow:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  title:     { fontSize: 20, fontWeight: '600' },
  scroll:    { padding: 20, paddingTop: 24, paddingBottom: 100 },
  sub:       { fontSize: 13, marginBottom: 28 },
  dimBlock:  { marginBottom: 28 },
  dimHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dimLabel:  { fontSize: 15, fontWeight: '600' },
  dimScore:  { fontSize: 13 },
  dimDesc:   { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  dimHint:   { fontSize: 11, marginTop: 6 },
  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, marginBottom: 24 },
  totalLabel:{ fontSize: 14 },
  totalVal:  { fontSize: 20, fontWeight: '700' },
  reflLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 },
  reflText:  { fontSize: 15, lineHeight: 26 },
  focusLabel:{ fontSize: 13, fontWeight: '500', marginBottom: 10 },
})
