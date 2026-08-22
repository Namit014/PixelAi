import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Send } from 'lucide-react';
import DOMPurify from 'dompurify';

export const EmailBuilder = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !subject || !htmlContent) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('email_templates').insert({
        name,
        subject,
        html_content: htmlContent,
        variables: extractVariables(htmlContent),
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email template saved',
      });

      // Reset form
      setName('');
      setSubject('');
      setHtmlContent('');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const extractVariables = (html: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = html.match(regex) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))];
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">Email Template Builder</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-zinc-300">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Welcome to Our Platform!"
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-zinc-300">
              HTML Content
              <span className="text-xs text-zinc-500 ml-2">
                Use {"{{variable_name}}"} for dynamic content
              </span>
            </Label>
            <Textarea
              id="content"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Enter HTML content here..."
              rows={15}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </div>
      </Card>

      {showPreview && htmlContent && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Preview</h3>
          <div className="bg-white p-6 rounded-lg">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
          </div>
        </Card>
      )}
    </div>
  );
};
