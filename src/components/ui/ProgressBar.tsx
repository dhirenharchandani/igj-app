import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../ThemeContext'

interface ProgressBarProps {
  value: number   // 0–100
  color?: string
}

export function ProgressBar({ value, color }: ProgressBarProps) {
  const t = useTheme()
  return (
    <View style={[styles.track, { backgroundColor: t.bg3 }]}>
      <View style={[styles.fill, { width: `${value}%`, backgroundColor: color ?? t.teal }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { height: 2, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
})
