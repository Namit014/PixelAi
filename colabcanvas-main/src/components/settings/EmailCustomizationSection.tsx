import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Mail, Palette, Eye } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

interface EmailSettings {
  id: string;
  logo_url: string;
  brand_name: string;
  primary_color: string;
  button_radius: string;
  footer_text: string;
  support_email: string;
  signup_heading: string;
  signup_body: string;
  signup_button: string;
  recovery_heading: string;
  recovery_body: string;
  recovery_button: string;
  magiclink_heading: string;
  magiclink_body: string;
  magiclink_button: string;
  welcome_heading: string;
  welcome_body: string;
}

const DEFAULT_SETTINGS: Omit<EmailSettings, 'id'> = {
  logo_url: '',
  brand_name: 'Colab',
  primary_color: '#18181b',
  button_radius: '12px',
  footer_text: '— The Colab Team',
  support_email: 'support@letscolab.in',
  signup_heading: 'Welcome aboard 👋',
  signup_body: "You're one step away from creating with Colab. Confirm your email to get started.",
  signup_button: 'Get Started',
  recovery_heading: 'Reset your password',
  recovery_body: 'We got a request to reset your password. Click below to choose a new one.',
  recovery_button: 'Reset Password',
  magiclink_heading: 'Sign in to Colab',
  magiclink_body: 'Click below to log in. This link expires shortly, so use it soon.',
  magiclink_button: 'Sign In',
  welcome_heading: 'Welcome to Colab!',
  welcome_body: "You're now part of a creative community using AI to design amazing visuals.",
};

type PreviewType = 'signup' | 'recovery' | 'magiclink' | 'welcome';

export const EmailCustomizationSection = () => {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<PreviewType>('signup');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error loading email settings:', error);
      toast.error('Failed to load email settings');
    } else if (data) {
      setSettings(data as unknown as EmailSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('email_settings')
      .update({
        logo_url: settings.logo_url,
        brand_name: settings.brand_name,
        primary_color: settings.primary_color,
        button_radius: settings.button_radius,
        footer_text: settings.footer_text,
        support_email: settings.support_email,
        signup_heading: settings.signup_heading,
        signup_body: settings.signup_body,
        signup_button: settings.signup_button,
        recovery_heading: settings.recovery_heading,
        recovery_body: settings.recovery_body,
        recovery_button: settings.recovery_button,
        magiclink_heading: settings.magiclink_heading,
        magiclink_body: settings.magiclink_body,
        magiclink_button: settings.magiclink_button,
        welcome_heading: settings.welcome_heading,
        welcome_body: settings.welcome_body,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      } as any)
      .eq('id', settings.id);

    if (error) {
      toast.error('Failed to save email settings');
      console.error(error);
    } else {
      toast.success('Email settings saved');
    }
    setSaving(false);
  };

  const update = (key: keyof Omit<EmailSettings, 'id'>, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const getPreviewContent = () => {
    if (!settings) return { heading: '', body: '', button: '' };
    switch (activeTemplate) {
      case 'signup':
        return { heading: settings.signup_heading, body: settings.signup_body, button: settings.signup_button };
      case 'recovery':
        return { heading: settings.recovery_heading, body: settings.recovery_body, button: settings.recovery_button };
      case 'magiclink':
        return { heading: settings.magiclink_heading, body: settings.magiclink_body, button: settings.magiclink_button };
      case 'welcome':
        return { heading: settings.welcome_heading, body: settings.welcome_body, button: 'Start Creating' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Email settings not available. Admin access required.</p>
      </div>
    );
  }

  const preview = getPreviewContent();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Email Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Customize branding and content for all auth emails</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="border-b border-zinc-200 w-full justify-start gap-6 pb-0">
          <TabsTrigger value="branding" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 rounded-none pb-3">
            <Palette className="w-4 h-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 rounded-none pb-3">
            <Mail className="w-4 h-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 rounded-none pb-3">
            <Eye className="w-4 h-4" /> Preview
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Brand Name</label>
                <Input value={settings.brand_name} onChange={e => update('brand_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Support Email</label>
                <Input value={settings.support_email} onChange={e => update('support_email', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Logo URL</label>
              <Input value={settings.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." />
              {settings.logo_url && (
                <div className="mt-2 p-4 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-center">
                  <img src={settings.logo_url} alt="Logo preview" className="max-h-10 object-contain" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Primary Color</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer shrink-0"
                    style={{ backgroundColor: settings.primary_color }}
                  />
                  <Input value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="font-mono" />
                </div>
                {showColorPicker && (
                  <div className="mt-2">
                    <HexColorPicker color={settings.primary_color} onChange={c => update('primary_color', c)} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Button Radius</label>
                <Input value={settings.button_radius} onChange={e => update('button_radius', e.target.value)} placeholder="12px" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Footer Text</label>
              <Input value={settings.footer_text} onChange={e => update('footer_text', e.target.value)} />
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="gap-4 mb-6">
              <TabsTrigger value="signup">Signup</TabsTrigger>
              <TabsTrigger value="recovery">Recovery</TabsTrigger>
              <TabsTrigger value="magiclink">Magic Link</TabsTrigger>
              <TabsTrigger value="welcome">Welcome</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-4">
              <Field label="Heading" value={settings.signup_heading} onChange={v => update('signup_heading', v)} />
              <Field label="Body Text" value={settings.signup_body} onChange={v => update('signup_body', v)} multiline />
              <Field label="Button Text" value={settings.signup_button} onChange={v => update('signup_button', v)} />
            </TabsContent>

            <TabsContent value="recovery" className="space-y-4">
              <Field label="Heading" value={settings.recovery_heading} onChange={v => update('recovery_heading', v)} />
              <Field label="Body Text" value={settings.recovery_body} onChange={v => update('recovery_body', v)} multiline />
              <Field label="Button Text" value={settings.recovery_button} onChange={v => update('recovery_button', v)} />
            </TabsContent>

            <TabsContent value="magiclink" className="space-y-4">
              <Field label="Heading" value={settings.magiclink_heading} onChange={v => update('magiclink_heading', v)} />
              <Field label="Body Text" value={settings.magiclink_body} onChange={v => update('magiclink_body', v)} multiline />
              <Field label="Button Text" value={settings.magiclink_button} onChange={v => update('magiclink_button', v)} />
            </TabsContent>

            <TabsContent value="welcome" className="space-y-4">
              <Field label="Heading" value={settings.welcome_heading} onChange={v => update('welcome_heading', v)} />
              <Field label="Body Text" value={settings.welcome_body} onChange={v => update('welcome_body', v)} multiline />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <div className="flex gap-3 mb-4">
            {(['signup', 'recovery', 'magiclink', 'welcome'] as PreviewType[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTemplate(t)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  activeTemplate === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Email Preview Card */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white max-w-[600px] mx-auto shadow-sm">
            {/* Logo */}
            <div className="border-b border-zinc-200 py-8 px-5 text-center">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.brand_name} className="h-8 mx-auto object-contain" />
              ) : (
                <span className="text-xl font-bold" style={{ color: settings.primary_color }}>{settings.brand_name}</span>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-10 text-center">
              <h1 className="text-2xl font-bold mb-4" style={{ color: settings.primary_color }}>{preview.heading}</h1>
              <p className="text-[15px] text-zinc-500 leading-relaxed mb-6">{preview.body}</p>
              <button
                className="text-white font-semibold px-7 py-3.5 text-[15px] inline-block"
                style={{
                  backgroundColor: settings.primary_color,
                  borderRadius: settings.button_radius,
                }}
              >
                {preview.button}
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 py-6 px-5 text-center">
              <p className="text-sm text-zinc-500 mb-1">{settings.footer_text}</p>
              <p className="text-xs text-zinc-400">
                Need help? <span className="underline">{settings.support_email}</span>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Field = ({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-foreground">{label}</label>
    {multiline ? (
      <Textarea value={value} onChange={e => onChange(e.target.value)} rows={3} />
    ) : (
      <Input value={value} onChange={e => onChange(e.target.value)} />
    )}
  </div>
);
