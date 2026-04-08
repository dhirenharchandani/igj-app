import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/ThemeContext'
import { supabase } from '../src/lib/supabase'
import { BottomNav } from '../src/components/BottomNav'
import { Card } from '../src/components/ui/Card'
import { Btn } from '../src/components/ui/Btn'
import { getWeekStart, isSunday } from '../src/lib/utils/scoring'
import { getRecommendedChapter } from '../src/lib/utils/pillars'

interface RecentEntry { date: string; total: number | null; morningDone: boolean; eveningDone: boolean }

interface DashState {
  streak: number; longestStreak: number; totalDays: number
  lowestDim: string; gapText: string; todayScore: number | null
  recentEntries: RecentEntry[]; insightText: string
  milestoneShown: boolean; milestoneSummary: string; loadingMilestone: boolean
  morningDone: boolean; eveningDone: boolean; scorecardDone: boolean; weeklyResetDone: boolean
  loading: boolean
}

const PHASES = [
  { label: 'Set the Field', icon: '☀️' },
  { label: 'Harvest',       icon: '🌙' },
  { label: 'Score',         icon: '📊' },
]

export default function DashboardScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const sunday  = isSunday()

  const [state, setState] = useState<DashState>({
    streak: 0, longestStreak: 0, totalDays: 0, lowestDim: '', gapText: '',
    todayScore: null, recentEntries: [], insightText: '',
    milestoneShown: false, milestoneSummary: '', loadingMilestone: false,
    morningDone: false, eveningDone: false, scorecardDone: false, weeklyResetDone: false,
    loading: true,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState(s => ({ ...s, loading: false })); return }

      const today     = new Date().toISOString().split('T')[0]
      const weekStart = getWeekStart()

      const [
        { data: streakRow },
        { data: profile },
        { data: morning },
        { data: evening },
        { data: scorecard },
        { data: weeklyReset },
        { data: todayScore },
        { data: recentScorecards },
        { data: recentMornings },
        { data: recentEvenings },
        { data: insight },
      ] = await Promise.all([
        supabase.from('user_streaks').select('current_streak,longest_streak,total_days').eq('user_id', user.id).single(),
        supabase.from('user_profiles').select('identity_gap_text').eq('id', user.id).single(),
        supabase.from('morning_checkins').select('id').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('evening_checkins').select('id').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_scorecards').select('id').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('weekly_resets').select('id').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('daily_scorecards').select('awareness,intention,state,presence,ownership').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_scorecards').select('date,awareness,intention,state,presence,ownership').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
        supabase.from('morning_checkins').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
        supabase.from('evening_checkins').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
        supabase.from('daily_insights').select('insight_text').eq('user_id', user.id).eq('date', today).maybeSingle(),
      ])

      // Today's score
      let todayScoreVal: number | null = null
      if (todayScore) {
        const sc = todayScore as Record<string, number>
        const vals = [sc.awareness, sc.intention, sc.state, sc.presence, sc.ownership].filter(Boolean)
        todayScoreVal = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
      }

      // Recent entries
      const morningDates = new Set((recentMornings ?? []).map((r: { date: string }) => r.date))
      const eveningDates = new Set((recentEvenings ?? []).map((r: { date: string }) => r.date))
      const scoreMap = new Map<string, number>()
      ;(recentScorecards ?? []).forEach((sc: Record<string, number | string>) => {
        const vals = [sc.awareness, sc.intention, sc.state, sc.presence, sc.ownership]
          .filter((v): v is number => typeof v === 'number')
        if (vals.length) scoreMap.set(sc.date as string, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10)
      })
      const recentEntries: RecentEntry[] = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        return { date: dateStr, total: scoreMap.get(dateStr) ?? null, morningDone: morningDates.has(dateStr), eveningDone: eveningDates.has(dateStr) }
      })

      // Lowest dim
      let lowestDim = ''
      if (recentScorecards?.length) {
        const dims: Record<string, number[]> = { awareness: [], intention: [], state: [], presence: [], ownership: [] }
        recentScorecards.forEach((sc: Record<string, number>) => Object.keys(dims).forEach(k => { if (sc[k]) dims[k].push(sc[k]) }))
        const avgs = Object.entries(dims).map(([k, vs]) => [k, vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0] as [string, number])
        lowestDim = avgs.filter(([, v]) => v > 0).sort(([, a], [, b]) => a - b)[0]?.[0] ?? ''
      }

      const currentStreak = streakRow?.current_streak ?? 0
      const showMilestone = [7, 30].includes(currentStreak) && !!morning

      setState(prev => ({
        ...prev,
        streak: currentStreak,
        longestStreak: streakRow?.longest_streak ?? 0,
        totalDays: streakRow?.total_days ?? 0,
        lowestDim, gapText: profile?.identity_gap_text ?? '',
        todayScore: todayScoreVal, recentEntries,
        insightText: insight?.insight_text ?? '',
        milestoneShown: showMilestone,
        morningDone: !!morning, eveningDone: !!evening,
        scorecardDone: !!scorecard, weeklyResetDone: !!weeklyReset,
        loading: false,
      }))

      if (showMilestone) {
        setState(prev => ({ ...prev, loadingMilestone: true }))
        try {
          const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/streak-summary`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streakDays: currentStreak }),
          })
          const data = await res.json()
          setState(prev => ({ ...prev, milestoneSummary: data.summary ?? '', loadingMilestone: false }))
        } catch { setState(prev => ({ ...prev, loadingMilestone: false })) }
      }
    }
    load()
  }, [])

  // ── Sequential hero: morning ALWAYS first, regardless of time ──
  function getHero() {
    if (!state.morningDone) return {
      phase: 1,
      heading: 'Set the field for today.',
      sub: '5 minutes. Identity first — actions follow.',
      btn: 'Start morning →', href: '/checkin/morning', color: t.blue,
    }
    if (!state.eveningDone) return {
      phase: 2,
      heading: 'Time to harvest your day.',
      sub: 'What did today reveal about you?',
      btn: 'Start evening →', href: '/checkin/evening', color: t.purple,
    }
    if (!state.scorecardDone) return {
      phase: 3,
      heading: 'Score the day.',
      sub: 'Rate the 5 dimensions before you close it.',
      btn: 'Daily scorecard →', href: '/checkin/scorecard', color: t.teal,
    }
    return {
      phase: 0,
      heading: 'Today is complete.',
      sub: state.todayScore
        ? `You scored ${state.todayScore}/5 today. ${state.streak} day streak.`
        : `${state.streak} day streak. Keep going.`,
      btn: state.insightText ? "Read today's insight →" : undefined, href: '/patterns', color: t.teal,
    }
  }

  const hero = getHero()
  const phaseStatus = [state.morningDone, state.eveningDone, state.scorecardDone]
  const recommended = getRecommendedChapter(state.lowestDim)

  function fmtDate(dateStr: string) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (state.loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.textTertiary, fontSize: 14 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.logo, { color: t.teal }]}>Inner Game Journal</Text>
        <View style={[s.streakBadge, { backgroundColor: t.bg3, borderColor: t.border }]}>
          <Text style={s.fire}>🔥</Text>
          <Text style={[s.streakText, { color: t.textPrimary }]}>{state.streak} day{state.streak !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>

        {/* Phase progress */}
        <View style={s.phases}>
          {PHASES.map((p, i) => (
            <View key={p.label} style={[s.phaseBox, {
              backgroundColor: phaseStatus[i] ? t.tealDim : hero.phase === i + 1 ? t.bg2 : t.bg3,
              borderColor: phaseStatus[i] ? t.tealBorder : hero.phase === i + 1 ? t.border : 'transparent',
              opacity: !phaseStatus[i] && hero.phase !== i + 1 && hero.phase !== 0 ? 0.4 : 1,
            }]}>
              <Text style={s.phaseIcon}>{phaseStatus[i] ? '✓' : p.icon}</Text>
              <Text style={[s.phaseLabel, { color: phaseStatus[i] ? t.teal : t.textTertiary }]}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* Hero CTA */}
        <View style={[s.heroCard, { backgroundColor: t.bg2, borderLeftColor: hero.color }]}>
          {hero.phase > 0 && (
            <Text style={[s.phaseNum, { color: t.textTertiary }]}>Phase {hero.phase} of 3</Text>
          )}
          <Text style={[s.heroTitle, { color: t.textPrimary }]}>{hero.heading}</Text>
          <Text style={[s.heroSub, { color: t.textSecondary, marginBottom: hero.btn ? 18 : 0 }]}>{hero.sub}</Text>
          {hero.btn && (
            <TouchableOpacity onPress={() => router.push(hero.href as any)} activeOpacity={0.8}
              style={[s.heroBtn, { backgroundColor: hero.color }]}>
              <Text style={s.heroBtnText}>{hero.btn}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sunday weekly reset banner */}
        {sunday && !state.weeklyResetDone && (
          <View style={[s.sundayBanner, { backgroundColor: t.amberDim, borderColor: t.amberBorder }]}>
            <Text style={[s.sundayTitle, { color: t.textPrimary }]}>📅 Sunday — Weekly Reset</Text>
            <Text style={[s.sundaySub, { color: t.textSecondary }]}>Review the week. Find the pattern. Set the standard.</Text>
            <TouchableOpacity onPress={() => router.push('/weekly/data-bridge')} activeOpacity={0.8}
              style={[s.ghostBtn, { borderColor: t.amberBorder }]}>
              <Text style={[s.ghostBtnText, { color: t.amber }]}>Start weekly reset →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Streak',  value: `${state.streak}d` },
            { label: 'Longest', value: `${state.longestStreak}d` },
            { label: 'Total',   value: `${state.totalDays}d` },
          ].map(stat => (
            <View key={stat.label} style={[s.statBox, { backgroundColor: t.bg3, borderColor: t.border }]}>
              <Text style={[s.statValue, { color: t.textPrimary }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: t.textTertiary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent entries */}
        {state.recentEntries.some(e => e.morningDone || e.eveningDone) && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.sectionLabel, { color: t.textTertiary }]}>Recent entries</Text>
            {state.recentEntries.filter(e => e.morningDone || e.eveningDone).map(entry => (
              <View key={entry.date} style={[s.entryRow, { backgroundColor: t.bg2, borderColor: t.border }]}>
                <View>
                  <Text style={[s.entryDate, { color: t.textPrimary }]}>{fmtDate(entry.date)}</Text>
                  <Text style={[s.entryPhases, { color: t.textTertiary }]}>
                    {[entry.morningDone && 'Morning', entry.eveningDone && 'Evening'].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {entry.total !== null ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.entryScore, { color: entry.total >= 4 ? t.teal : entry.total >= 3 ? t.blue : t.textSecondary }]}>{entry.total}</Text>
                    <Text style={[s.entryScoreLabel, { color: t.textTertiary }]}>/ 5</Text>
                  </View>
                ) : <Text style={[s.noScore, { color: t.textTertiary }]}>No score</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Today's insight */}
        {state.insightText ? (
          <View style={[s.insightCard, { backgroundColor: t.bg2, borderLeftColor: t.purple }]}>
            <Text style={[s.insightLabel, { color: t.purple }]}>Today&apos;s pattern insight</Text>
            <Text style={[s.insightText, { color: t.textSecondary }]}>{state.insightText}</Text>
          </View>
        ) : null}

        {/* Recommended chapter */}
        {state.totalDays >= 3 && state.lowestDim ? (
          <Card style={{ marginBottom: 20 }}>
            <Text style={[s.recLabel, { color: t.textTertiary }]}>Recommended for you</Text>
            <Text style={[s.recTitle, { color: t.textPrimary }]}>Ch.{recommended.chapter} — {recommended.title}</Text>
            <Text style={[s.recDesc, { color: t.textSecondary }]}>{recommended.description}</Text>
            <TouchableOpacity onPress={() => router.push('/learn')} activeOpacity={0.8}
              style={[s.ghostBtn, { borderColor: t.border }]}>
              <Text style={[s.ghostBtnText, { color: t.textSecondary }]}>Read now →</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* Quick nav */}
        <View style={s.tiles}>
          {[
            { label: '📖 Learn',         href: '/learn' },
            { label: '🔁 Weekly Reset',  href: '/weekly/data-bridge' },
            ...(state.totalDays >= 3 ? [{ label: '🧠 Assessment', href: '/assessment' }] : []),
            ...(state.totalDays >= 7 ? [{ label: '📊 Patterns',   href: '/patterns' }] : []),
          ].map(tile => (
            <TouchableOpacity key={tile.href} onPress={() => router.push(tile.href as any)} activeOpacity={0.8}
              style={[s.tile, { backgroundColor: t.bg3, borderColor: t.border }]}>
              <Text style={[s.tileText, { color: t.textSecondary }]}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Milestone modal */}
      <Modal visible={state.milestoneShown} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: t.bg2 }]}>
            <Text style={[s.milestoneLabel, { color: t.teal }]}>Day {state.streak} of showing up</Text>
            {state.gapText ? (
              <Text style={[s.milestoneGap, { color: t.textTertiary }]}>
                On day one, you said: <Text style={{ color: t.textSecondary, fontStyle: 'italic' }}>"{state.gapText}"</Text>
              </Text>
            ) : null}
            {state.loadingMilestone
              ? <Text style={[s.milestoneSub, { color: t.textSecondary }]}>Synthesising your patterns…</Text>
              : <Text style={[s.milestoneSub, { color: t.textSecondary }]}>{state.milestoneSummary}</Text>
            }
            <Btn label="Close" onPress={() => setState(prev => ({ ...prev, milestoneShown: false }))} variant="ghost" />
          </View>
        </View>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  logo:          { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  streakBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  fire:          { fontSize: 14 },
  streakText:    { fontSize: 13, fontWeight: '600' },
  scroll:        { padding: 20, paddingBottom: 16 },
  phases:        { flexDirection: 'row', gap: 8, marginBottom: 20 },
  phaseBox:      { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  phaseIcon:     { fontSize: 16, marginBottom: 4 },
  phaseLabel:    { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', lineHeight: 13 },
  phaseNum:      { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 },
  heroCard:      { borderRadius: 16, padding: 20, borderLeftWidth: 3, marginBottom: 20 },
  heroTitle:     { fontSize: 20, fontWeight: '600', marginBottom: 6, lineHeight: 27 },
  heroSub:       { fontSize: 14, lineHeight: 21 },
  heroBtn:       { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  heroBtnText:   { fontSize: 15, fontWeight: '600', color: '#fff' },
  sundayBanner:  { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
  sundayTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sundaySub:     { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox:       { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  statValue:     { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel:     { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLabel:  { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  entryRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  entryDate:     { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  entryPhases:   { fontSize: 11 },
  entryScore:    { fontSize: 18, fontWeight: '700' },
  entryScoreLabel:{ fontSize: 10 },
  noScore:       { fontSize: 11 },
  insightCard:   { borderRadius: 16, padding: 18, borderLeftWidth: 3, marginBottom: 20 },
  insightLabel:  { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  insightText:   { fontSize: 14, lineHeight: 23 },
  recLabel:      { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  recTitle:      { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  recDesc:       { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  ghostBtn:      { padding: 11, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  ghostBtnText:  { fontSize: 13 },
  tiles:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tile:          { borderRadius: 14, padding: 14, paddingHorizontal: 16, borderWidth: 1 },
  tileText:      { fontSize: 13, fontWeight: '500' },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40 },
  milestoneLabel:{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 },
  milestoneGap:  { fontSize: 13, marginBottom: 16 },
  milestoneSub:  { fontSize: 15, lineHeight: 26, marginBottom: 24 },
})
