import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../../ThemeContext'

type Accent = 'blue' | 'teal' | 'purple' | 'amber' | 'gray' | null

interface CardProps {
  children: React.ReactNode
  accent?: Accent
  style?: ViewStyle
  dim?: boolean
}

export function Card({ children, accent, style, dim }: CardProps) {
  const t = useTheme()

  const accentColor: Record<NonNullable<Accent>, string> = {
    blue:   t.blue,
    teal:   t.teal,
    purple: t.purple,
    amber:  t.amber,
    gray:   t.gray,
  }

  const accentBg: Record<NonNullable<Accent>, string> = {
    blue:   t.blueDim,
    teal:   t.tealDim,
    purple: t.purpleDim,
    amber:  t.amberDim,
    gray:   t.grayDim,
  }

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: dim && accent ? accentBg[accent] : t.bg2,
        borderColor: dim && accent ? accentColor[accent] : t.border,
        borderLeftWidth: accent ? 3 : 1,
        borderLeftColor: accent ? accentColor[accent] : t.border,
      },
      style,
    ]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
})
