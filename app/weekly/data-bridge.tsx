import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import { getWeekStart } from '../../src/lib/utils/scoring'
import { BottomNav } from '../../src/components/BottomNav'
import { Card } from '../../src/components/ui/Card'
import { Btn } from '../../src/components/ui/Btn'

interface BridgeData { daysCompleted: number; avgScore: number; lowestDim: string; topPattern: string }

export default function DataBridgeScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const [data, setData]       = useState<BridgeData>({ daysCompleted: 0, avgScore: 0, lowestDim: '', topPattern: '' })
  const [loading, setLoading] = useState(true)
  const [totalDays, setTotalDays]             = useState(0)
  const [daysSinceFirst, setDaysSinceFirst]   = useState(0)
  const weeklyUnlocked = totalDays >= 7 || daysSinceFirst >= 7

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check unlock status — fetch all morning check-in dates
      const { data: allMornings } = await supabase
        .from('morning_checkins').select('date').eq('user_id', user.id).order('date', { ascending: true })
      const morningDates = (allMornings ?? []).map((r: { date: string }) => r.date)
      const total = morningDates.length
      const first = morningDates[0]
      const sinceFirst = first
        ? Math.floor((Date.now() - new Date(first + 'T12:00:00').getTime()) / 86400000)
        : 0
      setTotalDays(total)
      setDaysSinceFirst(sinceFirst)
      if (total < 7 && sinceFirst < 7) { setLoading(false); return }

      const weekStart = getWeekStart()
      const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      const [{ data: scorecards }, { data: insights }] = await Promise.all([
        supabase.from('daily_scorecards').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEndStr),
        supabase.from('daily_insights').select('lowest_dimension').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEndStr).eq('is_saved', true),
      ])

      const daysCompleted = scorecards?.length ?? 0
      let avgScore = 0, lowestDim = ''

      if (daysCompleted > 0) {
        const dims: Record<string, number[]> = { awareness: [], intention: [], state: [], presence: [], ownership: [] }
        let total = 0, count = 0
        scorecards!.forEach((sc: Record<string, number>) => {
          Object.keys(dims).forEach(k => { if (sc[k]) { dims[k].push(sc[k]); total += sc[k]; count++ } })
        })
        avgScore = count > 0 ? parseFloat((total / count).toFixed(1)) : 0
        const avgs = Object.entries(dims).map(([k, vs]) => [k, vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0] as [string, number])
        lowestDim = avgs.filter(([, v]) => v > 0).sort(([, a], [, b]) => a - b)[0]?.[0] ?? ''
      }

      const patternCounts: Record<string, number> = {}
      insights?.forEach(i => { if (i.lowest_dimension) patternCounts[i.lowest_dimension] = (patternCounts[i.lowest_dimension] ?? 0) + 1 })
      const topPattern = Object.entries(patternCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? ''

      setData({ daysCompleted, avgScore, lowestDim, topPattern })
      setLoading(false)
    }
    load()
  }, [])

  function scoreColor(v: number) {
    if (v < 2.5) return t.coral; if (v < 3.5) return t.amber; return t.teal
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.eyebrow, { color: t.amber }]}>Weekly Reset</Text>
        <Text style={[s.title, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>Here's your week at a glance.</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {loading ? (
          <Text style={[s.loading, { color: t.textSecondary }]}>Loading your week…</Text>
        ) : !weeklyUnlocked ? (
          <View style={s.lockedWrap}>
            <Text style={s.lockIcon}>🔒</Text>
            <Text style={[s.lockedTitle, { color: t.textPrimary }]}>Not unlocked yet</Text>
            <Text style={[s.lockedSub, { color: t.textSecondary }]}>
              The Weekly Reset unlocks after 7 days of check-ins. You have{' '}
              <Text style={{ color: t.teal, fontWeight: '600' }}>{totalDays}</Text> so far.
            </Text>
            <View style={[s.progressTrack, { backgroundColor: t.bg3, borderColor: t.border }]}>
              <View style={[s.progressFill, { backgroundColor: t.teal, width: `${Math.min(100, (totalDays / 7) * 100)}%` as any }]} />
            </View>
            <Text style={[s.progressLabel, { color: t.textTertiary }]}>{totalDays}/7 days</Text>
          </View>
        ) : (
          <>
            <Text style={[s.sub, { color: t.textSecondary }]}>Before the reset — see what the data shows.</Text>

            <View style={s.statRow}>
              <Card style={{ flex: 1 }}>
                <Text style={[s.statLabel, { color: t.textTertiary }]}>Days completed</Text>
                <Text style={[s.statVal, { color: t.textPrimary }]}>
                  {data.daysCompleted}<Text style={[s.statMax, { color: t.textTertiary }]}>/7</Text>
                </Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={[s.statLabel, { color: t.textTertiary }]}>Avg score</Text>
                <Text style={[s.statVal, { color: scoreColor(data.avgScore) }]}>
                  {data.avgScore || '—'}<Text style={[s.statMax, { color: t.textTertiary }]}>/5</Text>
                </Text>
              </Card>
            </View>

            {data.lowestDim ? (
              <Card accent="amber" style={{ marginBottom: 12 }}>
                <Text style={[s.cardLabel, { color: t.amber }]}>Lowest this week</Text>
                <Text style={[s.cardVal, { color: t.textPrimary }]}>{data.lowestDim}</Text>
                <Text style={[s.cardSub, { color: t.textSecondary }]}>This showed up most as the gap.</Text>
              </Card>
            ) : null}

            {data.topPattern ? (
              <Card style={{ marginBottom: 24 }}>
                <Text style={[s.cardLabel, { color: t.textTertiary }]}>Most flagged pattern</Text>
                <Text style={[s.cardVal, { color: t.textPrimary }]}>{data.topPattern}</Text>
              </Card>
            ) : null}

            <Btn label="Now let's go deeper →" onPress={() => router.push('/weekly/reset')} variant="amber" />
          </>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  header:    { padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
  eyebrow:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  title:     { fontSize: 24, lineHeight: 30 },
  scroll:    { padding: 20, paddingBottom: 100 },
  loading:   { textAlign: 'center', marginTop: 40 },
  sub:       { fontSize: 14, marginBottom: 24 },
  statRow:   { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  statVal:   { fontSize: 32, fontWeight: '700' },
  statMax:   { fontSize: 16 },
  cardLabel:     { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  cardVal:       { fontSize: 16, fontWeight: '600', textTransform: 'capitalize', marginBottom: 4 },
  cardSub:       { fontSize: 13 },
  lockedWrap:    { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  lockIcon:      { fontSize: 48, marginBottom: 20 },
  lockedTitle:   { fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  lockedSub:     { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 28 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12 },
})
