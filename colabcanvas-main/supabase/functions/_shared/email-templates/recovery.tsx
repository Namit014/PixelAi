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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  logoUrl?: string
  brandName?: string
  primaryColor?: string
  buttonRadius?: string
  footerText?: string
  supportEmail?: string
  headingOverride?: string
  bodyOverride?: string
  buttonOverride?: string
}

const DEFAULT_LOGO = 'https://todaviqzeylccmyduomt.supabase.co/storage/v1/object/public/email-assets/colab-wordmark.svg'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  logoUrl,
  brandName,
  primaryColor = '#18181b',
  buttonRadius = '12px',
  footerText = '— The Colab Team',
  supportEmail = 'support@letscolab.in',
  headingOverride,
  bodyOverride,
  buttonOverride,
}: RecoveryEmailProps) => {
  const logo = logoUrl || DEFAULT_LOGO
  const name = brandName || siteName || 'Colab'
  const heading = headingOverride || 'Reset your password'
  const body = bodyOverride || 'We got a request to reset your password. Click below to choose a new one.'
  const btn = buttonOverride || 'Reset Password'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Reset your {name} password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={logo} alt={name} width="120" height="32" style={{ margin: '0 auto' }} />
          </Section>
          <Section style={contentSection}>
            <Heading style={{ ...h1, color: primaryColor }}>{heading}</Heading>
            <Text style={text}>{body}</Text>
            <Section style={buttonContainer}>
              <Button style={{ ...button, backgroundColor: primaryColor, borderRadius: buttonRadius }} href={confirmationUrl}>
                {btn}
              </Button>
            </Section>
            <Text style={footerNote}>
              Didn't request this? No worries — your password stays the same.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={fText}>{footerText}</Text>
            <Text style={footerSubtext}>
              Need help?{' '}
              <Link href={`mailto:${supportEmail}`} style={{ ...link, color: primaryColor }}>
                {supportEmail}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail

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
const fText = { color: '#737380', fontSize: '14px', margin: '0 0 4px' }
const footerSubtext = { color: '#a1a1aa', fontSize: '13px', margin: '0' }
