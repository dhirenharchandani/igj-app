import React from 'react'
import { TextInput, StyleSheet, TextInputProps } from 'react-native'
import { useTheme } from '../../ThemeContext'

type FocusColor = 'blue' | 'teal' | 'purple' | 'amber' | 'gray'

interface InputProps extends TextInputProps {
  focusColor?: FocusColor
  multiline?: boolean
  numberOfLines?: number
}

export function Input({ focusColor = 'blue', style, ...props }: InputProps) {
  const t = useTheme()
  const [focused, setFocused] = React.useState(false)

  const borderColorMap: Record<FocusColor, string> = {
    blue:   t.blueBorder,
    teal:   t.tealBorder,
    purple: t.purpleBorder,
    amber:  t.amberBorder,
    gray:   t.grayBorder,
  }

  return (
    <TextInput
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholderTextColor={t.textTertiary}
      style={[
        styles.input,
        {
          backgroundColor: t.bg3,
          color: t.textPrimary,
          borderColor: focused ? borderColorMap[focusColor] : t.border,
        },
        style,
      ]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    lineHeight: 23,
    textAlignVertical: 'top',
  },
})
