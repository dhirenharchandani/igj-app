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

interface DashState {
  streak: number; dayCount: number; lowestDim: string; gapText: string
  insightText: string; milestoneShown: boolean; milestoneSummary: string; loadingMilestone: boolean
  morningDone: boolean; eveningDone: boolean; scorecardDone: boolean; weeklyResetDone: boolean
}

export default function DashboardScreen() {
  const router = useRouter()
  const t      = useTheme()
  const [state, setState] = useState<DashState>({
    streak: 0, dayCount: 0, lowestDim: '', gapText: '', insightText: '',
    milestoneShown: false, milestoneSummary: '', loadingMilestone: false,
    morningDone: false, eveningDone: false, scorecardDone: false, weeklyResetDone: false,
  })

  const hour      = new Date().getHours()
  const sunday    = isSunday()
  const recommended = getRecommendedChapter(state.lowestDim)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today     = new Date().toISOString().split('T')[0]
      const weekStart = getWeekStart()

      const [{ data: streakRow }, { data: profile }, { data: morning }, { data: evening }, { data: scorecard }, { data: weeklyReset }, { data: scorecards }] = await Promise.all([
        supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).single(),
        supabase.from('user_profiles').select('identity_gap_text').eq('id', user.id).single(),
        supabase.from('morning_checkins').select('id').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('evening_checkins').select('id').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('daily_scorecards').select('id').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('weekly_resets').select('id').eq('user_id', user.id).eq('week_start', weekStart).single(),
        supabase.from('daily_scorecards').select('awareness,intention,state,presence,ownership').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
      ])

      const { count } = await supabase.from('morning_checkins').select('id', { count: 'exact' }).eq('user_id', user.id)

      let lowestDim = ''
      if (scorecards?.length) {
        const dims: Record<string, number[]> = { awareness: [], intention: [], state: [], presence: [], ownership: [] }
        scorecards.forEach((sc: Record<string, number>) => Object.keys(dims).forEach(k => { if (sc[k]) dims[k].push(sc[k]) }))
        const avgs = Object.entries(dims).map(([k, vs]) => [k, vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0] as [string, number])
        lowestDim = avgs.filter(([, v]) => v > 0).sort(([, a], [, b]) => a - b)[0]?.[0] ?? ''
      }

      const currentStreak = streakRow?.current_streak ?? 0
      const showMilestone = [7, 30].includes(currentStreak)

      setState(prev => ({
        ...prev, streak: currentStreak, dayCount: count ?? 0, lowestDim,
        gapText: profile?.identity_gap_text ?? '', milestoneShown: showMilestone,
        morningDone: !!morning, eveningDone: !!evening, scorecardDone: !!scorecard, weeklyResetDone: !!weeklyReset,
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

  function getHero() {
    if (sunday && !state.weeklyResetDone) return {
      heading: 'Time for your weekly reset.',
      sub: 'This is where the real work happens.',
      btn: 'Start weekly reset →', href: '/weekly/data-bridge', color: t.amber, textColor: '#0e0e0c',
    }
    if (hour >= 5 && hour < 12 && !state.morningDone) return {
      heading: 'Your morning check-in is ready.',
      sub: '5 minutes. Set the frame for today.',
      btn: 'Start morning →', href: '/checkin/morning', color: t.blue, textColor: '#fff',
    }
    if (hour >= 12 && hour < 21 && !state.eveningDone) return {
      heading: 'Take 5 minutes to reflect.',
      sub: 'How did today actually go?',
      btn: 'Start evening →', href: '/checkin/evening', color: t.blue, textColor: '#fff',
    }
    if (state.morningDone && state.eveningDone && !state.scorecardDone) return {
      heading: 'One last thing.',
      sub: 'Score your day before you close it.',
      btn: 'Daily scorecard →', href: '/checkin/scorecard', color: t.blue, textColor: '#fff',
    }
    return {
      heading: 'You\'re done for today.',
      sub: `${state.streak} day streak. Keep going.`,
      btn: state.insightText ? 'View today\'s insight →' : undefined, href: '/checkin/scorecard',
      color: t.teal, textColor: '#fff',
    }
  }

  const hero = getHero()

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.logo, { color: t.teal }]}>IGJ</Text>
        <View style={[s.streak, { backgroundColor: t.bg3, borderColor: t.border }]}>
          <Text style={s.fire}>🔥</Text>
          <Text style={[s.streakText, { color: t.textPrimary }]}>{state.streak} day{state.streak !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        {/* Hero CTA */}
        <Card style={{ marginBottom: 20 }}>
          <Text style={[s.heroTitle, { color: t.textPrimary }]}>{hero.heading}</Text>
          <Text style={[s.heroSub, { color: t.textSecondary, marginBottom: hero.btn ? 20 : 0 }]}>{hero.sub}</Text>
          {hero.btn && (
            <TouchableOpacity onPress={() => router.push(hero.href as any)} activeOpacity={0.8}
              style={[s.heroBtnTouch, { backgroundColor: hero.color }]}>
              <Text style={[s.heroBtnText, { color: hero.textColor }]}>{hero.btn}</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Assessment banner */}
        {state.dayCount >= 3 && (
          <View style={[s.assessBanner, { backgroundColor: t.purpleDim, borderColor: t.purpleBorder }]}>
            <Text style={[s.assessText, { color: t.textPrimary }]}>Before your next session, take 5 minutes to map your whole life.</Text>
            <TouchableOpacity onPress={() => router.push('/assessment')} activeOpacity={0.8}
              style={[s.assessBtn, { backgroundColor: t.purple }]}>
              <Text style={s.assessBtnText}>Take the assessment →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recommended chapter */}
        {state.dayCount >= 3 && state.lowestDim && (
          <Card style={{ marginBottom: 20 }}>
            <Text style={[s.recLabel, { color: t.textTertiary }]}>Recommended for you</Text>
            <Text style={[s.recTitle, { color: t.textPrimary }]}>Ch.{recommended.chapter} — {recommended.title}</Text>
            <Text style={[s.recDesc, { color: t.textSecondary }]}>{recommended.description}</Text>
            <TouchableOpacity onPress={() => router.push('/learn')} activeOpacity={0.8}
              style={[s.ghostBtn, { backgroundColor: t.bg3, borderColor: t.border }]}>
              <Text style={[s.ghostBtnText, { color: t.textSecondary }]}>Read now →</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Nav tiles */}
        <View style={s.tiles}>
          {[
            { label: 'Daily check-in', href: '/checkin/morning',    bg: t.blueDim,   border: t.blueBorder,   text: t.blue },
            { label: 'Weekly reset',   href: '/weekly/data-bridge', bg: t.amberDim,  border: t.amberBorder,  text: t.amber },
            { label: 'Learn More',     href: '/learn',              bg: t.grayDim,   border: t.grayBorder,   text: t.gray },
          ].map(tile => (
            <TouchableOpacity key={tile.href} onPress={() => router.push(tile.href as any)} activeOpacity={0.8}
              style={[s.tile, { backgroundColor: tile.bg, borderColor: tile.border }]}>
              <Text style={[s.tileText, { color: tile.text }]}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {state.dayCount >= 7 && (
          <TouchableOpacity onPress={() => router.push('/patterns')} activeOpacity={0.7}>
            <Text style={[s.patternsLink, { color: t.textSecondary }]}>View your patterns →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Milestone modal */}
      <Modal visible={state.milestoneShown} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: t.bg2 }]}>
            <Text style={[s.milestoneLabel, { color: t.teal }]}>Day {state.streak} of showing up</Text>
            {state.gapText ? (
              <Text style={[s.milestoneGap, { color: t.textTertiary }]}>On day one, you said: <Text style={{ color: t.textSecondary, fontStyle: 'italic' }}>"{state.gapText}"</Text></Text>
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
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  logo:         { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  streak:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  fire:         { fontSize: 14 },
  streakText:   { fontSize: 13, fontWeight: '600' },
  scroll:       { padding: 20, paddingBottom: 16 },
  heroTitle:    { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  heroSub:      { fontSize: 14, lineHeight: 21 },
  heroBtnTouch: { padding: 16, borderRadius: 14, alignItems: 'center' },
  heroBtnText:  { fontSize: 15, fontWeight: '600' },
  assessBanner: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  assessText:   { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  assessBtn:    { padding: 12, borderRadius: 14, alignItems: 'center' },
  assessBtnText:{ fontSize: 13, fontWeight: '600', color: '#fff' },
  recLabel:     { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  recTitle:     { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  recDesc:      { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  ghostBtn:     { padding: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  ghostBtnText: { fontSize: 13 },
  tiles:        { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tile:         { flex: 1, borderRadius: 14, padding: 16, borderWidth: 1, alignItems: 'center' },
  tileText:     { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  patternsLink: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40 },
  milestoneLabel:{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 },
  milestoneGap: { fontSize: 13, marginBottom: 16 },
  milestoneSub: { fontSize: 15, lineHeight: 26, marginBottom: 24 },
})
