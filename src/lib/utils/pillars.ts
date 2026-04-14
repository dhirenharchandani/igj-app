export const DAILY_DIMENSIONS = [
  { key: 'awareness', label: 'Awareness', description: 'Did you catch your patterns as they showed up — or only in hindsight?' },
  { key: 'intention', label: 'Intention', description: 'Did you act from your morning intention, or did the day run you?' },
  { key: 'state',     label: 'State',     description: 'Did you manage your energy, focus, and emotional tone?' },
  { key: 'presence',  label: 'Presence',  description: 'Were you actually in the moments that mattered — not just physically there?' },
  { key: 'ownership', label: 'Ownership', description: 'Did you own your results and reactions fully, without deflecting?' },
]

export const WEEKLY_DIMENSIONS = [
  { key: 'clarity',   label: 'Clarity',   description: 'Did you operate with clear direction?' },
  { key: 'ownership', label: 'Ownership', description: 'Did you own your outcomes fully?' },
  { key: 'presence',  label: 'Presence',  description: 'Were you in the room — mentally and emotionally?' },
  { key: 'standards', label: 'Standards', description: 'Did you hold your line?' },
  { key: 'courage',   label: 'Courage',   description: 'Did you do the hard thing you were avoiding?' },
  { key: 'growth',    label: 'Growth',    description: 'Did you stretch beyond your current pattern?' },
]

const CHAPTER_MAP: Record<string, number> = {
  awareness: 1, intention: 1, state: 2, presence: 2, ownership: 3,
}

const CHAPTERS = {
  1: { title: 'The Mirror',     description: 'See the patterns running underneath your decisions.' },
  2: { title: 'What Changes',   description: 'How the daily rhythm creates the evidence identity needs.' },
  3: { title: 'The System',     description: 'Find your leverage point across the six pillars.' },
  4: { title: 'The Commitment', description: 'What separates people who change from people who reflect.' },
}

export function getRecommendedChapter(lowestDimension: string) {
  const n = CHAPTER_MAP[lowestDimension] ?? 4
  return { chapter: n, ...CHAPTERS[n as keyof typeof CHAPTERS] }
}
