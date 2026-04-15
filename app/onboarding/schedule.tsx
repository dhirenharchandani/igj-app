import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import { useStore } from '../../src/lib/store'
import { Btn } from '../../src/components/ui/Btn'

const MORNING_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00']
const EVENING_TIMES = ['18:00', '19:00', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30']

function fmt(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr   = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function ScheduleScreen() {
  const router = useRouter()
  const t      = useTheme()
  const { markOnboardingDone, updateProfile } = useStore()
  const [morningTime, setMorningTime] = useState('07:00')
  const [eveningTime, setEveningTime] = useState('21:00')

  function save() {
    // Mark done in store immediately — _layout.tsx checks this as fallback
    markOnboardingDone()
    updateProfile({ morning_time: morningTime + ':00', evening_time: eveningTime + ':00' })
    router.replace('/assessment')
    // Persist to DB in background
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      supabase.from('user_profiles').upsert({
        id: user.id, morning_time: morningTime + ':00',
        evening_time: eveningTime + ':00', onboarding_done: true,
      }, { onConflict: 'id' }).then(() => {}).catch(() => {})
    }).catch(() => {})
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      {/* Progress dots */}
      <View style={s.dotsRow}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ width: i === 4 ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === 4 ? t.purple : t.bg3 }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
          When will you show up?
        </Text>
        <Text style={[s.sub, { color: t.textSecondary }]}>
          Setting a specific time makes you 2× more likely to follow through.
        </Text>

        {/* Morning */}
        <Text style={[s.label, { color: t.textTertiary }]}>Morning check-in</Text>
        <View style={s.timePicker}>
          {MORNING_TIMES.map(time => (
            <TouchableOpacity
              key={time}
              onPress={() => setMorningTime(time)}
              activeOpacity={0.7}
              style={[s.timeBtn, {
                backgroundColor: morningTime === time ? t.purpleDim : t.bg3,
                borderColor: morningTime === time ? t.purple : t.border,
              }]}
            >
              <Text style={[s.timeBtnText, { color: morningTime === time ? t.purple : t.textSecondary }]}>{fmt(time)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[s.hint, { color: t.textTertiary }]}>Your day starts here. Before the noise.</Text>

        {/* Evening */}
        <Text style={[s.label, { color: t.textTertiary, marginTop: 28 }]}>Evening check-in</Text>
        <View style={s.timePicker}>
          {EVENING_TIMES.map(time => (
            <TouchableOpacity
              key={time}
              onPress={() => setEveningTime(time)}
              activeOpacity={0.7}
              style={[s.timeBtn, {
                backgroundColor: eveningTime === time ? t.purpleDim : t.bg3,
                borderColor: eveningTime === time ? t.purple : t.border,
              }]}
            >
              <Text style={[s.timeBtnText, { color: eveningTime === time ? t.purple : t.textSecondary }]}>{fmt(time)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[s.hint, { color: t.textTertiary }]}>Your day ends here. What did it reveal?</Text>

        {/* Notification note */}
        <View style={[s.noteBox, { backgroundColor: t.bg3, borderColor: t.border }]}>
          <Text style={[s.noteText, { color: t.textSecondary }]}>
            🔔 You'll receive a reminder at your set times.{'\n'}
            Morning: <Text style={{ color: t.textPrimary, fontWeight: '600' }}>"Your morning check-in is ready."</Text>{'\n'}
            Evening: <Text style={{ color: t.textPrimary, fontWeight: '600' }}>"Take 5 minutes to reflect on your day."</Text>
          </Text>
        </View>

        <Btn label="Set my schedule →" onPress={save} variant="purple" />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  dotsRow:   { flexDirection: 'row', gap: 6, justifyContent: 'center', padding: 20, paddingBottom: 8 },
  scroll:    { padding: 24, paddingBottom: 48 },
  heading:   { fontSize: 28, lineHeight: 36, marginBottom: 10 },
  sub:       { fontSize: 15, lineHeight: 24, marginBottom: 40 },
  label:     { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  timePicker:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  timeBtn:   { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  timeBtnText:{ fontSize: 14, fontWeight: '500' },
  hint:      { fontSize: 13, marginBottom: 8 },
  noteBox:   { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 32, marginTop: 24 },
  noteText:  { fontSize: 13, lineHeight: 22 },
})
