import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkflowStore } from '@/stores/workflowStore';

const CATEGORIES = [
  'Logo Design',
  'Branding',
  'Product Photography',
  'Social Media',
  'Video Production',
  'Character Design',
];

const PublishTemplateDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const { workflowId, workflowTitle } = useWorkflowStore();

  const handlePublish = async () => {
    if (!workflowId) {
      toast.error('Please save workflow first');
      return;
    }

    if (!title || !description || !category) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('publish-workflow-template', {
        body: {
          workflowId,
          title,
          description,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        },
      });

      if (error) throw error;

      toast.success('Template published successfully');
      setIsOpen(false);
      setTitle('');
      setDescription('');
      setCategory('');
      setTags('');
    } catch (error) {
      console.error('Error publishing template:', error);
      toast.error('Failed to publish template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={workflowTitle}
            />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              rows={3}
            />
          </div>

          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="logo, branding, professional"
            />
          </div>

          <Button
            onClick={handlePublish}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Publishing...' : 'Publish Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishTemplateDialog;
