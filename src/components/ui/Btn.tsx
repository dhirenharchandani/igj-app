import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native'
import { useTheme } from '../../ThemeContext'

type Variant = 'blue' | 'teal' | 'purple' | 'amber' | 'ghost'

interface BtnProps {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
}

export function Btn({ label, onPress, variant = 'blue', disabled, loading, style }: BtnProps) {
  const t = useTheme()

  const bg: Record<Variant, string> = {
    blue:   t.blue,
    teal:   t.teal,
    purple: t.purple,
    amber:  t.amber,
    ghost:  t.bg3,
  }

  const fg: Record<Variant, string> = {
    blue:   '#fff',
    teal:   '#fff',
    purple: '#fff',
    amber:  '#fff',
    ghost:  t.textSecondary,
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg[variant], borderWidth: variant === 'ghost' ? 1 : 0, borderColor: t.border },
        (disabled || loading) && { opacity: 0.35 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={fg[variant]} size="small" />
        : <Text style={[styles.label, { color: fg[variant] }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
})
