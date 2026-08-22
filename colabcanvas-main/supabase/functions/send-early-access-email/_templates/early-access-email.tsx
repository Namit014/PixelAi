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
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface EarlyAccessEmailProps {
  fullName: string
}

export const EarlyAccessEmail = ({ fullName }: EarlyAccessEmailProps) => {
  const firstName = fullName.split(' ')[0]

  return (
    <Html>
      <Head />
      <Preview>You're on the Design Tool early access list! 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Colab Logo */}
          <Section style={header}>
            <Img
              src="https://todaviqzeylccmyduomt.supabase.co/storage/v1/object/public/email-assets/colab-logo-dark.svg"
              width="120"
              height="40"
              alt="Colab"
              style={logo}
            />
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>You're on the early access list! 🎉</Heading>
            
            <Text style={text}>Hi {firstName},</Text>
            
            <Text style={text}>
              Thank you for your interest in the <strong>Colab Design Tool</strong>. You've been added to our early access list and will be among the first to experience professional-grade design capabilities.
            </Text>

            {/* What to Expect Section */}
            <Section style={benefitsContainer}>
              <Heading style={h2}>What to Expect</Heading>
              
              <Section style={benefitItem}>
                <Text style={benefitIcon}>📧</Text>
                <Text style={benefitText}>
                  <strong>Launch Notification</strong><br />
                  We'll email you as soon as the Design Tool launches
                </Text>
              </Section>

              <Section style={benefitItem}>
                <Text style={benefitIcon}>🎨</Text>
                <Text style={benefitText}>
                  <strong>Exclusive Early Access</strong><br />
                  Get immediate access to all professional features
                </Text>
              </Section>

              <Section style={benefitItem}>
                <Text style={benefitIcon}>💎</Text>
                <Text style={benefitText}>
                  <strong>Premium Benefits</strong><br />
                  Lifetime access to premium features as our thank you
                </Text>
              </Section>

              <Section style={benefitItem}>
                <Text style={benefitIcon}>📝</Text>
                <Text style={benefitText}>
                  <strong>Shape the Product</strong><br />
                  Direct input on feature development and priorities
                </Text>
              </Section>
            </Section>

            {/* Feature Highlights */}
            <Section style={featuresSection}>
              <Heading style={h2}>What You'll Get</Heading>
              
              <Section style={featureGrid}>
                <Section style={featureCard}>
                  <Text style={featureIcon}>✍️</Text>
                  <Text style={featureTitle}>Advanced Typography</Text>
                  <Text style={featureDescription}>
                    Text morphing, custom paths, and professional typographic controls
                  </Text>
                </Section>

                <Section style={featureCard}>
                  <Text style={featureIcon}>🎨</Text>
                  <Text style={featureTitle}>Vector Drawing</Text>
                  <Text style={featureDescription}>
                    Pen tool, bezier curves, and precise vector shape creation
                  </Text>
                </Section>

                <Section style={featureCard}>
                  <Text style={featureIcon}>🖼️</Text>
                  <Text style={featureTitle}>Image Editing</Text>
                  <Text style={featureDescription}>
                    Professional image manipulation with filters and adjustments
                  </Text>
                </Section>
              </Section>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Link href="https://app.letscolab.tech/design-tool" style={button}>
                Visit Colab
              </Link>
            </Section>

            <Text style={text}>
              We're working hard to make the Design Tool the most intuitive and powerful design platform. Your early access spot is secured, and we can't wait to share it with you.
            </Text>

            <Text style={signature}>
              — The Colab Team
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Contact us at{' '}
              <Link href="mailto:support@letscolab.tech" style={footerLink}>
                support@letscolab.tech
              </Link>
            </Text>
            <Text style={footerSmall}>
              You're receiving this because you signed up for Design Tool early access at{' '}
              <Link href="https://app.letscolab.tech" style={footerLink}>
                app.letscolab.tech
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default EarlyAccessEmail

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 20px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const content = {
  padding: '0 20px',
}

const h1 = {
  color: '#18181b',
  fontSize: '32px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '16px 0 24px',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '32px 0 16px',
}

const text = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
}

const signature = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '32px 0 16px',
  fontStyle: 'italic' as const,
}

const benefitsContainer = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#fafafa',
  borderRadius: '12px',
}

const benefitItem = {
  display: 'flex',
  alignItems: 'flex-start',
  margin: '16px 0',
}

const benefitIcon = {
  fontSize: '24px',
  marginRight: '12px',
  lineHeight: '1.4',
}

const benefitText = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0',
}

const featuresSection = {
  margin: '32px 0',
}

const featureGrid = {
  display: 'grid',
  gap: '16px',
}

const featureCard = {
  padding: '20px',
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  margin: '8px 0',
}

const featureIcon = {
  fontSize: '32px',
  margin: '0 0 8px',
}

const featureTitle = {
  color: '#18181b',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '8px 0',
}

const featureDescription = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '4px 0 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  display: 'inline-block',
  padding: '14px 32px',
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  borderRadius: '8px',
  textAlign: 'center' as const,
}

const footer = {
  padding: '32px 20px 0',
  borderTop: '1px solid #e4e4e7',
  marginTop: '48px',
}

const footerText = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '8px 0',
  textAlign: 'center' as const,
}

const footerSmall = {
  color: '#a1a1aa',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '8px 0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#7c3aed',
  textDecoration: 'underline',
}
