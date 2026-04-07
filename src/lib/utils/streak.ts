import type { SupabaseClient } from '@supabase/supabase-js'

// Streak is computed by the user_streaks view (derived from morning_checkins).
// No separate table needed — just read from the view.
export async function updateStreak(userId: string, supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  return (data?.current_streak as number) ?? 1
}
