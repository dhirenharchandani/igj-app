import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display'
import { ThemeProvider } from '../src/ThemeContext'
import { useStore } from '../src/lib/store'
import { supabase } from '../src/lib/supabase'
import { useRouter } from 'expo-router'

function RootNavigator() {
  const router = useRouter()
  const mode   = useStore(s => s.profile.theme)

  useEffect(() => {
    // Handle magic-link deep link
    const handleUrl = async (url: string) => {
      const fragment = url.split('#')[1] ?? url.split('?')[1] ?? ''
      const params = new URLSearchParams(fragment)
      const access_token  = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
      }
    }

    Linking.getInitialURL().then(url => { if (url) handleUrl(url) })
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))

    // Auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from('user_profiles').select('onboarding_done').eq('id', session.user.id).single()
        if (profile?.onboarding_done) {
          router.replace('/dashboard')
        } else {
          router.replace('/onboarding/identity')
        }
      }
      if (event === 'SIGNED_OUT') {
        router.replace('/')
      }
    })

    return () => {
      sub.remove()
      subscription.unsubscribe()
    }
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
