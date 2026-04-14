import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../src/ThemeContext'
import { supabase } from '../src/lib/supabase'
import { useStore } from '../src/lib/store'
import { BottomNav } from '../src/components/BottomNav'
import { Card } from '../src/components/ui/Card'
import { Btn } from '../src/components/ui/Btn'
import { getWeekStart, isSunday } from '../src/lib/utils/scoring'
import { getRecommendedChapter } from '../src/lib/utils/pillars'

interface RecentEntry { date: string; total: number | null; morningDone: boolean; eveningDone: boolean }

interface ScorecardRow { date: string; awareness: number; intention: number; state: number; presence: number; ownership: number }

interface DashState {
  streak: number; longestStreak: number; totalDays: number
  lowestDim: string; gapText: string; todayScore: number | null
  recentEntries: RecentEntry[]; recentScorecards: ScorecardRow[]; insightText: string
  milestoneShown: boolean; milestoneSummary: string; loadingMilestone: boolean
  morningDone: boolean; eveningDone: boolean; scorecardDone: boolean; weeklyResetDone: boolean
  weeklyUnlocked: boolean
  eveningTime: string
  loading: boolean
}

// Compute streak entirely client-side from an array of date strings (no view dependency)
function computeStreak(dates: string[]): { current: number; longest: number; total: number } {
  if (!dates.length) return { current: 0, longest: 0, total: 0 }
  const dateSet = new Set(dates)
  const sorted  = [...dates].sort().reverse()            // newest first
  const today   = new Date().toISOString().split('T')[0]
  const yest    = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Current streak — only active if done today or yesterday
  let current = 0
  if (dateSet.has(today) || dateSet.has(yest)) {
    const d = new Date((dateSet.has(today) ? today : yest) + 'T12:00:00')
    while (dateSet.has(d.toISOString().split('T')[0])) {
      current++
      d.setDate(d.getDate() - 1)
    }
  }

  // Longest streak across all history
  let longest = current
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i-1] + 'T12:00:00').getTime() - new Date(sorted[i] + 'T12:00:00').getTime()) / 86400000
    )
    run = diff === 1 ? run + 1 : 1
    if (run > longest) longest = run
  }

  return { current, longest, total: dates.length }
}

const PHASES = [
  { label: 'Set the Field', sub: 'Morning',   icon: '☀️', step: 1 },
  { label: 'Harvest',       sub: 'Evening',   icon: '🌙', step: 2 },
  { label: 'Score',         sub: 'Scorecard', icon: '📊', step: 3 },
]

export default function DashboardScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const sunday  = isSunday()
  const { getTodayStatus, profile } = useStore()

  const [state, setState] = useState<DashState>(() => {
    // Seed from store immediately — no async delay, no flash of wrong state
    const stored = getTodayStatus()
    return {
      streak: 0, longestStreak: 0, totalDays: 0, lowestDim: '', gapText: '',
      todayScore: null, recentEntries: [], recentScorecards: [], insightText: '',
      milestoneShown: false, milestoneSummary: '', loadingMilestone: false,
      morningDone: stored.morningDone,
      eveningDone: stored.eveningDone,
      scorecardDone: stored.scorecardDone,
      weeklyResetDone: false,
      weeklyUnlocked: false,
      eveningTime: '21:00',
      loading: true,
    }
  })

  useFocusEffect(useCallback(() => {
    // Re-seed from store on every focus (handles case where user just completed a check-in)
    const stored = getTodayStatus()
    setState(prev => ({
      ...prev,
      morningDone: stored.morningDone,
      eveningDone: stored.eveningDone,
      scorecardDone: stored.scorecardDone,
      weeklyResetDone: false, loading: true,
    }))

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState(s => ({ ...s, loading: false })); return }

      const today     = new Date().toISOString().split('T')[0]
      const weekStart = getWeekStart()

      const [
        { data: supaProfile },
        { data: morning },
        { data: evening },
        { data: scorecard },
        { data: weeklyReset },
        { data: todayScore },
        { data: recentScorecards },
        { data: allMornings },   // all dates for streak + weekly unlock
        { data: recentEvenings },
        { data: insight },
      ] = await Promise.all([
        supabase.from('user_profiles').select('identity_gap_text,evening_time').eq('id', user.id).single(),
        supabase.from('morning_checkins').select('id').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('evening_checkins').select('id').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_scorecards').select('id').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('weekly_resets').select('id').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('daily_scorecards').select('awareness,intention,state,presence,ownership').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_scorecards').select('date,awareness,intention,state,presence,ownership').eq('user_id', user.id).order('date', { ascending: false }).limit(14),
        supabase.from('morning_checkins').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
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

      // Streak — computed client-side, no view dependency
      const allMorningDates = (allMornings ?? []).map((r: { date: string }) => r.date)
      const streakData = computeStreak(allMorningDates)

      // Weekly reset unlock: 7+ entries OR 7+ days since first check-in
      const firstDate = allMorningDates.length ? [...allMorningDates].sort()[0] : null
      const daysSinceFirst = firstDate
        ? Math.floor((Date.now() - new Date(firstDate + 'T12:00:00').getTime()) / 86400000)
        : 0
      const weeklyUnlocked = allMorningDates.length >= 7 || daysSinceFirst >= 7

      // Recent entries
      const morningDates = new Set(allMorningDates.slice(0, 7))
      const eveningDates = new Set((recentEvenings ?? []).map((r: { date: string }) => r.date))
      const scoreMap = new Map<string, number>()
      ;(recentScorecards ?? []).forEach((sc: Record<string, number | string>) => {
        const vals = [sc.awareness, sc.intention, sc.state, sc.presence, sc.ownership]
          .filter((v): v is number => typeof v === 'number')
        if (vals.length) scoreMap.set(sc.date as string, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10)
      })
      const recentEntries: RecentEntry[] = Array.from({ length: 7 }, (_, i) => {
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

      const showMilestone = [7, 30].includes(streakData.current) && !!morning

      // Merge store + supabase: if either says done, it's done
      const storeStatus = getTodayStatus()
      setState(prev => ({
        ...prev,
        streak: streakData.current,
        longestStreak: streakData.longest,
        totalDays: streakData.total,
        weeklyUnlocked,
        lowestDim, gapText: supaProfile?.identity_gap_text ?? '',
        eveningTime: (supaProfile?.evening_time ?? '21:00:00').slice(0, 5),
        todayScore: todayScoreVal, recentEntries, recentScorecards: (recentScorecards ?? []) as ScorecardRow[],
        insightText: insight?.insight_text ?? '',
        milestoneShown: showMilestone,
        morningDone: !!morning,
        eveningDone: !!evening,
        scorecardDone: !!scorecard,
        weeklyResetDone: !!weeklyReset,
        loading: false,
      }))

      if (showMilestone) {
        setState(prev => ({ ...prev, loadingMilestone: true }))
        try {
          const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/streak-summary`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streakDays: streakData.current }),
          })
          const data = await res.json()
          setState(prev => ({ ...prev, milestoneSummary: data.summary ?? '', loadingMilestone: false }))
        } catch { setState(prev => ({ ...prev, loadingMilestone: false })) }
      }
    }
    load()
  }, [getTodayStatus]))  // useFocusEffect — re-runs every time this screen gains focus

  // ── Sequential hero: morning first, evening time-gated ──
  function getHero() {
    if (!state.morningDone) return {
      phase: 1,
      heading: 'Set the field for today.',
      sub: '5 minutes. Identity first — actions follow.',
      btn: 'Start morning →', href: '/checkin/morning', color: t.blue, locked: false,
    }

    if (!state.eveningDone) {
      const [evHr, evMin] = state.eveningTime.split(':').map(Number)
      const now = new Date()
      const eveningOpen = now.getHours() > evHr || (now.getHours() === evHr && now.getMinutes() >= evMin)

      if (!eveningOpen) {
        const fmt = new Date(); fmt.setHours(evHr, evMin, 0)
        const label = fmt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        return {
          phase: 2,
          heading: `Evening check-in opens at ${label}.`,
          sub: `Come back then to close out your day and reflect on what actually happened.`,
          btn: undefined, href: '', color: t.teal, locked: true,
        }
      }

      return {
        phase: 2,
        heading: 'Time to harvest your day.',
        sub: 'What did today reveal about you?',
        btn: 'Start evening →', href: '/checkin/evening', color: t.purple, locked: false,
      }
    }

    if (!state.scorecardDone) return {
      phase: 3,
      heading: 'Score the day.',
      sub: 'Rate the 5 dimensions before you close it.',
      btn: 'Daily scorecard →', href: '/checkin/scorecard', color: t.teal, locked: false,
    }

    return {
      phase: 0,
      heading: 'Today is complete.',
      sub: state.todayScore
        ? `You scored ${state.todayScore}/5 today. ${state.streak} day streak.`
        : `${state.streak} day streak. Keep going.`,
      btn: undefined,
      href: '', color: t.teal, locked: false,
    }
  }

  const hero = getHero()
  const phaseStatus = [state.morningDone, state.eveningDone, state.scorecardDone]
  const recommended = getRecommendedChapter(state.lowestDim)

  // ── Personalised greeting ──
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    const timeWord = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const name = profile.display_name?.trim()
    return name ? `Great ${timeWord}, ${name}` : `Great ${timeWord}`
  }, [profile.display_name])

  // ── 7-day activity strip — always Mon → Sun of current week ──
  const activityDays = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    // Rewind to this Monday (JS: 0=Sun, treat as 7 so Mon=start)
    const jsDay = today.getDay()
    const daysFromMon = jsDay === 0 ? 6 : jsDay - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysFromMon)
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const entry   = state.recentEntries.find(e => e.date === dateStr)
      return {
        dateStr,
        label:       DAY_LABELS[i],
        morningDone: entry?.morningDone  ?? false,
        eveningDone: entry?.eveningDone  ?? false,
        isToday:     dateStr === todayStr,
        isFuture:    dateStr  > todayStr,
      }
    })
  }, [state.recentEntries])

  // ── Week-over-week score trend ──
  const weekTrend = useMemo(() => {
    function avgScore(rows: ScorecardRow[]): number | null {
      const scores = rows.map(sc => {
        const vals = [sc.awareness, sc.intention, sc.state, sc.presence, sc.ownership].filter((v): v is number => typeof v === 'number' && v > 0)
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }).filter((v): v is number => v !== null)
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    }
    const today = new Date()
    const cutoff7 = new Date(today); cutoff7.setDate(cutoff7.getDate() - 7)
    const cutoff14 = new Date(today); cutoff14.setDate(cutoff14.getDate() - 14)
    const c7 = cutoff7.toISOString().split('T')[0]
    const c14 = cutoff14.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    const thisWeek = state.recentScorecards.filter(sc => sc.date >= c7 && sc.date <= todayStr)
    const lastWeek = state.recentScorecards.filter(sc => sc.date >= c14 && sc.date < c7)
    const thisAvg = avgScore(thisWeek)
    const lastAvg = avgScore(lastWeek)
    if (thisAvg === null || lastAvg === null) return null
    return Math.round((thisAvg - lastAvg) * 10) / 10
  }, [state.recentScorecards])

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
        <Text style={[s.logo, { color: t.textPrimary }]}>{greeting}</Text>
        <View style={[s.streakBadge, { backgroundColor: t.bg3, borderColor: t.border }]}>
          <Text style={s.fire}>🔥</Text>
          <Text style={[s.streakText, { color: t.textPrimary }]}>{state.streak} day{state.streak !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>

        {/* Phase progress — Mon→Sun step tracker */}
        <View style={s.phases}>
          {PHASES.map((p, i) => {
            const done    = phaseStatus[i]
            const active  = hero.phase === i + 1
            const pending = !done && !active && hero.phase !== 0
            return (
              <React.Fragment key={p.label}>
                <View style={[s.phaseBox, {
                  backgroundColor: done ? t.tealDim : active ? t.bg2 : t.bg3,
                  borderColor:     done ? t.tealBorder : active ? t.blue : t.border,
                  borderWidth:     active ? 1.5 : 1,
                }]}>
                  <Text style={[s.phaseStep, { color: done ? t.teal : active ? t.blue : t.textSecondary }]}>STEP {p.step}</Text>
                  <Text style={[s.phaseIcon, { color: done ? t.teal : active ? t.blue : t.textSecondary, opacity: pending ? 0.8 : 1 }]}>
                    {done ? '✓' : p.icon}
                  </Text>
                  <Text style={[s.phaseLabel, { color: done ? t.teal : active ? t.textPrimary : t.textSecondary, opacity: pending ? 0.9 : 1 }]}>{p.label}</Text>
                  <Text style={[s.phaseSub,  { color: done ? t.teal : active ? t.blue : t.textTertiary,    opacity: pending ? 0.8 : 1 }]}>{p.sub}</Text>
                </View>
                {i < PHASES.length - 1 && (
                  <Text style={[s.phaseArrow, { color: phaseStatus[i] ? t.teal : t.border }]}>›</Text>
                )}
              </React.Fragment>
            )
          })}
        </View>

        {/* Mon→Sun activity strip */}
        <View style={[s.activityStrip, { backgroundColor: t.bg2, borderColor: t.border }]}>
          {activityDays.map(day => {
            const bothDone   = day.morningDone && day.eveningDone
            const symbol     = day.isFuture ? '·' : bothDone ? '✓' : day.morningDone ? '☀️' : day.eveningDone ? '🌙' : '·'
            const symbolColor = day.isFuture
              ? t.bg3
              : bothDone ? t.teal
              : day.morningDone ? t.blue
              : day.eveningDone ? t.purple
              : t.textTertiary
            const labelColor = day.isToday ? t.teal : t.textSecondary
            return (
              <View key={day.dateStr} style={[s.activityCol, day.isToday && { backgroundColor: t.bg3, borderRadius: 8 }]}>
                <Text style={[s.activitySymbol, { color: symbolColor, fontSize: bothDone ? 12 : (day.morningDone || day.eveningDone) ? 14 : 18 }]}>{symbol}</Text>
                <Text style={[s.activityLabel, { color: labelColor, fontWeight: day.isToday ? '700' : '500' }]}>{day.label}</Text>
              </View>
            )
          })}
        </View>

        {/* Identity gap card */}
        {!!state.gapText && (
          <View style={[s.gapCard, { backgroundColor: t.bg2, borderLeftColor: t.teal }]}>
            <Text style={[s.gapLabel, { color: t.teal }]}>YOUR MISSION</Text>
            <Text style={[s.gapText, { color: t.textPrimary }]}>{`"${state.gapText}"`}</Text>
          </View>
        )}

        {/* Hero CTA */}
        <View style={[s.heroCard, { backgroundColor: t.bg2, borderLeftColor: hero.color }]}>
          {hero.phase > 0 && (
            <Text style={[s.phaseNum, { color: hero.color }]}>Step {hero.phase} of 3</Text>
          )}
          <Text style={[s.heroTitle, { color: t.textPrimary }]}>{hero.heading}</Text>
          <Text style={[s.heroSub, { color: hero.btn ? t.textSecondary : t.textPrimary, marginBottom: hero.btn ? 18 : 0 }]}>{hero.sub}</Text>
          {hero.btn && (
            <TouchableOpacity onPress={() => router.push(hero.href as any)} activeOpacity={0.8}
              style={[s.heroBtn, { backgroundColor: hero.color }]}>
              <Text style={s.heroBtnText}>{hero.btn}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sunday weekly reset banner — only after 7 days */}
        {sunday && !state.weeklyResetDone && state.weeklyUnlocked && (
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
          ].map(stat => (
            <View key={stat.label} style={[s.statBox, { backgroundColor: t.bg3, borderColor: t.border }]}>
              <Text style={[s.statValue, { color: t.textPrimary }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: t.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
          <View style={[s.statBox, { backgroundColor: t.bg3, borderColor: t.border }]}>
            <Text style={[s.statValue, {
              color: weekTrend === null ? t.textSecondary : weekTrend >= 0 ? t.teal : t.coral
            }]}>
              {weekTrend === null ? '–' : weekTrend >= 0 ? `↑ +${weekTrend}` : `↓ ${weekTrend}`}
            </Text>
            <Text style={[s.statLabel, { color: t.textSecondary }]}>vs last wk</Text>
          </View>
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

        {/* Today's insight — shown below hero, full brightness */}
        {state.insightText ? (
          <View style={[s.insightCard, { backgroundColor: t.bg2, borderLeftColor: t.purple }]}>
            <Text style={[s.insightLabel, { color: t.purple }]}>📊 Today's pattern insight</Text>
            <Text style={[s.insightText, { color: t.textPrimary }]}>{state.insightText}</Text>
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

        {/* Quick nav — always visible, locked until threshold */}
        <View style={s.tiles}>
          {/* Assessment — unlocks at 3 days */}
          <TouchableOpacity
            onPress={() => state.totalDays >= 3 ? router.push('/assessment' as any) : null}
            activeOpacity={state.totalDays >= 3 ? 0.8 : 1}
            style={[s.tile, { backgroundColor: t.bg3, borderColor: t.border }]}>
            <Text style={[s.tileText, { color: t.textPrimary }]}>
              {state.totalDays >= 3 ? '🧠 Assessment' : '🔒 Assessment'}
            </Text>
            {state.totalDays < 3 && (
              <Text style={[s.tileSub, { color: t.textSecondary }]}>
                {Math.max(0, 3 - state.totalDays)} day{Math.max(0, 3 - state.totalDays) !== 1 ? 's' : ''} to unlock
              </Text>
            )}
          </TouchableOpacity>

          {/* Patterns — unlocks at 7 days */}
          <TouchableOpacity
            onPress={() => state.totalDays >= 7 ? router.push('/patterns' as any) : null}
            activeOpacity={state.totalDays >= 7 ? 0.8 : 1}
            style={[s.tile, { backgroundColor: t.bg3, borderColor: t.border }]}>
            <Text style={[s.tileText, { color: t.textPrimary }]}>
              {state.totalDays >= 7 ? '📊 Patterns' : '🔒 Patterns'}
            </Text>
            {state.totalDays < 7 && (
              <Text style={[s.tileSub, { color: t.textSecondary }]}>
                {Math.max(0, 7 - state.totalDays)} day{Math.max(0, 7 - state.totalDays) !== 1 ? 's' : ''} to unlock
              </Text>
            )}
          </TouchableOpacity>

          {/* Weekly Reset — unlocks at 7 days */}
          <TouchableOpacity
            onPress={() => state.weeklyUnlocked ? router.push('/weekly/data-bridge') : null}
            activeOpacity={state.weeklyUnlocked ? 0.8 : 1}
            style={[s.tile, { backgroundColor: t.bg3, borderColor: t.border }]}>
            <Text style={[s.tileText, { color: t.textPrimary }]}>
              {state.weeklyUnlocked ? '🔁 Weekly Reset' : '🔒 Weekly Reset'}
            </Text>
            {!state.weeklyUnlocked && (
              <Text style={[s.tileSub, { color: t.textSecondary }]}>
                {Math.max(0, 7 - state.totalDays)} day{Math.max(0, 7 - state.totalDays) !== 1 ? 's' : ''} to unlock
              </Text>
            )}
          </TouchableOpacity>
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
  logo:          { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  streakBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  fire:          { fontSize: 14 },
  streakText:    { fontSize: 13, fontWeight: '600' },
  scroll:        { padding: 20, paddingBottom: 100 },
  phases:        { flexDirection: 'row', gap: 8, marginBottom: 20 },
  phaseBox:      { flex: 1, padding: 10, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  phaseStep:     { fontSize: 7, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 },
  phaseIcon:     { fontSize: 15, marginBottom: 3 },
  phaseLabel:    { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center', lineHeight: 12 },
  phaseSub:      { fontSize: 8, textAlign: 'center', marginTop: 2, letterSpacing: 0.3 },
  phaseArrow:    { fontSize: 18, alignSelf: 'center', paddingBottom: 4, marginHorizontal: -2 },
  phaseNum:      { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
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
  tileText:      { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  tileSub:       { fontSize: 10, marginTop: 3, textAlign: 'center' },
  activityStrip: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  activityCol:   { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  activitySymbol:{ marginBottom: 4, textAlign: 'center' },
  activityLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  gapCard:       { borderRadius: 14, padding: 16, borderLeftWidth: 3, marginBottom: 16 },
  gapLabel:      { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 },
  gapText:       { fontSize: 15, lineHeight: 24, fontStyle: 'italic', fontFamily: 'DMSerifDisplay_400Regular_Italic' },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40 },
  milestoneLabel:{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 },
  milestoneGap:  { fontSize: 13, marginBottom: 16 },
  milestoneSub:  { fontSize: 15, lineHeight: 26, marginBottom: 24 },
})
