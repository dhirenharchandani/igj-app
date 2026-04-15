import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../src/ThemeContext'
import { supabase, getUser } from '../../src/lib/supabase'
import { useStore } from '../../src/lib/store'
import { DAILY_DIMENSIONS } from '../../src/lib/utils/pillars'
import { BottomNav } from '../../src/components/BottomNav'
import { DotRating } from '../../src/components/ui/DotRating'
import { Btn } from '../../src/components/ui/Btn'

const LABELS: Record<string, { low: string; mid: string; high: string }> = {
  awareness: { low: 'Autopilot', mid: 'Some self-observation', high: 'Full pattern awareness' },
  intention: { low: 'Reacted all day', mid: 'Partial alignment', high: 'Lived my intention fully' },
  state:     { low: 'Scattered/low', mid: 'Functional', high: 'Peak state throughout' },
  presence:  { low: 'Distracted and absent', mid: 'Mostly present', high: 'Fully in each moment' },
  ownership: { low: 'Blamed and avoided', mid: 'Mixed accountability', high: 'Full ownership' },
}

export default function ScorecardScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const { markScorecardDone } = useStore()
  const [scores, setScores] = useState<Record<string, number>>({ awareness: 0, intention: 0, state: 0, presence: 0, ownership: 0 })
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState('')
  const [lowestDim, setLowestDim] = useState('')
  const [saved, setSaved] = useState(false)
  const [morningIntention, setMorningIntention] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  useFocusEffect(useCallback(() => {
    setLoadingData(true)
    async function loadMorning() {
      try {
        const user = await getUser()
        if (!user) { setLoadingData(false); return }
        const today = new Date().toISOString().split('T')[0]
        const timeout = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 6000)
        )
        const { data } = await Promise.race([
          supabase
            .from('morning_checkins')
            .select('q1_intention')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle(),
          timeout,
        ])
        setMorningIntention(data?.q1_intention ?? '')
      } catch {
        // ignore — morningIntention stays empty, not a blocking error
      } finally {
        setLoadingData(false)
      }
    }
    loadMorning()
  }, []))

  const total    = Object.values(scores).reduce((a, b) => a + b, 0)
  const allRated = Object.values(scores).every(v => v > 0)

  async function submit() {
    setLoading(true)
    // Mark done immediately — never block on network
    markScorecardDone()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      const today = new Date().toISOString().split('T')[0]
      if (user) {
        // Save scorecard (fast)
        await supabase.from('daily_scorecards').upsert(
          { user_id: user.id, date: today, ...scores },
          { onConflict: 'user_id,date' }
        )
        // Fetch AI insight with hard 5s timeout using Promise.race
        try {
          const insightTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
          const insightFetch = fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/insight`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ date: today }),
          }).then(r => r.json()).catch(() => null)

          const result = await Promise.race([insightFetch, insightTimeout])
          if (result?.insight) setInsight(result.insight)
          if (result?.lowestDimension) setLowestDim(result.lowestDimension)
        } catch {
          // API unreachable — scorecard still saved, insight skipped
        }
      }
    } catch (e) {
      console.error('Scorecard submit failed:', e)
    } finally {
      setLoading(false)
    }
  }

  async function saveInsight() {
    try {
      const user = await getUser()
      const today = new Date().toISOString().split('T')[0]
      if (user) {
        await supabase.from('daily_insights').update({ is_saved: true }).eq('user_id', user.id).eq('date', today)
      }
    } catch (e) {
      console.error('Save insight failed:', e)
    } finally {
      setSaved(true)
    }
  }

  if (loadingData) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.blue} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={[s.tabBar, { backgroundColor: t.bg2, borderBottomColor: t.border }]}>
        {[
          { label: 'Morning',   active: false, href: '/checkin/morning' },
          { label: 'Evening',   active: false, href: '/checkin/evening' },
          { label: 'Scorecard', active: true,  href: '/checkin/scorecard' },
        ].map(tab => (
          <TouchableOpacity key={tab.label} onPress={() => router.push(tab.href as any)} style={s.tab} activeOpacity={0.7}>
            <Text style={[s.tabText, { color: tab.active ? t.blue : t.textSecondary, fontWeight: tab.active ? '500' : '400' }]}>{tab.label}</Text>
            {tab.active && <View style={[s.tabLine, { backgroundColor: t.blue }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {!insight ? (
          <>
            <Text style={[s.title, { color: t.textPrimary }]}>Daily scorecard</Text>
            <Text style={[s.sub, { color: t.textSecondary }]}>Rate each dimension honestly. This feeds your pattern data.</Text>

            {!!morningIntention && (
              <View style={[s.intentionMirror, { backgroundColor: t.bg3, borderColor: t.border, borderLeftColor: t.blue }]}>
                <Text style={[s.intentionLabel, { color: t.blue }]}>THIS MORNING YOU SAID</Text>
                <Text style={[s.intentionText, { color: t.textPrimary }]}>"{morningIntention}"</Text>
                <Text style={[s.intentionCta, { color: t.textSecondary }]}>Score the day through that lens.</Text>
              </View>
            )}

            {DAILY_DIMENSIONS.map(dim => (
              <View key={dim.key} style={s.dimBlock}>
                <View style={s.dimHeader}>
                  <Text style={[s.dimLabel, { color: t.textPrimary }]}>{dim.label}</Text>
                  {scores[dim.key] > 0 && <Text style={[s.dimScore, { color: t.textSecondary }]}>{scores[dim.key]}/5</Text>}
                </View>
                <Text style={[s.dimDesc, { color: t.textSecondary }]}>{dim.description}</Text>
                <DotRating value={scores[dim.key]} onChange={v => setScores(s => ({ ...s, [dim.key]: v }))} />
                {scores[dim.key] > 0 && (
                  <Text style={[s.dimHint, { color: t.textTertiary }]}>
                    {scores[dim.key] <= 2 ? LABELS[dim.key]?.low : scores[dim.key] === 3 ? LABELS[dim.key]?.mid : LABELS[dim.key]?.high}
                  </Text>
                )}
              </View>
            ))}

            <View style={[s.totalRow, { borderTopColor: t.border }]}>
              <Text style={[s.totalLabel, { color: t.textSecondary }]}>Total</Text>
              <Text style={[s.totalVal, { color: t.textPrimary }]}>{total} / 25</Text>
            </View>

            <Btn label={loading ? 'Reading your day…' : "See today's pattern →"} onPress={submit} variant="blue" disabled={!allRated || loading} loading={loading} />
          </>
        ) : (
          <>
            <Text style={[s.patternLabel, { color: t.blue }]}>Your pattern today</Text>
            <View style={[s.insightCard, { backgroundColor: t.bg3, borderColor: t.border, borderLeftColor: t.blue }]}>
              <Text style={[s.insightText, { color: t.textSecondary }]}>{insight}</Text>
            </View>

            {lowestDim ? (
              <View style={[s.focusArea, { backgroundColor: t.blueDim, borderColor: t.blueBorder }]}>
                <Text style={[s.focusText, { color: t.blue }]}>Focus area: <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{lowestDim}</Text></Text>
              </View>
            ) : null}

            <Btn label={saved ? '✓ Insight saved' : 'Save this insight'} onPress={saveInsight} variant="ghost" disabled={saved} style={{ marginBottom: 12 }} />
            <Btn label="Done for today →" onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} variant="teal" />
          </>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  tabBar:      { flexDirection: 'row', borderBottomWidth: 1 },
  tab:         { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabText:     { fontSize: 13 },
  tabLine:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  scroll:      { padding: 20, paddingTop: 28, paddingBottom: 100 },
  title:       { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  sub:         { fontSize: 13, marginBottom: 28 },
  dimBlock:    { marginBottom: 28 },
  dimHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  dimLabel:    { fontSize: 15, fontWeight: '600' },
  dimScore:    { fontSize: 13 },
  dimDesc:     { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  dimHint:     { fontSize: 11, marginTop: 6 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, marginBottom: 24 },
  totalLabel:  { fontSize: 14 },
  totalVal:    { fontSize: 20, fontWeight: '700' },
  patternLabel:{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 },
  insightCard: { borderRadius: 16, padding: 20, borderWidth: 1, borderLeftWidth: 3, marginBottom: 24 },
  insightText: { fontSize: 15, lineHeight: 26 },
  focusArea:   { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 24 },
  focusText:   { fontSize: 12 },
  intentionMirror: { borderRadius: 14, padding: 16, borderWidth: 1, borderLeftWidth: 3, marginBottom: 28 },
  intentionLabel:  { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  intentionText:   { fontSize: 15, lineHeight: 24, fontStyle: 'italic', marginBottom: 6 },
  intentionCta:    { fontSize: 12 },
})
