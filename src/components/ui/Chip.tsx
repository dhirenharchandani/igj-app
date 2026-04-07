import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../ThemeContext'

interface ChipProps {
  label: string
  onPress: () => void
}

export function Chip({ label, onPress }: ChipProps) {
  const t = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, { backgroundColor: t.bg3, borderColor: t.border }]}
    >
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
  },
})
