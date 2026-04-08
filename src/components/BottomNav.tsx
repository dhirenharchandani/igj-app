import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../ThemeContext'

const LINKS = [
  { href: '/dashboard',          label: 'Home'     },
  { href: '/checkin/morning',    label: 'Daily'    },
  { href: '/weekly/data-bridge', label: 'Weekly'   },
  { href: '/learn',              label: 'Learn'    },
  { href: '/patterns',           label: 'Patterns' },
  { href: '/settings',           label: 'Settings' },
]

export function BottomNav() {
  const router  = useRouter()
  const path    = usePathname()
  const t       = useTheme()
  const insets  = useSafeAreaInsets()

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
            <Text style={[styles.label, { color: active ? t.textPrimary : t.textTertiary, fontWeight: active ? '600' : '400' }]}>
              {link.label}
            </Text>
            {active && <View style={[styles.dot, { backgroundColor: t.teal }]} />}
          </TouchableOpacity>
        )
      })}
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
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
})
