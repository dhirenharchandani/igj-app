import React, { createContext, useContext } from 'react'
import { DARK, LIGHT, AppTheme } from './theme'
import { useStore } from './lib/store'

const ThemeContext = createContext<AppTheme>(DARK)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useStore(s => s.profile.theme)
  const colors = mode === 'dark' ? DARK : LIGHT
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext)
}
