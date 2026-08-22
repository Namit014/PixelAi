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

interface AuthEmailProps {
  email: string;
  token?: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  supabase_url: string;
}

export const AuthEmail = ({
  email,
  token,
  token_hash,
  redirect_to,
  email_action_type,
  supabase_url,
}: AuthEmailProps) => {
  const getSubject = () => {
    switch (email_action_type) {
      case 'recovery':
        return 'Reset your password';
      case 'email_change':
        return 'Confirm your email change';
      case 'signup':
        return 'Confirm your email';
      default:
        return 'Sign in to Colab';
    }
  };

  const getHeading = () => {
    switch (email_action_type) {
      case 'recovery':
        return 'Reset Your Password';
      case 'email_change':
        return 'Confirm Email Change';
      case 'signup':
        return 'Confirm Your Email';
      default:
        return 'Sign in to Colab';
    }
  };

  const getBodyText = () => {
    switch (email_action_type) {
      case 'recovery':
        return 'Enter the code below to reset your password:';
      case 'email_change':
        return 'Enter the code below to confirm your new email address:';
      case 'signup':
        return 'Enter the code below to confirm your email and get started:';
      default:
        return 'Enter the code below to sign in to your account:';
    }
  };

  const getButtonText = () => {
    switch (email_action_type) {
      case 'recovery':
        return 'Reset Password';
      case 'email_change':
        return 'Confirm Email';
      case 'signup':
        return 'Confirm Email';
      default:
        return 'Sign In';
    }
  };

  const actionUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

  return (
    <Html>
      <Head />
      <Preview>{getSubject()}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo Header */}
          <Section style={logoSection}>
            <Heading style={logoHeading}>colab</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>{getHeading()}</Heading>
            
            <Text style={text}>{getBodyText()}</Text>

            {/* OTP Code */}
            {token && (
              <Section style={codeContainer}>
                <Text style={code}>{token}</Text>
              </Section>
            )}

            <Text style={expiryText}>
              This code expires in 5 minutes. Enter it in the app to continue.
            </Text>

            <Text style={securityText}>
              If you didn't request this, you can safely ignore this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              — The Colab Team
            </Text>
            <Text style={footerSubtext}>
              Need help? Contact us at{' '}
              <Link href="mailto:support@letscolab.in" style={link}>
                support@letscolab.in
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AuthEmail;

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
};

const logoSection = {
  padding: '40px 20px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e5e7eb',
};

const logoHeading = {
  background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.02em',
};

const contentSection = {
  padding: '40px 20px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7C3AED',
  backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1',
  padding: '16px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const codeContainer = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '24px 0',
  padding: '20px',
  textAlign: 'center' as const,
};

const code = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
};

const expiryText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 8px',
  textAlign: 'center' as const,
};

const securityText = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
};

const footer = {
  borderTop: '1px solid #e5e7eb',
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
};

const link = {
  color: '#7C3AED',
  textDecoration: 'underline',
};
