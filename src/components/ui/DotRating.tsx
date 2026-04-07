import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../ThemeContext'

interface DotRatingProps {
  value: number
  onChange: (v: number) => void
  max?: number
}

function getDotStyle(i: number, value: number, t: ReturnType<typeof useTheme>) {
  if (i > value) return { bg: 'transparent', border: t.border, color: t.textTertiary }
  if (value <= 2) return { bg: '#D85A30', border: '#D85A30', color: '#fff' }
  if (value === 3) return { bg: t.amber, border: t.amber, color: '#0e0e0c' }
  return { bg: t.blue, border: t.blue, color: '#fff' }
}

export function DotRating({ value, onChange, max = 5 }: DotRatingProps) {
  const t = useTheme()
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => i + 1).map(i => {
        const s = getDotStyle(i, value, t)
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(i)}
            activeOpacity={0.7}
            style={[styles.dot, { backgroundColor: s.bg, borderColor: s.border }]}
          >
            <Text style={[styles.num, { color: s.color }]}>{i}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  dot: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 13, fontWeight: '600' },
})
