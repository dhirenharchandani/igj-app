import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../src/ThemeContext'
import { supabase } from '../src/lib/supabase'
import { DAILY_DIMENSIONS, WEEKLY_DIMENSIONS } from '../src/lib/utils/pillars'
import { getScoreColor } from '../src/lib/utils/scoring'
import { BottomNav } from '../src/components/BottomNav'
import { Card } from '../src/components/ui/Card'
import { Chip } from '../src/components/ui/Chip'
import { BarChart } from 'react-native-gifted-charts'

const { width } = Dimensions.get('window')

interface DailyScore { date: string; awareness: number; intention: number; state: number; presence: number; ownership: number }
interface WeeklyScore { week_start: string; clarity: number; ownership: number; presence: number; standards: number; courage: number; growth: number }
interface Insight { id: string; date: string; insight_text: string }

export default function PatternsScreen() {
  const t = useTheme()
  const [dayCount, setDayCount]       = useState(0)
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([])
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([])
  const [insights, setInsights]       = useState<Insight[]>([])
  const [activeDaily, setActiveDaily] = useState('awareness')
  const [activeWeekly, setActiveWeekly] = useState('clarity')
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString().split('T')[0]

      const [{ count }, { data: daily }, { data: weekly }, { data: insightRows }] = await Promise.all([
        supabase.from('morning_checkins').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('daily_scorecards').select('*').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date'),
        supabase.from('weekly_scorecards').select('*').eq('user_id', user.id).gte('week_start', eightWeeksAgo).order('week_start'),
        supabase.from('daily_insights').select('id,date,insight_text').eq('user_id', user.id).eq('is_saved', true).order('date', { ascending: false }),
      ])

      setDayCount(count ?? 0)
      setDailyScores(daily ?? [])
      setWeeklyScores(weekly ?? [])
      setInsights(insightRows ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <SafeAreaView style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }]}>
      <Text style={{ color: t.textSecondary }}>Loading patterns…</Text>
    </SafeAreaView>
  )

  if (dayCount < 7) return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>≋</Text>
        <Text style={[{ fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: t.textPrimary }]}>Come back after 7 days</Text>
        <Text style={[{ fontSize: 15, lineHeight: 24, textAlign: 'center', color: t.textSecondary }]}>You're on day {dayCount}. Patterns need time to form. Keep going — the data gets meaningful after a week.</Text>
      </View>
      <BottomNav />
    </SafeAreaView>
  )

  const chartW = width - 80

  const dailyData = dailyScores.map(d => ({
    value: (d[activeDaily as keyof DailyScore] as number) ?? 0,
    label: d.date.slice(5),
    frontColor: getScoreColor((d[activeDaily as keyof DailyScore] as number) ?? 0),
  }))

  const weeklyData = weeklyScores.map(d => ({
    value: (d[activeWeekly as keyof WeeklyScore] as number) ?? 0,
    label: d.week_start.slice(5),
    frontColor: getScoreColor((d[activeWeekly as keyof WeeklyScore] as number) ?? 0),
  }))

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.eyebrow, { color: t.teal }]}>Your patterns</Text>
        <Text style={[s.title, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>30 days of data. What it's actually showing you.</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Daily chart */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={[s.chartTitle, { color: t.textPrimary }]}>Daily scorecard trends</Text>
          <View style={s.chips}>
            {DAILY_DIMENSIONS.map(d => (
              <Chip key={d.key} label={d.label} onPress={() => setActiveDaily(d.key)} />
            ))}
          </View>
          {dailyData.length > 0 ? (
            <BarChart
              data={dailyData}
              width={chartW}
              height={120}
              barWidth={Math.max(8, (chartW / dailyData.length) - 4)}
              barBorderRadius={3}
              noOfSections={5}
              maxValue={5}
              yAxisTextStyle={{ color: t.textTertiary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: t.textTertiary, fontSize: 8 }}
              yAxisColor="transparent"
              xAxisColor={t.border}
              rulesColor={t.bg4}
              hideRules={false}
              showValuesAsTopLabel={false}
            />
          ) : (
            <Text style={[s.noData, { color: t.textTertiary }]}>No data for the last 30 days yet.</Text>
          )}
        </Card>

        {/* Weekly chart */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={[s.chartTitle, { color: t.textPrimary }]}>Weekly scorecard trends</Text>
          <View style={s.chips}>
            {WEEKLY_DIMENSIONS.map(d => (
              <Chip key={d.key} label={d.label} onPress={() => setActiveWeekly(d.key)} />
            ))}
          </View>
          {weeklyData.length > 0 ? (
            <BarChart
              data={weeklyData}
              width={chartW}
              height={120}
              barWidth={Math.max(12, (chartW / weeklyData.length) - 6)}
              barBorderRadius={3}
              noOfSections={5}
              maxValue={5}
              yAxisTextStyle={{ color: t.textTertiary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: t.textTertiary, fontSize: 8 }}
              yAxisColor="transparent"
              xAxisColor={t.border}
              rulesColor={t.bg4}
            />
          ) : (
            <Text style={[s.noData, { color: t.textTertiary }]}>Complete your first weekly reset to see trends.</Text>
          )}
        </Card>

        {/* Saved insights */}
        {insights.length > 0 && (
          <View>
            <Text style={[s.insightsTitle, { color: t.textPrimary }]}>Saved insights</Text>
            {insights.map(ins => (
              <TouchableOpacity
                key={ins.id}
                onPress={() => setExpanded(expanded === ins.id ? null : ins.id)}
                activeOpacity={0.85}
                style={[s.insightCard, { backgroundColor: t.bg2, borderColor: t.border }]}
              >
                <View style={s.insightHeader}>
                  <Text style={[s.insightDate, { color: t.textTertiary }]}>{ins.date}</Text>
                  <View style={[s.dailyBadge, { backgroundColor: t.blueDim }]}>
                    <Text style={[s.dailyBadgeText, { color: t.blue }]}>Daily</Text>
                  </View>
                </View>
                {expanded === ins.id && (
                  <Text style={[s.insightText, { color: t.textSecondary }]}>{ins.insight_text}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
  eyebrow:      { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  title:        { fontSize: 20, lineHeight: 27 },
  scroll:       { padding: 20, paddingBottom: 100 },
  chartTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  noData:       { fontSize: 13 },
  insightsTitle:{ fontSize: 13, fontWeight: '600', marginBottom: 12 },
  insightCard:  { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 10 },
  insightHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insightDate:  { fontSize: 12 },
  dailyBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  dailyBadgeText:{ fontSize: 10 },
  insightText:  { fontSize: 14, lineHeight: 23, marginTop: 12 },
})
