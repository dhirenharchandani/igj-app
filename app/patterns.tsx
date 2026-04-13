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

const STOP_WORDS = new Set([
  'i','the','a','an','my','was','is','it','to','of','and','but','that','this',
  'in','on','at','for','with','have','not','me','up','be','do','so','if','as',
  'by','we','or','are','had','has','been','from','more','when','just','its',
  'feel','felt','really','very','what','how','then','about','which','were',
  'get','got','can','like','also','too','all','one','more','into','out','did',
  'no','so','some','they','them','their','would','could','should','will',
  'there','than','after','before','time','day','today','now','still',
])

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
  const [activityMap, setActivityMap] = useState<Map<string, { morning: boolean; evening: boolean }>>(new Map())
  const [topKeywords, setTopKeywords] = useState<{ word: string; count: number }[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const thirtyDaysAgo  = new Date(Date.now() - 30  * 86400000).toISOString().split('T')[0]
      const ninetyDaysAgo  = new Date(Date.now() - 90  * 86400000).toISOString().split('T')[0]
      const eightWeeksAgo  = new Date(Date.now() - 56  * 86400000).toISOString().split('T')[0]

      const [
        { data: allMornings },
        { data: allEvenings },
        { data: recentEvenings },
        { data: daily },
        { data: weekly },
        { data: insightRows },
      ] = await Promise.all([
        supabase.from('morning_checkins').select('date').eq('user_id', user.id).gte('date', ninetyDaysAgo),
        supabase.from('evening_checkins').select('date').eq('user_id', user.id).gte('date', ninetyDaysAgo),
        supabase.from('evening_checkins').select('q2_pattern,q4_learning,date').eq('user_id', user.id).gte('date', thirtyDaysAgo),
        supabase.from('daily_scorecards').select('*').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date'),
        supabase.from('weekly_scorecards').select('*').eq('user_id', user.id).gte('week_start', eightWeeksAgo).order('week_start'),
        supabase.from('daily_insights').select('id,date,insight_text').eq('user_id', user.id).eq('is_saved', true).order('date', { ascending: false }),
      ])

      // Day count (union of all-time mornings + evenings for the streak display)
      const uniqueDays = new Set([
        ...(allMornings ?? []).map((r: { date: string }) => r.date),
        ...(allEvenings ?? []).map((r: { date: string }) => r.date),
      ])
      setDayCount(uniqueDays.size)

      // Build activity map for heatmap (last 90 days)
      const aMap = new Map<string, { morning: boolean; evening: boolean }>()
      ;(allMornings ?? []).forEach((r: { date: string }) => {
        const entry = aMap.get(r.date) ?? { morning: false, evening: false }
        entry.morning = true
        aMap.set(r.date, entry)
      })
      ;(allEvenings ?? []).forEach((r: { date: string }) => {
        const entry = aMap.get(r.date) ?? { morning: false, evening: false }
        entry.evening = true
        aMap.set(r.date, entry)
      })
      setActivityMap(aMap)

      // Build top keywords from last 30 days evening checkins
      const wordCounts = new Map<string, number>()
      ;(recentEvenings ?? []).forEach((row: { q2_pattern?: string; q4_learning?: string }) => {
        const text = [row.q2_pattern ?? '', row.q4_learning ?? ''].join(' ')
        text
          .toLowerCase()
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .forEach(w => {
            if (w.length < 3 || STOP_WORDS.has(w)) return
            wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1)
          })
      })
      const sorted = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({ word: word.charAt(0).toUpperCase() + word.slice(1), count }))
      setTopKeywords(sorted)

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
      <View style={[{ borderBottomWidth: 1, padding: 20, paddingBottom: 16, borderBottomColor: t.border }]}>
        <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4, color: t.teal }}>Your patterns</Text>
        <Text style={{ fontSize: 20, color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic', lineHeight: 27 }}>30 days of data. What it's actually showing you.</Text>
      </View>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, alignItems: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: 24 }}>≋</Text>
        <Text style={{ fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: t.textPrimary }}>Patterns unlock after 7 days</Text>
        <Text style={{ fontSize: 15, lineHeight: 24, textAlign: 'center', color: t.textSecondary, marginBottom: 40 }}>
          Patterns need time to form. Keep going — meaningful data starts appearing after your first week.
        </Text>
        <View style={{ width: '100%', backgroundColor: t.bg3, borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: t.border }}>
          <View style={{ height: '100%', borderRadius: 8, backgroundColor: t.teal, width: `${Math.min(100, (dayCount / 7) * 100)}%` as any }} />
        </View>
        <Text style={{ fontSize: 13, color: t.textSecondary, fontWeight: '600' }}>
          {dayCount} <Text style={{ color: t.textTertiary, fontWeight: '400' }}>/ 7 days</Text>
        </Text>
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

  // Build 84-day grid: 12 columns (weeks) x 7 rows (Mon–Sun), newest week on right
  const today = new Date()
  // Align to most recent Sunday so grid fills neatly right-to-left
  const dayOfWeek = today.getDay() // 0=Sun,1=Mon,...,6=Sat
  // We want the grid rows to be Mon(0)..Sun(6). Find offset to last Sunday.
  const daysToFill = 84 // 12 weeks
  // Build array of 84 dates oldest→newest
  const gridDates: string[] = []
  for (let i = daysToFill - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    gridDates.push(d.toISOString().split('T')[0])
  }

  // Determine the day-of-week index of the first date (Mon=0..Sun=6)
  function dowIndex(dateStr: string): number {
    const d = new Date(dateStr + 'T00:00:00')
    return (d.getDay() + 6) % 7 // Mon=0, Tue=1, ..., Sun=6
  }

  // Arrange into columns: each column is one week (7 slots Mon–Sun)
  // We pad the front so the first date lands on the correct row
  const firstDow = dowIndex(gridDates[0])
  // Total cells = 12 cols × 7 rows. We'll build a flat array of (dateStr|null).
  const totalCells = 12 * 7
  const paddedDates: (string | null)[] = Array(firstDow).fill(null).concat(gridDates)
  // Trim or extend to exactly totalCells
  while (paddedDates.length < totalCells) paddedDates.push(null)
  const cells = paddedDates.slice(0, totalCells)

  // Split into columns of 7
  const columns: (string | null)[][] = []
  for (let col = 0; col < 12; col++) {
    columns.push(cells.slice(col * 7, col * 7 + 7))
  }

  function heatColor(dateStr: string | null): string {
    if (!dateStr) return 'transparent'
    const entry = activityMap.get(dateStr)
    if (!entry) return t.bg3
    if (entry.morning && entry.evening) return t.teal
    if (entry.morning) return t.blue
    if (entry.evening) return t.purple
    return t.bg3
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.eyebrow, { color: t.teal }]}>Your patterns</Text>
        <Text style={[s.title, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>Your data. What it's actually showing you.</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Activity heatmap */}
        <Text style={[s.sectionTitle, { color: t.textPrimary }]}>Activity</Text>
        <Card style={{ marginBottom: 20 }}>
          <View style={s.heatmapRow}>
            {columns.map((col, ci) => (
              <View key={ci} style={s.heatmapCol}>
                {col.map((dateStr, ri) => (
                  <View
                    key={ri}
                    style={[
                      s.heatCell,
                      {
                        backgroundColor: heatColor(dateStr),
                        borderWidth: dateStr ? 0 : 0,
                        opacity: dateStr ? 1 : 0,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
          {/* Legend */}
          <View style={s.heatLegend}>
            <View style={[s.heatLegendDot, { backgroundColor: t.teal }]} />
            <Text style={[s.heatLegendLabel, { color: t.textTertiary }]}>Both</Text>
            <View style={[s.heatLegendDot, { backgroundColor: t.blue, marginLeft: 10 }]} />
            <Text style={[s.heatLegendLabel, { color: t.textTertiary }]}>Morning</Text>
            <View style={[s.heatLegendDot, { backgroundColor: t.purple, marginLeft: 10 }]} />
            <Text style={[s.heatLegendLabel, { color: t.textTertiary }]}>Evening</Text>
            <View style={[s.heatLegendDot, { backgroundColor: t.bg3, marginLeft: 10, borderWidth: 1, borderColor: t.border }]} />
            <Text style={[s.heatLegendLabel, { color: t.textTertiary }]}>None</Text>
          </View>
        </Card>

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

        {/* Top keywords */}
        {topKeywords.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.sectionTitle, { color: t.textPrimary }]}>Your recurring patterns</Text>
            <Card>
              <View style={s.keywordRow}>
                {topKeywords.map(({ word, count }) => (
                  <View
                    key={word}
                    style={[s.keywordChip, { backgroundColor: t.bg2, borderColor: t.border }]}
                  >
                    <Text style={[s.keywordWord, { color: t.textPrimary }]}>{word}</Text>
                    <View style={[s.keywordBadge, { backgroundColor: t.teal }]}>
                      <Text style={[s.keywordCount, { color: t.bg }]}>×{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

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
  safe:           { flex: 1 },
  header:         { padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
  eyebrow:        { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  title:          { fontSize: 20, lineHeight: 27 },
  scroll:         { padding: 20, paddingBottom: 100 },
  sectionTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  chartTitle:     { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  noData:         { fontSize: 13 },
  // Heatmap
  heatmapRow:     { flexDirection: 'row', gap: 4 },
  heatmapCol:     { flexDirection: 'column', gap: 4 },
  heatCell:       { width: 10, height: 10, borderRadius: 2 },
  heatLegend:     { flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 4 },
  heatLegendDot:  { width: 10, height: 10, borderRadius: 2 },
  heatLegendLabel:{ fontSize: 10, marginLeft: 4 },
  // Keywords
  keywordRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keywordChip:    { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingVertical: 5, paddingLeft: 12, paddingRight: 6, gap: 6 },
  keywordWord:    { fontSize: 13, fontWeight: '500' },
  keywordBadge:   { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  keywordCount:   { fontSize: 10, fontWeight: '600' },
  // Insights
  insightsTitle:  { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  insightCard:    { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 10 },
  insightHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insightDate:    { fontSize: 12 },
  dailyBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  dailyBadgeText: { fontSize: 10 },
  insightText:    { fontSize: 14, lineHeight: 23, marginTop: 12 },
})
