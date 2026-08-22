/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Colab Companion'

interface ActionItem { task: string; owner?: string; due?: string }

interface Props {
  recipient_name?: string
  project_title?: string
  meeting_date?: string
  attendees?: string[]
  summary_md?: string
  decisions?: string[]
  action_items?: ActionItem[]
  risks?: string[]
  download_url?: string
  cc_rumi?: boolean
}

const MeetingMomEmail = ({
  recipient_name,
  project_title = 'Working session',
  meeting_date = '',
  attendees = [],
  summary_md = '',
  decisions = [],
  action_items = [],
  risks = [],
  download_url,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Minutes of meeting — {project_title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={kicker}>Minutes of meeting</Text>
          <Heading style={h1}>{project_title}</Heading>
          {meeting_date ? <Text style={dateLine}>{meeting_date}</Text> : null}

          <Text style={greet}>{recipient_name ? `Hi ${recipient_name},` : 'Hi,'}</Text>
          <Text style={text}>
            Here is a recap of what was discussed, decisions made, and the next steps.
          </Text>

          {attendees.length > 0 && (
            <>
              <Heading as="h2" style={h2}>Attendees</Heading>
              <Text style={text}>{attendees.join(', ')}</Text>
            </>
          )}

          <Heading as="h2" style={h2}>Summary</Heading>
          <Text style={{ ...text, whiteSpace: 'pre-wrap' as const }}>
            {summary_md || '(No summary available.)'}
          </Text>

          <Heading as="h2" style={h2}>Decisions</Heading>
          {decisions.length === 0 ? (
            <Text style={muted}>No decisions logged.</Text>
          ) : (
            decisions.map((d, i) => <Text key={i} style={listItem}>• {d}</Text>)
          )}

          <Heading as="h2" style={h2}>Action items</Heading>
          {action_items.length === 0 ? (
            <Text style={muted}>No action items.</Text>
          ) : (
            action_items.map((a, i) => (
              <Text key={i} style={listItem}>
                • {a.task}
                {a.owner ? ` — ${a.owner}` : ''}
                {a.due ? ` — due ${a.due}` : ''}
              </Text>
            ))
          )}

          <Heading as="h2" style={h2}>Risks</Heading>
          {risks.length === 0 ? (
            <Text style={muted}>None flagged.</Text>
          ) : (
            risks.map((r, i) => <Text key={i} style={listItem}>• {r}</Text>)
          )}

          {download_url && (
            <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
              <Button href={download_url} style={btn}>Download minutes (.md)</Button>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Sent automatically by {SITE_NAME} after your working session.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MeetingMomEmail,
  subject: (data: Record<string, any>) =>
    `Minutes of meeting — ${data?.project_title || 'Working session'}`,
  displayName: 'Meeting recap (MoM)',
  previewData: {
    recipient_name: 'Jane',
    project_title: 'Brand refresh — kickoff',
    meeting_date: 'Apr 25, 2026 · 3:00 PM',
    attendees: ['Jane Doe', 'Alex Kim', 'RUMi'],
    summary_md:
      '• Aligned on the new visual direction\n• Agreed scope for phase 1 (logo + brand system)\n• Designer to share first concepts in 5 days',
    decisions: ['Approved navy + cream palette', 'Lock scope at 3 logo concepts'],
    action_items: [
      { task: 'Share moodboard for review', owner: 'Alex', due: 'Apr 28' },
      { task: 'Confirm typography shortlist', owner: 'Jane' },
    ],
    risks: ['Tight timeline if feedback slips'],
    download_url: 'https://example.com/mom.md',
    cc_rumi: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }
const container = { padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }
const card = { background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '16px', padding: '32px' }
const kicker = { margin: '0 0 4px', color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const h1 = { margin: '0 0 4px', color: '#18181b', fontSize: '22px', fontWeight: 600, lineHeight: 1.25 }
const dateLine = { margin: '0 0 24px', color: '#71717a', fontSize: '13px' }
const greet = { margin: '0 0 6px', color: '#18181b', fontSize: '14px' }
const text = { margin: '0 0 14px', color: '#3f3f46', fontSize: '14px', lineHeight: 1.6 }
const muted = { margin: '0 0 14px', color: '#a1a1aa', fontSize: '14px' }
const listItem = { margin: '0 0 4px', color: '#3f3f46', fontSize: '14px', lineHeight: 1.6 }
const h2 = { margin: '20px 0 8px', color: '#18181b', fontSize: '14px', fontWeight: 600 }
const btn = { background: '#18181b', color: '#ffffff', padding: '10px 22px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }
const hr = { borderColor: '#e4e4e7', margin: '28px 0 14px' }
const footer = { color: '#a1a1aa', fontSize: '11px', textAlign: 'center' as const, margin: 0 }
