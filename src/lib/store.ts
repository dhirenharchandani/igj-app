import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Theme = 'light' | 'dark'

export interface UserProfile {
  display_name: string
  timezone: string
  theme: Theme
  morning_time: string   // HH:MM:SS
  evening_time: string   // HH:MM:SS
  identity_gap_text: string
}

export interface AssessmentScores {
  body_energy: number
  mind_dialogue: number
  intimacy: number
  family: number
  circle: number
  purpose: number
  experiences: number
  alignment: number
  wealth: number
  growth: number
}

export interface OnboardingState {
  intro_completed: boolean
  pillars_viewed: boolean
  assessment_completed: boolean
  assessment_scores: AssessmentScores
}

interface TodayStatus {
  date: string          // YYYY-MM-DD this status belongs to
  morningDone: boolean
  eveningDone: boolean
  scorecardDone: boolean
}

interface Store {
  onboarding: OnboardingState
  profile: UserProfile
  setTheme: (theme: Theme) => void
  updateProfile: (data: Partial<UserProfile>) => void
  markAssessmentDone: () => void
  // Today's check-in status — updated immediately on save, no async
  todayStatus: TodayStatus
  markMorningDone: () => void
  markEveningDone: () => void
  markScorecardDone: () => void
  getTodayStatus: () => TodayStatus
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      onboarding: {
        intro_completed: false,
        pillars_viewed: false,
        assessment_completed: false,
        assessment_scores: {
          body_energy: 0, mind_dialogue: 0, intimacy: 0, family: 0,
          circle: 0, purpose: 0, experiences: 0,
          alignment: 0, wealth: 0, growth: 0,
        },
      },
      profile: {
        display_name: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        theme: 'dark',
        morning_time: '07:00:00',
        evening_time: '21:00:00',
        identity_gap_text: '',
      },
      setTheme: (theme) =>
        set((s) => ({ profile: { ...s.profile, theme } })),
      updateProfile: (data) =>
        set((s) => ({ profile: { ...s.profile, ...data } })),
      markAssessmentDone: () =>
        set((s) => ({ onboarding: { ...s.onboarding, assessment_completed: true } })),

      todayStatus: { date: '', morningDone: false, eveningDone: false, scorecardDone: false },

      getTodayStatus: () => {
        const today = new Date().toISOString().split('T')[0]
        const stored = get().todayStatus
        // Reset if stored date is not today
        if (stored.date !== today) return { date: today, morningDone: false, eveningDone: false, scorecardDone: false }
        return stored
      },

      markMorningDone: () => {
        const today = new Date().toISOString().split('T')[0]
        set((s) => {
          const base = s.todayStatus.date === today
            ? s.todayStatus
            : { date: today, morningDone: false, eveningDone: false, scorecardDone: false }
          return { todayStatus: { ...base, morningDone: true } }
        })
      },
      markEveningDone: () => {
        const today = new Date().toISOString().split('T')[0]
        set((s) => {
          const base = s.todayStatus.date === today
            ? s.todayStatus
            : { date: today, morningDone: false, eveningDone: false, scorecardDone: false }
          return { todayStatus: { ...base, eveningDone: true } }
        })
      },
      markScorecardDone: () => {
        const today = new Date().toISOString().split('T')[0]
        set((s) => {
          const base = s.todayStatus.date === today
            ? s.todayStatus
            : { date: today, morningDone: false, eveningDone: false, scorecardDone: false }
          return { todayStatus: { ...base, scorecardDone: true } }
        })
      },
    }),
    {
      name: 'inner-game-journal',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, onboarding: s.onboarding, todayStatus: s.todayStatus }),
    }
  )
)
