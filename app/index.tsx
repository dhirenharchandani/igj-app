import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/ThemeContext'
import { supabase } from '../src/lib/supabase'
import { Btn } from '../src/components/ui/Btn'
import { Input } from '../src/components/ui/Input'
import { Card } from '../src/components/ui/Card'

export default function LandingScreen() {
  const t      = useTheme()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleAuth() {
    setError('')
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Check your internet and try again.')), 10000)
      )
      if (mode === 'signup') {
        const { error } = await Promise.race([
          supabase.auth.signUp({ email: email.trim(), password }),
          timeout,
        ]) as { error: any }
        if (error) throw error
        router.replace('/onboarding/identity')
      } else {
        const { error } = await Promise.race([
          supabase.auth.signInWithPassword({ email: email.trim(), password }),
          timeout,
        ]) as { error: any }
        if (error) throw error
        router.replace('/dashboard')
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={s.hero}>
            <Text style={[s.eyebrow, { color: t.textTertiary }]}>Inner Game Journal</Text>
            <Text style={[s.h1, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>
              You already know what to do. So why aren't you doing it?
            </Text>
            <Text style={[s.sub, { color: t.textSecondary }]}>
              The Inner Game Journal is where that gap gets examined.
            </Text>

            <View style={s.form}>
              <Input value={email} onChangeText={setEmail} placeholder="Email address"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Input value={password} onChangeText={setPassword} placeholder="Password"
                secureTextEntry autoCapitalize="none" autoCorrect={false} />
              {error ? <Text style={[s.error, { color: t.coral }]}>{error}</Text> : null}
              <Btn
                label={loading ? '…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
                onPress={handleAuth} variant="teal" loading={loading}
                disabled={!email.trim() || !password.trim()}
              />
              <TouchableOpacity onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>
                <Text style={[s.toggle, { color: t.textTertiary }]}>
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={{ color: t.teal }}>{mode === 'signin' ? 'Create one' : 'Sign in'}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Problem */}
          <View style={s.section}>
            {[
              'You set intentions. You don\'t follow through.',
              'You know the pattern. You repeat it anyway.',
              'The problem isn\'t knowledge. It\'s the inner game running underneath all of it.',
            ].map((line, i) => (
              <Text key={i} style={[s.problemLine, { color: i < 2 ? t.textSecondary : t.textPrimary, fontWeight: i === 2 ? '500' : '400' }]}>{line}</Text>
            ))}
          </View>

          {/* Not / Is */}
          <View style={s.section}>
            <Card>
              <View style={s.notIsHeader}>
                <Text style={[s.colLabel, { color: t.textTertiary }]}>This is not</Text>
                <Text style={[s.colLabel, { color: t.teal, paddingLeft: 12 }]}>This is</Text>
              </View>
              {[
                ['A productivity planner', 'A self-awareness tool'],
                ['A goal tracker', 'A pattern detector'],
                ['Another habit app', 'A mirror you use daily'],
                ['Motivation', 'Examination'],
              ].map(([n, isIt], i) => (
                <View key={i} style={s.notIsRow}>
                  <Text style={[s.notIsLeft, { color: t.textTertiary, borderRightColor: t.border }]}>{n}</Text>
                  <Text style={[s.notIsRight, { color: t.textPrimary }]}>{isIt}</Text>
                </View>
              ))}
            </Card>
          </View>

          {/* How it works */}
          <View style={[s.section, { paddingBottom: 60 }]}>
            <Text style={[s.eyebrow, { color: t.textTertiary }]}>How it works</Text>
            {[
              { step: 'Morning', desc: 'Set your intention and name the pattern you\'re watching for.' },
              { step: 'Evening', desc: 'Examine the gap between what you intended and what actually happened.' },
              { step: 'Weekly',  desc: 'See what your patterns reveal about who you\'re being, not just what you\'re doing.' },
            ].map((item, i) => (
              <View key={i} style={s.howRow}>
                <View style={[s.stepNum, { backgroundColor: t.bg3, borderColor: t.border }]}>
                  <Text style={[s.stepNumText, { color: t.textSecondary }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stepTitle, { color: t.textPrimary }]}>{item.step}</Text>
                  <Text style={[s.stepDesc, { color: t.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  scroll:      { paddingHorizontal: 28 },
  hero:        { paddingTop: 72, paddingBottom: 52, alignItems: 'center' },
  eyebrow:     { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 28 },
  h1:          { fontSize: 34, lineHeight: 42, textAlign: 'center', marginBottom: 20 },
  sub:         { fontSize: 17, lineHeight: 27, textAlign: 'center', marginBottom: 40 },
  form:        { width: '100%', gap: 12 },
  error:       { fontSize: 13, textAlign: 'center' },
  toggle:      { fontSize: 13, textAlign: 'center', marginTop: 4 },
  section:     { paddingBottom: 56 },
  problemLine: { fontSize: 17, lineHeight: 27, marginBottom: 14 },
  notIsHeader: { flexDirection: 'row', marginBottom: 16 },
  colLabel:    { flex: 1, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4 },
  notIsRow:    { flexDirection: 'row', marginBottom: 12 },
  notIsLeft:   { flex: 1, fontSize: 14, paddingRight: 12, borderRightWidth: 1 },
  notIsRight:  { flex: 1, fontSize: 14, paddingLeft: 12 },
  howRow:      { flexDirection: 'row', gap: 16, marginBottom: 24 },
  stepNum:     { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '600' },
  stepTitle:   { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  stepDesc:    { fontSize: 14, lineHeight: 22 },
})
