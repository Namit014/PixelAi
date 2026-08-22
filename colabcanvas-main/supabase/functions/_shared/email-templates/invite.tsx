/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const LOGO_URL = 'https://todaviqzeylccmyduomt.supabase.co/storage/v1/object/public/email-assets/colab-wordmark.svg'

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to Colab</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Colab" width="120" height="32" style={{ margin: '0 auto' }} />
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>You're invited 🎉</Heading>
          <Text style={text}>
            Someone invited you to join{' '}
            <Link href={siteUrl} style={link}><strong>Colab</strong></Link>.
            Accept below to create your account and start creating.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={footerNote}>
            Wasn't expecting this? You can safely ignore this email.
          </Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>— The Colab Team</Text>
          <Text style={footerSubtext}>
            Need help?{' '}
            <Link href="mailto:support@letscolab.in" style={link}>
              support@letscolab.in
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
}
const container = { margin: '0 auto', padding: '0', maxWidth: '600px' }
const logoSection = {
  padding: '40px 20px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e4e4e7',
}
const contentSection = { padding: '40px 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#18181b',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#737380',
  lineHeight: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const link = { color: '#18181b', textDecoration: 'underline' }
const buttonContainer = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = {
  backgroundColor: '#18181b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footerNote = { fontSize: '13px', color: '#a1a1aa', textAlign: 'center' as const, margin: '0' }
const footer = {
  borderTop: '1px solid #e4e4e7',
  padding: '24px 20px',
  textAlign: 'center' as const,
}
const footerText = { color: '#737380', fontSize: '14px', margin: '0 0 4px' }
const footerSubtext = { color: '#a1a1aa', fontSize: '13px', margin: '0' }
