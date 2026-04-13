import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/ThemeContext'
import { BottomNav } from '../src/components/BottomNav'

const CHAPTERS = [
  {
    num: 1, tag: 'Foundation', title: 'The Mirror',
    oneline: 'See the patterns running underneath your decisions.',
    content: [
      'This is not a journal. This is a mirror. A system. A daily confrontation with who you are… and who you\'re becoming. Because here\'s the truth most people avoid: You don\'t get the life you want. You get the life your patterns create.',
      'A pattern is a repeated behavior driven by an unconscious belief or emotional response. It runs without your permission. The first job of inner work is to make the unconscious conscious.',
      'Most journaling processes emotions. This journal examines them. The questions aren\'t therapeutic — they\'re diagnostic. Designed to surface what\'s running underneath, not just what you\'re feeling on the surface.',
      'The check-in is not a performance. The scorecard is not a grade. Both are data. Your job is to look clearly — without defensiveness, without self-attack. Just honest observation.',
    ],
    closing: 'The person who can see themselves clearly has an enormous advantage over the person who can\'t. That\'s the work.',
    cta: { label: 'Apply this to your next check-in →', href: '/checkin/morning' },
  },
  {
    num: 2, tag: 'Identity', title: 'What Changes',
    oneline: 'How the daily rhythm creates the evidence identity needs.',
    content: [
      'Identity doesn\'t change through insight. It changes through repeated evidence. Understanding something is not the same as becoming it.',
      'Every time you do what you said you\'d do, you deposit a piece of evidence into your self-concept. Every time you don\'t, you make a withdrawal. The balance determines who you believe you are.',
      'One powerful session doesn\'t change a pattern. Thirty mediocre sessions does. The consistency is the point — not the quality of any single day.',
      'The morning check-in isn\'t motivational. It\'s architectural. You\'re constructing the day before the day constructs you.',
      'The evening tab closes the loop. It makes the gap visible. And the gap — honestly named — is the most important data point you have.',
    ],
    closing: 'You\'re not trying to have a perfect day. You\'re building a person. One day at a time.',
    cta: { label: 'Apply this to your next check-in →', href: '/checkin/morning' },
  },
  {
    num: 3, tag: 'Leverage', title: 'The System',
    oneline: 'Find your leverage point across the six pillars.',
    content: [
      'The six pillars aren\'t equal. Your performance in one pillar is upstream of everything else. Finding that pillar and focusing there first is the highest-leverage move you can make.',
      'Most people address downstream symptoms. Low energy, poor focus, procrastination — these are outcomes. The upstream cause is almost always in Self-Awareness, Identity, or Emotional Regulation.',
      'Your daily and weekly scorecard dimensions tell you where the system is breaking down. A consistently low Ownership score isn\'t a motivation problem. It\'s an identity problem. Name it accurately.',
      'For most people, one pillar is the constraint. Fix it and everything else improves. Ignore it and no amount of work on the other five will produce lasting results.',
    ],
    closing: 'Find your constraint. Work on that. Everything else is maintenance.',
    cta: { label: 'See your patterns →', href: '/patterns' },
  },
  {
    num: 4, tag: 'Consistency', title: 'The Commitment',
    oneline: 'What separates people who change from people who reflect.',
    content: [
      'Most people quit a journal in week two. Not because the journal doesn\'t work. Because it does. They start to see things they weren\'t ready to see.',
      'Resistance isn\'t laziness. It\'s protection. When the journal starts surfacing a pattern that challenges your self-concept, the self-concept fights back. That\'s the moment most people stop.',
      'Commitment isn\'t enthusiasm. It\'s showing up when you don\'t want to. It\'s doing the check-in on the day when you already know the answer will be uncomfortable.',
      'Research on behavioral change consistently shows that patterns become durable after 30 days of repeated action. The first 30 days are the hardest. Not because the practice is hard — because the resistance is highest.',
    ],
    closing: 'The people who change are not more motivated. They\'re more honest. And they keep showing up to be honest, even when it\'s uncomfortable. That\'s the commitment.',
    cta: { label: 'Start today\'s check-in →', href: '/checkin/morning' },
  },
]

export default function LearnScreen() {
  const router = useRouter()
  const t      = useTheme()
  const [open, setOpen] = useState<number | null>(null)

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[s.eyebrow, { color: t.gray }]}>Library</Text>
        <Text style={[s.title, { color: t.textPrimary }]}>Learn More</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {CHAPTERS.map(ch => (
          <TouchableOpacity
            key={ch.num}
            onPress={() => setOpen(open === ch.num ? null : ch.num)}
            activeOpacity={0.85}
            style={[s.card, { backgroundColor: t.bg2, borderColor: t.border }]}
          >
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <View style={s.chMeta}>
                  <Text style={[s.chNum, { color: t.gray }]}>Ch.{ch.num}</Text>
                  <View style={[s.tag, { backgroundColor: t.bg3, borderWidth: 1, borderColor: t.border }]}>
                    <Text style={[s.tagText, { color: t.gray }]}>{ch.tag}</Text>
                  </View>
                </View>
                <Text style={[s.chTitle, { color: t.textPrimary }]}>{ch.title}</Text>
                <Text style={[s.oneline, { color: t.textSecondary }]}>{ch.oneline}</Text>
              </View>
              <Text style={[s.chevron, { color: t.textTertiary, transform: [{ rotate: open === ch.num ? '180deg' : '0deg' }] }]}>⌄</Text>
            </View>

            {open === ch.num && (
              <View style={[s.content, { borderTopColor: t.border }]}>
                {ch.content.map((para, i) => (
                  <Text key={i} style={[s.para, { color: t.textSecondary }]}>{para}</Text>
                ))}
                <View style={[s.closing, { borderLeftColor: t.gray }]}>
                  <Text style={[s.closingText, { color: t.textPrimary, fontFamily: 'DMSerifDisplay_400Regular_Italic' }]}>"{ch.closing}"</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setOpen(null); router.push(ch.cta.href as any) }}
                  style={[s.ctaBtn, { backgroundColor: t.bg3, borderColor: t.border }]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.ctaBtnText, { color: t.textSecondary }]}>{ch.cta.label}</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  header:    { padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
  eyebrow:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  title:     { fontSize: 22, fontWeight: '600' },
  scroll:    { padding: 20, paddingBottom: 100 },
  card:      { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 12 },
  cardTop:   { flexDirection: 'row', alignItems: 'flex-start' },
  chMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  chNum:     { fontSize: 11, fontWeight: '500' },
  tag:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tagText:   { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  chTitle:   { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  oneline:   { fontSize: 13, lineHeight: 20 },
  chevron:   { fontSize: 18, marginLeft: 12 },
  content:   { marginTop: 24, borderTopWidth: 1, paddingTop: 20 },
  para:      { fontSize: 15, lineHeight: 26, marginBottom: 18 },
  closing:   { borderLeftWidth: 2, paddingLeft: 14, marginBottom: 20 },
  closingText:{ fontSize: 15, lineHeight: 25 },
  ctaBtn:    { padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  ctaBtnText:{ fontSize: 13 },
})
