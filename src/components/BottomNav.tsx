import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../ThemeContext'
import { useStore } from '../lib/store'

const LINKS = [
  { href: '/dashboard',          label: 'Home' },
  { href: '/checkin/morning',    label: 'Daily' },
  { href: '/weekly/data-bridge', label: 'Weekly' },
  { href: '/learn',              label: 'Learn' },
  { href: '/patterns',           label: 'Patterns' },
]

export function BottomNav() {
  const router   = useRouter()
  const path     = usePathname()
  const t        = useTheme()
  const insets   = useSafeAreaInsets()
  const { profile, setTheme } = useStore()
  const isDark   = profile.theme === 'dark'

  return (
    <View style={[
      styles.nav,
      { backgroundColor: t.bg2, borderTopColor: t.border, paddingBottom: Math.max(8, insets.bottom) }
    ]}>
      {LINKS.map(link => {
        const active = path === link.href || path.startsWith(link.href + '/')
        return (
          <TouchableOpacity
            key={link.href}
            onPress={() => router.push(link.href as any)}
            style={styles.tab}
            activeOpacity={0.65}
          >
            <Text style={[
              styles.label,
              { color: active ? t.textPrimary : t.textTertiary,
                fontWeight: active ? '600' : '400' }
            ]}>
              {link.label}
            </Text>
            {active && (
              <View style={[styles.dot, { backgroundColor: t.teal }]} />
            )}
          </TouchableOpacity>
        )
      })}

      {/* Theme toggle */}
      <TouchableOpacity
        onPress={() => setTheme(isDark ? 'light' : 'dark')}
        style={styles.tab}
        activeOpacity={0.65}
      >
        <Text style={styles.emoji}>{isDark ? '☀️' : '🌙'}</Text>
        <Text style={[styles.label, { color: t.textTertiary }]}>
          {isDark ? 'Light' : 'Dark'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  emoji: {
    fontSize: 14,
    lineHeight: 18,
  },
})
