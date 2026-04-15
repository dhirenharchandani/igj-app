import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import { getWeekStart } from '../../src/lib/utils/scoring'
import { Input } from '../../src/components/ui/Input'
import { Btn } from '../../src/components/ui/Btn'
import { ProgressBar } from '../../src/components/ui/ProgressBar'

type ResetData = Record<string, string>

const SECTIONS = [
  { num: 1, title: 'Reality Check', sub: 'What actually happened this week? Facts. Not stories.', fields: [
    { key: 's1_what_happened', label: 'What actually happened this week?', placeholder: 'The facts of this week were…' },
    { key: 's1_wins', label: 'Where did I win?', placeholder: 'I won at…' },
    { key: 's1_fell_short', label: 'Where did I fall short?', placeholder: 'I fell short at…' },
    { key: 's1_knew_better', label: 'Where did I know better… and still not do it?', placeholder: 'I knew better but…' },
  ]},
  { num: 2, title: 'The Inner Game', sub: 'The pattern underneath the pattern.', fields: [
    { key: 's2_patterns', label: 'What patterns showed up this week?', placeholder: 'avoidance, overthinking, control…' },
    { key: 's2_drivers', label: 'What was driving them?', placeholder: 'fear, ego, uncertainty…' },
    { key: 's2_higher_self', label: 'Where did I act from my higher self?', placeholder: '' },
    { key: 's2_default_self', label: 'Where did I act from my default self?', placeholder: '' },
  ], callout: { key: 's2_pattern_focus', label: 'The pattern that matters most right now:' }},
  { num: 3, title: 'Decisions > Actions', sub: 'Busy is not the same as effective.', fields: [
    { key: 's3_moved_forward', label: 'What decisions moved my life or business forward?', placeholder: '' },
    { key: 's3_delayed', label: 'What decisions did I delay or avoid?', placeholder: '' },
    { key: 's3_said_yes', label: 'Where did I say yes when I should have said no?', placeholder: '' },
    { key: 's3_stayed_busy', label: 'Where did I stay busy instead of being effective?', placeholder: '' },
  ], callout: { key: 's3_avoided_decision', label: 'One decision I\'ve been avoiding:' }},
  { num: 4, title: 'Energy & Presence', sub: 'Energy is the asset. How did you manage it?', fields: [
    { key: 's4_energy_best', label: 'When was my energy at its best?', placeholder: '' },
    { key: 's4_energy_flat', label: 'When did I feel flat, distracted, or off?', placeholder: '' },
    { key: 's4_energy_protected', label: 'Did I protect my energy… or leak it?', placeholder: '' },
    { key: 's4_showed_up', label: 'How did I show up in the rooms that mattered?', placeholder: '' },
  ], callout: { key: 's4_energy_shift', label: 'One shift to elevate my baseline energy:' }},
  { num: 5, title: 'Standards', sub: 'Where you lower the bar is where the pattern lives.', fields: [
    { key: 's5_at_standard', label: 'Where did I operate at my standard?', placeholder: '' },
    { key: 's5_lowered', label: 'Where did I lower it — even slightly?', placeholder: '' },
    { key: 's5_tolerated', label: 'What did I tolerate that I shouldn\'t have?', placeholder: '' },
  ], callout: { key: 's5_standard_commit', label: 'The standard I\'m no longer negotiating:' }},
  { num: 6, title: 'Impact & Leadership', sub: 'How you show up for others is a mirror.', fields: [
    { key: 's6_impacted', label: 'Who did I positively impact this week?', placeholder: '' },
    { key: 's6_avoided_truth', label: 'Where did I avoid a conversation or truth?', placeholder: '' },
    { key: 's6_clarity', label: 'Did I create clarity… or confusion?', placeholder: '' },
  ], callout: { key: 's6_conversation', label: 'One conversation I need to have:' }},
  { num: 7, title: 'The Cost + Reset', sub: 'Honesty is where change starts.', fields: [
    { key: 's7_cost_90', label: 'If I keep operating like this for 90 days… what happens?', placeholder: '' },
    { key: 's7_cost_detail', label: 'What does it cost me — financially, emotionally, relationally?', placeholder: '' },
    { key: 's7_done_tolerating', label: 'What am I done tolerating?', placeholder: '' },
    { key: 's7_must_change', label: 'What must change — immediately?', placeholder: '' },
  ], resetBlock: true },
] as const

export default function WeeklyResetScreen() {
  const router  = useRouter()
  const t       = useTheme()
  const [section, setSection] = useState(0)
  const [data, setData]       = useState<ResetData>({})
  function set(k: string, v: string) { setData(d => ({ ...d, [k]: v })) }
  const currentSection = SECTIONS[section]

  // Navigate immediately — save in background
  function finish() {
    router.push('/weekly/scorecard')
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      supabase.from('weekly_resets')
        .upsert({ user_id: user.id, week_start: getWeekStart(), ...data }, { onConflict: 'user_id,week_start' })
        .then(() => {}).catch(() => {})
    }).catch(() => {})
  }

  return (
    <SafeAreaView style={[ss.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[ss.header, { borderBottomColor: t.border }]}>
        <View style={ss.headerRow}>
          <Text style={[ss.eyebrow, { color: t.amber }]}>Weekly Reset</Text>
          <Text style={[ss.counter, { color: t.textTertiary }]}>{section + 1}/{SECTIONS.length}</Text>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/weekly/data-bridge')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Text style={[ss.closeBtn, { color: t.textTertiary }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <ProgressBar value={((section + 1) / SECTIONS.length) * 100} color={t.amber} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[ss.sectionNum, { color: t.amber }]}>Section {currentSection.num}</Text>
          <Text style={[ss.title, { color: t.textPrimary }]}>{currentSection.title}</Text>
          <Text style={[ss.sub, { color: t.textSecondary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>"{currentSection.sub}"</Text>

          {currentSection.fields.map(f => (
            <View key={f.key} style={ss.field}>
              <Text style={[ss.fieldLabel, { color: t.textPrimary }]}>{f.label}</Text>
              <Input value={data[f.key] ?? ''} onChangeText={v => set(f.key, v)} placeholder={f.placeholder || `${f.label}…`} multiline numberOfLines={3} focusColor="amber" />
            </View>
          ))}

          {'callout' in currentSection && currentSection.callout && (
            <View style={[ss.callout, { backgroundColor: t.amberDim, borderLeftColor: t.amber }]}>
              <Text style={[ss.calloutLabel, { color: t.amber }]}>{(currentSection as any).callout.label}</Text>
              <Input value={data[(currentSection as any).callout.key] ?? ''} onChangeText={v => set((currentSection as any).callout.key, v)} placeholder="Write it here…" multiline numberOfLines={2} focusColor="amber" />
            </View>
          )}

          {'resetBlock' in currentSection && (currentSection as any).resetBlock && (
            <View>
              {(['Stop', 'Automate', 'Delegate'] as const).map(label => (
                <View key={label} style={ss.field}>
                  <Text style={[ss.fieldLabel2, { color: t.textSecondary }]}>{label}:</Text>
                  <Input value={data[`s7_${label.toLowerCase()}`] ?? ''} onChangeText={v => set(`s7_${label.toLowerCase()}`, v)} placeholder={`What I'll ${label.toLowerCase()}…`} multiline numberOfLines={2} focusColor="amber" />
                </View>
              ))}
              <Text style={[ss.fieldLabel2, { color: t.textSecondary, marginTop: 16, marginBottom: 8 }]}>Non-negotiables (3):</Text>
              {[1, 2, 3].map(i => (
                <Input key={i} value={data[`nonneg_${i}`] ?? ''} onChangeText={v => set(`nonneg_${i}`, v)} placeholder={`Non-negotiable ${i}…`} multiline numberOfLines={2} focusColor="amber" style={{ marginBottom: 10 }} />
              ))}
              <View style={[ss.quoteBox, { backgroundColor: t.bg3 }]}>
                <Text style={[ss.quote, { color: t.textSecondary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
                  "You don't get the life you want. You get the life your patterns create. So the only real question is: what pattern am I changing next week?"
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav */}
      <View style={[ss.bottom, { backgroundColor: t.bg2, borderTopColor: t.border }]}>
        {section > 0 && (
          <TouchableOpacity onPress={() => setSection(prev => prev - 1)} style={[ss.backBtn, { backgroundColor: t.bg3, borderColor: t.border }]} activeOpacity={0.8}>
            <Text style={[ss.backBtnText, { color: t.textSecondary }]}>←</Text>
          </TouchableOpacity>
        )}
        {section < SECTIONS.length - 1 ? (
          <Btn label="Next section →" onPress={() => setSection(prev => prev + 1)} variant="amber" />
        ) : (
          <Btn label="Complete reset →" onPress={finish} variant="amber" />
        )}
      </View>
    </SafeAreaView>
  )
}

const ss = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { padding: 16, paddingBottom: 16, borderBottomWidth: 1 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eyebrow:     { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4 },
  counter:     { fontSize: 12 },
  scroll:      { padding: 20, paddingBottom: 32 },
  sectionNum:  { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  title:       { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  sub:         { fontSize: 15, lineHeight: 24, marginBottom: 28 },
  field:       { marginBottom: 24 },
  fieldLabel:  { fontSize: 14, fontWeight: '500', marginBottom: 10 },
  fieldLabel2: { fontSize: 13 },
  callout:     { padding: 16, borderRadius: 12, borderLeftWidth: 3, marginBottom: 24 },
  calloutLabel:{ fontSize: 13, fontWeight: '500', marginBottom: 10 },
  quoteBox:    { padding: 16, borderRadius: 12, marginTop: 8, marginBottom: 24 },
  quote:       { fontSize: 14, lineHeight: 23 },
  bottom:      { flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 20, borderTopWidth: 1 },
  backBtn:     { padding: 14, borderRadius: 14, borderWidth: 1, paddingHorizontal: 20 },
  backBtnText: { fontSize: 16 },
  closeBtn:    { fontSize: 18, paddingLeft: 8 },
})
