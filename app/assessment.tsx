import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../src/ThemeContext'
import { supabase } from '../src/lib/supabase'
import { useStore } from '../src/lib/store'
import { Btn } from '../src/components/ui/Btn'
import { ProgressBar } from '../src/components/ui/ProgressBar'
import { BottomNav } from '../src/components/BottomNav'

const AREAS = [
  { key: 'body_energy',    label: 'Body & Energy',           desc: 'Sleep, movement, and nutrition aren\'t afterthoughts — they\'re the foundation everything else is built on.' },
  { key: 'mind_dialogue',  label: 'Mind & Inner Dialogue',   desc: 'I\'m aware of the voice in my head. I don\'t believe every thought. I direct my mental state.' },
  { key: 'intimacy',       label: 'Intimacy & Presence',     desc: 'My closest relationship gets my real presence, not my leftovers.' },
  { key: 'family',         label: 'Family & Roots',          desc: 'I\'m building connection, not just coexisting. My family knows I\'m in their corner.' },
  { key: 'circle',         label: 'Circle & Influence',      desc: 'The people around me raise the standard. I invest in relationships that challenge and expand me.' },
  { key: 'purpose',        label: 'Purpose & Impact',        desc: 'My work is an expression of something real. I\'m not just executing tasks.' },
  { key: 'experiences',    label: 'Experiences & Aliveness', desc: 'I\'m creating a life worth living, not just managing one.' },
  { key: 'alignment',      label: 'Inner Alignment',         desc: 'My actions match my values. I\'m not performing a version of myself.' },
  { key: 'wealth',         label: 'Wealth & Responsibility', desc: 'I take full ownership of my financial reality. Building, not just earning.' },
  { key: 'growth',         label: 'Growth & Curiosity',      desc: 'I\'m always in the game of becoming. I seek feedback. I question assumptions.' },
]

function getColor(v: number, t: { coral: string; amber: string; teal: string }): string {
  if (v <= 3) return t.coral
  if (v <= 6) return t.amber
  return t.teal
}

export default function AssessmentScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const insets  = useSafeAreaInsets()
  const markAssessmentDone = useStore(s => s.markAssessmentDone)

  const [loading,  setLoading]  = useState(false)
  const [current,  setCurrent]  = useState(0)
  const [scores,   setScores]   = useState<Record<string, number>>({})
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)

  // Load existing assessment every time screen is focused
  useFocusEffect(useCallback(() => {
    setCurrent(0)

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const timeout = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 6000)
        )

        const { data } = await Promise.race([
          supabase
            .from('life_assessments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          timeout,
        ])

        if (data) {
          const loaded: Record<string, number> = {}
          AREAS.forEach(a => { if (data[a.key]) loaded[a.key] = data[a.key] })
          setScores(loaded)
          setDone(true)
        } else {
          setScores({})
          setDone(false)
        }
      } catch {
        setScores({})
        setDone(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []))

  const area  = AREAS[current]
  const score = scores[area?.key ?? ''] ?? 0

  async function save() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('life_assessments').insert({ user_id: user.id, ...scores })
      }
      markAssessmentDone()   // persist to store immediately — dashboard reads this on mount
      setDone(true)
    } catch {
      setDone(true)          // still advance even if save fails
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.purple} />
        </View>
      </SafeAreaView>
    )
  }

  // ── Results screen ──
  if (done) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.doneScroll}>
          <View style={s.doneHeader}>
            <Text style={[s.eyebrow, { color: t.purple }]}>Baseline set</Text>
            <Text style={[s.doneTitle, { color: t.textPrimary }]}>Now you have a starting point.</Text>
            <Text style={[s.doneSub, { color: t.textSecondary }]}>
              This is where you are right now — not where you're going.
            </Text>
          </View>

          <View style={s.barsContainer}>
            {AREAS.map(a => {
              const val = scores[a.key] ?? 0
              const color = getColor(val, t)
              return (
                <View key={a.key} style={[s.barBlock, { borderBottomColor: t.border }]}>
                  <View style={s.barTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.barLabel, { color: t.textPrimary }]}>{a.label}</Text>
                      <Text style={[s.barDesc, { color: t.textSecondary }]}>{a.desc}</Text>
                    </View>
                    <Text style={[s.barVal, { color }]}>{val}/10</Text>
                  </View>
                  <View style={[s.barTrack, { backgroundColor: t.bg3 }]}>
                    <View style={[s.barFill, { width: `${val * 10}%`, backgroundColor: color }]} />
                  </View>
                </View>
              )
            })}
          </View>

          <View style={s.doneActions}>
            <Pressable onPress={() => { setDone(false); setScores({}); setCurrent(0) }} style={s.retakeLink}>
              <Text style={[s.retakeLinkText, { color: t.textTertiary }]}>Retake assessment</Text>
            </Pressable>
            <Btn label="Back to dashboard →" onPress={() => router.replace('/dashboard')} variant="teal" />
          </View>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    )
  }

  // ── Assessment form ──
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Progress */}
      <View style={s.progressArea}>
        <View style={s.progressHeader}>
          <Text style={[s.eyebrow, { color: t.purple }]}>Whole life assessment</Text>
          <Text style={[s.counter, { color: t.textSecondary }]}>{current + 1} / {AREAS.length}</Text>
        </View>
        <ProgressBar value={((current + 1) / AREAS.length) * 100} color={t.purple} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[s.areaTitle, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
          {area.label}
        </Text>
        <Text style={[s.areaDesc, { color: t.textSecondary }]}>{area.desc}</Text>

        <Text style={[s.rateQ, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
          Not where you want to be. Where you actually are.
        </Text>
        <Text style={[s.rateHint, { color: t.textSecondary }]}>1 = very low · 10 = excellent</Text>

        {/* Two rows of 5 — each button flex: 1 for equal width */}
        {[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]].map((row, ri) => (
          <View key={ri} style={s.ratingRow}>
            {row.map(i => {
              const filled = i <= score
              const color  = filled ? getColor(score, t) : t.bg3
              const border = filled ? getColor(score, t) : t.border
              const numColor = filled ? (score <= 6 ? '#0e0e0c' : '#fff') : t.textSecondary
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setScores(ss => ({ ...ss, [area.key]: i }))}
                  activeOpacity={0.7}
                  style={[s.ratingBtn, { backgroundColor: color, borderColor: border }]}
                >
                  <Text style={[s.ratingNum, { color: numColor }]}>{i}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}

        {score > 0 && (
          <View style={[s.scoreBarTrack, { backgroundColor: t.bg3 }]}>
            <View style={[s.scoreBarFill, { width: `${score * 10}%`, backgroundColor: getColor(score, t) }]} />
          </View>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[s.bottom, { backgroundColor: t.bg2, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {current > 0 && (
          <TouchableOpacity
            onPress={() => setCurrent(c => c - 1)}
            style={[s.backBtn, { backgroundColor: t.bg3, borderColor: t.border }]}
            activeOpacity={0.8}
          >
            <Text style={[s.backBtnText, { color: t.textSecondary }]}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          {current < AREAS.length - 1 ? (
            <Btn label="Next →" onPress={() => setCurrent(c => c + 1)} variant="purple" disabled={!score} />
          ) : (
            <Btn
              label={saving ? 'Saving…' : 'Save my assessment →'}
              onPress={save}
              variant="purple"
              disabled={!score || saving}
              loading={saving}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  progressArea:   { padding: 16, paddingBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eyebrow:        { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.4 },
  counter:        { fontSize: 13, fontWeight: '500' },

  // Form
  scroll:         { padding: 20, paddingBottom: 16 },
  areaTitle:      { fontSize: 24, lineHeight: 32, marginBottom: 8 },
  areaDesc:       { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  rateQ:          { fontSize: 17, lineHeight: 24, marginBottom: 4 },
  rateHint:       { fontSize: 12, marginBottom: 14 },
  ratingRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ratingBtn:      { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ratingNum:      { fontSize: 16, fontWeight: '700' },
  scoreBarTrack:  { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  scoreBarFill:   { height: '100%', borderRadius: 3 },
  bottom:         { flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 20, borderTopWidth: 1 },
  backBtn:        { padding: 14, borderRadius: 14, borderWidth: 1, paddingHorizontal: 20 },
  backBtnText:    { fontSize: 16 },

  // Results
  doneScroll:     { padding: 24, paddingBottom: 120 },
  doneHeader:     { marginBottom: 32 },
  doneTitle:      { fontSize: 26, fontWeight: '700', marginTop: 6, marginBottom: 8, lineHeight: 32 },
  doneSub:        { fontSize: 14, lineHeight: 22 },
  barsContainer:  { marginBottom: 36 },
  barBlock:       { paddingVertical: 14, borderBottomWidth: 1 },
  barTopRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  barLabel:       { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  barDesc:        { fontSize: 12, lineHeight: 18 },
  barTrack:       { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: '100%', borderRadius: 3 },
  barVal:         { fontSize: 13, fontWeight: '700', marginLeft: 12, marginTop: 2 },
  doneActions:    { paddingTop: 8 },
  retakeLink:     { alignItems: 'center', paddingVertical: 14, marginBottom: 6 },
  retakeLinkText: { fontSize: 14 },
})
