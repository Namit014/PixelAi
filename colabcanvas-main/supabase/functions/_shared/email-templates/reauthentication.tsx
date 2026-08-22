/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://todaviqzeylccmyduomt.supabase.co/storage/v1/object/public/email-assets/colab-wordmark.svg'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Colab verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Colab" width="120" height="32" style={{ margin: '0 auto' }} />
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>Verify your identity</Heading>
          <Text style={text}>
            Enter the code below to confirm it's you:
          </Text>
          <Section style={codeContainer}>
            <Text style={code}>{token}</Text>
          </Section>
          <Text style={expiryText}>
            This code expires in 5 minutes.
          </Text>
          <Text style={footerNote}>
            Didn't request this? You can safely ignore this email.
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

export default ReauthenticationEmail

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
const codeContainer = {
  backgroundColor: '#fafafa',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  margin: '0 0 16px',
  padding: '20px',
  textAlign: 'center' as const,
}
const code = {
  color: '#18181b',
  fontSize: '32px',
  fontWeight: '700' as const,
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
}
const expiryText = { fontSize: '13px', color: '#a1a1aa', textAlign: 'center' as const, margin: '0 0 8px' }
const footerNote = { fontSize: '13px', color: '#a1a1aa', textAlign: 'center' as const, margin: '0' }
const footer = {
  borderTop: '1px solid #e4e4e7',
  padding: '24px 20px',
  textAlign: 'center' as const,
}
const footerText = { color: '#737380', fontSize: '14px', margin: '0 0 4px' }
const footerSubtext = { color: '#a1a1aa', fontSize: '13px', margin: '0' }
