import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const remixTemplate = async (templateId: string): Promise<string | null> => {
  try {
    console.log('Remixing template:', templateId);
    
    const { data, error } = await supabase.functions.invoke('remix-template', {
      body: { template_id: templateId }
    });

    if (error) {
      console.error('Remix error:', error);
      toast.error(error.message || 'Failed to remix template');
      return null;
    }

    if (data?.project_id) {
      toast.success('Template remixed successfully!');
      return data.project_id;
    }

    return null;
  } catch (error: any) {
    console.error('Remix error:', error);
    toast.error(error.message || 'Failed to remix template');
    return null;
  }
};

export const makeTemplate = async (
  projectId: string,
  metadata: {
    template_category: string;
    template_description: string;
    template_tags?: string[];
    is_featured?: boolean;
  }
) => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        is_template: true,
        ...metadata
      })
      .eq('id', projectId);

    if (error) throw error;

    toast.success('Project published as template!');
    return true;
  } catch (error: any) {
    console.error('Error making template:', error);
    toast.error(error.message || 'Failed to publish template');
    return false;
  }
};

export const removeTemplateStatus = async (projectId: string) => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        is_template: false,
        template_category: null,
        template_description: null,
        template_tags: [],
        is_featured: false
      })
      .eq('id', projectId);

    if (error) throw error;

    toast.success('Template status removed');
    return true;
  } catch (error: any) {
    console.error('Error removing template status:', error);
    toast.error(error.message || 'Failed to remove template status');
    return false;
  }
};