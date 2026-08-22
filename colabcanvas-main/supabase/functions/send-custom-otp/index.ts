import { Resend } from 'npm:resend@4';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

interface CustomOTPEmailRequest {
  email: string;
  token: string;
  token_hash: string;
  redirect_to?: string;
  email_action_type: 'signup' | 'magiclink' | 'recovery' | 'email_change';
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Custom Magic Link Email with Colab branding');
  
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting - strict for auth emails (5 per hour per IP)
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 5, window: 3600000 })) {
    return new Response(
      JSON.stringify({ error: 'Too many authentication requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const { email, token_hash, redirect_to, email_action_type }: CustomOTPEmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    // Construct the magic link URL
    const actionUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || window.location.origin + '/dashboard'}`;

    // Generate email subject and content based on action type
    const getSubject = () => {
      switch (email_action_type) {
        case 'recovery':
          return 'Reset Your Password - Colab';
        case 'email_change':
          return 'Confirm Email Change - Colab';
        case 'signup':
          return 'Welcome to Colab! Verify Your Email';
        default:
          return 'Sign In to Colab';
      }
    };

    const getHeading = () => {
      switch (email_action_type) {
        case 'recovery':
          return 'Reset Your Password';
        case 'email_change':
          return 'Confirm Email Change';
        case 'signup':
          return 'Welcome to Colab!';
        default:
          return 'Sign In to Colab';
      }
    };

    const getBodyText = () => {
      switch (email_action_type) {
        case 'recovery':
          return 'Click the button below to reset your password. This link will expire in 1 hour.';
        case 'email_change':
          return 'Click the button below to confirm your new email address.';
        case 'signup':
          return 'Thanks for signing up! Click the button below to verify your email and get started.';
        default:
          return 'Click the button below to sign in to your account.';
      }
    };

    const getButtonText = () => {
      switch (email_action_type) {
        case 'recovery':
          return 'Reset Password';
        case 'email_change':
          return 'Confirm Email';
        case 'signup':
          return 'Verify Email';
        default:
          return 'Sign In';
      }
    };

    console.log(`Sending ${email_action_type} email to ${email.substring(0, 3)}***`);

    const html = await renderAsync(
      React.createElement(
        Html,
        null,
        React.createElement(Head, null),
        React.createElement(Preview, null, getSubject()),
        React.createElement(
          Body,
          { style: main },
          React.createElement(
            Container,
            { style: container },
            React.createElement(
              Section,
              { style: logoSection },
              React.createElement(Heading, { style: logoHeading }, 'colab')
            ),
            React.createElement(
              Section,
              { style: contentSection },
              React.createElement(Heading, { style: h1 }, getHeading()),
              React.createElement(Text, { style: text }, getBodyText())
            ),
            React.createElement(
              Section,
              { style: buttonSection },
              React.createElement(
                Button,
                { href: actionUrl, style: button },
                getButtonText()
              )
            ),
            React.createElement(
              Section,
              { style: contentSection },
              React.createElement(
                Text,
                { style: linkText },
                'Or copy and paste this link into your browser:'
              ),
              React.createElement(
                Link,
                { href: actionUrl, style: link },
                actionUrl
              )
            ),
            React.createElement(
              Section,
              { style: contentSection },
              React.createElement(
                Text,
                { style: securityText },
                "If you didn't request this, you can safely ignore this email."
              )
            ),
            React.createElement(
              Section,
              { style: footer },
              React.createElement(Text, { style: footerText }, '— The Colab Team'),
              React.createElement(
                Text,
                { style: footerSubtext },
                'Need help? Contact us at ',
                React.createElement(
                  Link,
                  { href: 'mailto:support@letscolab.in', style: link },
                  'support@letscolab.in'
                )
              )
            )
          )
        )
      )
    );

    const { error } = await resend.emails.send({
      from: 'Colab <onboarding@resend.dev>',
      to: [email],
      subject: getSubject(),
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('✅ Email sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logoHeading = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#4F46E5',
  margin: '0',
  letterSpacing: '-0.02em',
};

const contentSection = {
  marginBottom: '24px',
};

const h1 = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#18181B',
  margin: '0 0 16px 0',
  lineHeight: '1.3',
};

const text = {
  fontSize: '16px',
  color: '#52525B',
  margin: '0 0 24px 0',
  lineHeight: '1.5',
};

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const button = {
  backgroundColor: '#4F46E5',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  borderRadius: '8px',
};

const linkText = {
  fontSize: '14px',
  color: '#71717A',
  margin: '0 0 8px 0',
};

const link = {
  color: '#4F46E5',
  fontSize: '14px',
  textDecoration: 'none',
  wordBreak: 'break-all' as const,
};

const securityText = {
  fontSize: '14px',
  color: '#A1A1AA',
  margin: '24px 0 0 0',
  fontStyle: 'italic',
};

const footer = {
  marginTop: '48px',
  paddingTop: '24px',
  borderTop: '1px solid #E4E4E7',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#71717A',
  margin: '0 0 8px 0',
};

const footerSubtext = {
  fontSize: '12px',
  color: '#A1A1AA',
  margin: '0',
};
