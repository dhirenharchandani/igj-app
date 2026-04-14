import React, { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display'
import { ThemeProvider } from '../src/ThemeContext'
import { useStore } from '../src/lib/store'
import { supabase } from '../src/lib/supabase'
import { useRouter } from 'expo-router'

function RootNavigator() {
  const router = useRouter()
  const mode   = useStore(s => s.profile.theme)
  const didRestoreSession = useRef(false)

  useEffect(() => {
    // Only handle INITIAL_SESSION (returning user opens app with existing session)
    // Active sign-in navigation is handled directly in index.tsx
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session && !didRestoreSession.current) {
          didRestoreSession.current = true
          // Returning user — route based on onboarding status
          try {
            const { data: profile } = await supabase
              .from('user_profiles').select('onboarding_done').eq('id', session.user.id).maybeSingle()
            router.replace(profile?.onboarding_done ? '/dashboard' : '/onboarding/identity')
          } catch {
            router.replace('/dashboard')
          }
        }
        // No session on INITIAL_SESSION = not logged in, stay on index
      }
      if (event === 'SIGNED_OUT') {
        didRestoreSession.current = false
        router.replace('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/identity" />
        <Stack.Screen name="onboarding/first-checkin" />
        <Stack.Screen name="onboarding/schedule" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="checkin/morning" />
        <Stack.Screen name="checkin/evening" />
        <Stack.Screen name="checkin/scorecard" />
        <Stack.Screen name="weekly/data-bridge" />
        <Stack.Screen name="weekly/reset" />
        <Stack.Screen name="weekly/scorecard" />
        <Stack.Screen name="assessment" />
        <Stack.Screen name="learn" />
        <Stack.Screen name="patterns" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  })

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
