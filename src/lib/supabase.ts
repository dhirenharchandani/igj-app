import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? 'https://placeholder.supabase.co'
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Use cached session — no network round-trip needed just to get user ID
export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
