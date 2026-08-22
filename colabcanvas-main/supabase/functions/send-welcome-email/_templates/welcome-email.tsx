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

interface WelcomeEmailProps {
  fullName: string;
  email: string;
  logoUrl?: string;
  brandName?: string;
  primaryColor?: string;
  buttonRadius?: string;
  footerText?: string;
  supportEmail?: string;
  headingOverride?: string;
  bodyOverride?: string;
}

const DEFAULT_LOGO = 'https://todaviqzeylccmyduomt.supabase.co/storage/v1/object/public/email-assets/colab-wordmark.svg';

export const WelcomeEmail = ({
  fullName,
  email,
  logoUrl,
  brandName = 'Colab',
  primaryColor = '#18181b',
  buttonRadius = '12px',
  footerText = '— The Colab Team',
  supportEmail = 'support@letscolab.in',
  headingOverride,
  bodyOverride,
}: WelcomeEmailProps) => {
  const firstName = fullName ? fullName.split(' ')[0] : 'there';
  const dashboardUrl = 'https://app.letscolab.tech/dashboard';
  const logo = logoUrl || DEFAULT_LOGO;
  const heading = headingOverride || `Welcome to ${brandName}, ${firstName}! 🎉`;
  const body = bodyOverride || "You're now part of a creative community using AI to design amazing visuals.";

  return (
    <Html>
      <Head />
      <Preview>Welcome to {brandName} - AI that thinks like a human designer</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={logo} alt={brandName} width="120" height="32" style={{ margin: '0 auto' }} />
          </Section>

          <Section style={contentSection}>
            <Heading style={{ ...h1, color: primaryColor }}>{heading}</Heading>
            <Text style={text}>{body}</Text>

            <Section style={featuresSection}>
              <Text style={featuresTitle}>Here's what you can do:</Text>
              <Section style={featureItem}>
                <Text style={featureIcon}>✨</Text>
                <Text style={featureText}><strong>Generate stunning designs</strong> with AI-powered tools</Text>
              </Section>
              <Section style={featureItem}>
                <Text style={featureIcon}>🎨</Text>
                <Text style={featureText}><strong>Edit on infinite canvas</strong> with professional design tools</Text>
              </Section>
              <Section style={featureItem}>
                <Text style={featureIcon}>🤝</Text>
                <Text style={featureText}><strong>Collaborate in real-time</strong> with your team</Text>
              </Section>
            </Section>

            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={{ ...button, backgroundColor: primaryColor, borderRadius: buttonRadius }}>
                Start Creating
              </Link>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={fText}>{footerText}</Text>
            <Text style={footerSubtext}>
              Questions? Contact us at{' '}
              <Link href={`mailto:${supportEmail}`} style={{ ...link, color: primaryColor }}>
                {supportEmail}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
};
const container = { margin: '0 auto', padding: '0', maxWidth: '600px' };
const logoSection = {
  padding: '40px 20px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e4e4e7',
};
const contentSection = { padding: '40px 24px' };
const h1 = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#18181b',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};
const text = {
  fontSize: '15px',
  color: '#737380',
  lineHeight: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};
const featuresSection = { margin: '32px 0' };
const featuresTitle = {
  color: '#18181b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};
const featureItem = { display: 'flex', alignItems: 'flex-start', margin: '0 0 16px', padding: '0 20px' };
const featureIcon = { fontSize: '24px', margin: '0 12px 0 0', lineHeight: '1.5' };
const featureText = { color: '#737380', fontSize: '15px', lineHeight: '24px', margin: '0', flex: '1' };
const buttonContainer = { textAlign: 'center' as const, margin: '40px 0' };
const button = {
  backgroundColor: '#18181b',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 36px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  borderRadius: '12px',
};
const footer = {
  borderTop: '1px solid #e4e4e7',
  padding: '24px 20px',
  textAlign: 'center' as const,
};
const fText = { color: '#737380', fontSize: '14px', margin: '0 0 4px' };
const footerSubtext = { color: '#a1a1aa', fontSize: '13px', margin: '0' };
const link = { color: '#18181b', textDecoration: 'underline' };
