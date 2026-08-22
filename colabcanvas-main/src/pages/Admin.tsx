import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, FolderKanban, Star, Trash2, TrendingUp, Package, CreditCard, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { CreateTemplateForm } from '@/components/admin/CreateTemplateForm';
import { TemplateCategoryImages } from '@/components/admin/TemplateCategoryImages';
import { ReferenceImagesUpload } from '@/components/admin/ReferenceImagesUpload';
import { TrashView } from '@/components/admin/data/TrashView';
import { EmailBuilder } from '@/components/admin/email/EmailBuilder';
import { InviteCodesTab } from '@/components/admin/InviteCodesTab';
import { DiscountCodesTab } from '@/components/admin/DiscountCodesTab';
import { removeTemplateStatus } from '@/lib/templateActions';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { EnhancedStatsCards } from '@/components/admin/EnhancedStatsCards';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MetricCard } from '@/components/admin/MetricCard';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { FeedbackManagementTab } from '@/components/admin/FeedbackManagementTab';
import { SupportTicketsTab } from '@/components/admin/SupportTicketsTab';
import { RevenueAnalyticsTab } from '@/components/admin/RevenueAnalyticsTab';
import { ContentModerationTab } from '@/components/admin/ContentModerationTab';
import { SystemAlertsTab } from '@/components/admin/SystemAlertsTab';
import { AdminGetStartedCard } from '@/components/admin/AdminGetStartedCard';
import { AdminCalendarHeatmap } from '@/components/admin/AdminCalendarHeatmap';
import { NotificationsTab } from '@/components/admin/NotificationsTab';
import { AITrainingTab } from '@/components/admin/AITrainingTab';
import ToursManager from '@/pages/Admin/ToursManager';
import { ShowcaseManagementTab } from '@/components/admin/ShowcaseManagementTab';
import { CosmoAssetLibraryTab } from '@/components/admin/CosmoAssetLibraryTab';
import { TalentReviewsTab } from '@/components/admin/TalentReviewsTab';
import { TalentCouponsTab } from '@/components/admin/TalentCouponsTab';
import { PopupsManagementTab } from '@/components/admin/PopupsManagementTab';
import { AuditLogTab } from '@/components/admin/AuditLogTab';
import { ResourceExplorer } from '@/components/admin/data/ResourceExplorer';
import { WebsitesManagementTab } from '@/components/admin/WebsitesManagementTab';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface DesignGeneration {
  id: string;
  user_id: string;
  model_used: string;
  design_type: string;
  prompt: string;
  generation_time_ms: number;
  success: boolean;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

interface Stats {
  totalGenerations: number;
  totalUsers: number;
  avgGenerationTime: number;
  successRate: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generations, setGenerations] = useState<DesignGeneration[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalGenerations: 0,
    totalUsers: 0,
    avgGenerationTime: 0,
    successRate: 100,
  });
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);

  useEffect(() => {
    loadDashboardData().finally(() => setLoading(false));
  }, []);

  // Live-refresh admin dashboard whenever any of these tables change.
  useRealtimeSubscription(
    ['design_generations', 'projects', 'payments', 'user_subscriptions', 'credits', 'profiles', 'feedback', 'support_tickets'],
    () => { loadDashboardData(); },
  );

  const loadDashboardData = async () => {
    try {
      const { data: genData } = await supabase
        .from('design_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (genData) {
        setGenerations(genData as any);

        const uniqueUsers = new Set(genData.map(g => g.user_id)).size;
        const totalTime = genData.reduce((sum, g) => sum + (g.generation_time_ms || 0), 0);
        const successCount = genData.filter(g => g.success).length;

        setStats({
          totalGenerations: genData.length,
          totalUsers: uniqueUsers,
          avgGenerationTime: totalTime / genData.length,
          successRate: (successCount / genData.length) * 100,
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_template', false)
          .order('updated_at', { ascending: false });
        
        setMyProjects(projects || []);
      }

      const { data: templates } = await supabase
        .from('projects')
        .select('*')
        .eq('is_template', true)
        .order('remix_count', { ascending: false });
      
      setAllTemplates(templates || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    }
  };

  const handleMakeTemplate = (project: any) => {
    setSelectedProject(project);
    setTemplateFormOpen(true);
  };

  const handleRemoveTemplate = async (templateId: string) => {
    const success = await removeTemplateStatus(templateId);
    if (success) {
      loadDashboardData();
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading admin panel...</p>
      </div>
    );
  }

  const generationsColumns: Column<DesignGeneration>[] = [
    {
      key: 'model_used',
      label: 'Model',
      sortable: true,
      render: (value) => (
        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs font-medium">
          {value.split('/')[1]}
        </Badge>
      ),
    },
    {
      key: 'prompt',
      label: 'Prompt',
      render: (value) => (
        <span className="text-zinc-300 line-clamp-2">{value || 'N/A'}</span>
      ),
    },
    {
      key: 'success',
      label: 'Status',
      sortable: true,
      render: (value) => (
        value ? (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            Success
          </Badge>
        ) : (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            Failed
          </Badge>
        )
      ),
    },
    {
      key: 'generation_time_ms',
      label: 'Time',
      sortable: true,
      render: (value) => (
        <span className="text-zinc-400">{Math.round(value / 1000)}s</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (value) => (
        <span className="text-zinc-500 text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Getting Started Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminGetStartedCard
              icon={Package}
              title="Create a template"
              description="Build reusable templates for your users to get started quickly."
              buttonText="Create Template"
              onButtonClick={() => setActiveTab('templates')}
            />
            <AdminGetStartedCard
              icon={CreditCard}
              title="View Revenue"
              description="Track your platform's financial performance and growth metrics."
              buttonText="View Analytics"
              onButtonClick={() => setActiveTab('revenue')}
            />
            <AdminGetStartedCard
              icon={Settings}
              title="System Health"
              description="Monitor system status, performance metrics, and alerts."
              buttonText="View Status"
              onButtonClick={() => setActiveTab('system')}
            />
          </div>

          {/* Stats Cards */}
          <EnhancedStatsCards />

          {/* Calendar and Metrics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AdminCalendarHeatmap title="Generation Activity" />
            
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="Total Generations"
                value={stats.totalGenerations}
                icon={Sparkles}
                trend="neutral"
              />
              <MetricCard
                title="Active Users"
                value={stats.totalUsers}
                icon={Sparkles}
                trend="neutral"
              />
              <MetricCard
                title="Avg Gen Time"
                value={`${Math.round(stats.avgGenerationTime / 1000)}s`}
                trend="neutral"
              />
              <MetricCard
                title="Success Rate"
                value={`${stats.successRate.toFixed(1)}%`}
                icon={TrendingUp}
                change={stats.successRate - 95}
                trend={stats.successRate >= 95 ? 'up' : 'down'}
              />
            </div>
          </div>

          {/* Recent Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-zinc-100 mb-4">Recent Generations</h2>
                <DataTable
                  columns={generationsColumns}
                  data={generations}
                  searchPlaceholder="Search generations..."
                  pageSize={8}
                />
              </div>
            </div>
            <div>
              <ActivityFeed />
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6 mt-0">
          <UserManagementTab />
        </TabsContent>

        {/* Talent Reviews Tab */}
        <TabsContent value="talent-reviews" className="space-y-6 mt-0">
          <TalentReviewsTab />
        </TabsContent>

        {/* Talent Coupons Tab */}
        <TabsContent value="talent-coupons" className="space-y-6 mt-0">
          <TalentCouponsTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-0">
          <NotificationsTab />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Generations"
              value={stats.totalGenerations}
              icon={Sparkles}
              trend="neutral"
            />
            <MetricCard
              title="Active Users"
              value={stats.totalUsers}
              icon={Sparkles}
              trend="neutral"
            />
            <MetricCard
              title="Avg Generation Time"
              value={`${Math.round(stats.avgGenerationTime / 1000)}s`}
              trend="neutral"
            />
            <MetricCard
              title="Success Rate"
              value={`${stats.successRate.toFixed(1)}%`}
              icon={TrendingUp}
              change={stats.successRate - 95}
              trend={stats.successRate >= 95 ? 'up' : 'down'}
            />
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-zinc-100 mb-4">All Generations</h2>
            <DataTable
              columns={generationsColumns}
              data={generations}
              searchPlaceholder="Search generations..."
              pageSize={15}
            />
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6 mt-0">
          <SystemHealth />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-0">
          <ReferenceImagesUpload />
          <TemplateCategoryImages />

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-zinc-400" />
              Convert Project to Template
            </h2>
            {myProjects.length === 0 ? (
              <p className="text-zinc-500">You don't have any projects yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProjects.map(project => (
                  <div key={project.id} className="p-4 bg-zinc-800/50 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors">
                    <div className="aspect-video bg-zinc-700 rounded-lg mb-3 overflow-hidden">
                      {project.thumbnail_url ? (
                        <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl font-bold text-zinc-600">{project.title[0]}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-100 mb-2 line-clamp-1">{project.title}</h3>
                    <Button 
                      onClick={() => handleMakeTemplate(project)} 
                      className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100" 
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Make Template
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-zinc-100 mb-4">Manage Templates</h2>
            {allTemplates.length === 0 ? (
              <p className="text-zinc-500">No templates published yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allTemplates.map(template => (
                  <div key={template.id} className="p-4 bg-zinc-800/50 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all group">
                    {template.is_featured && (
                      <Badge className="mb-2 bg-zinc-700 text-zinc-200 border-zinc-600">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                    <div className="aspect-video bg-zinc-700 rounded-lg mb-3 overflow-hidden group-hover:scale-[1.02] transition-transform">
                      {template.thumbnail_url ? (
                        <img src={template.thumbnail_url} alt={template.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl font-bold text-zinc-600">{template.title[0]}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-100 mb-1 line-clamp-1">{template.title}</h3>
                    <Badge className="mb-2 bg-zinc-800 text-zinc-300 border-zinc-700">{template.template_category}</Badge>
                    <p className="text-sm text-zinc-500 mb-3">
                      {template.remix_count || 0} remixes
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleRemoveTemplate(template.id)} 
                        variant="outline" 
                        size="sm"
                        className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      >
                        Remove Status
                      </Button>
                      <Button 
                        onClick={() => handleDeleteTemplate(template.id)} 
                        size="sm"
                        className="bg-red-900/20 text-red-400 hover:bg-red-900/30 border-red-900/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6 mt-0">
          <TrashView />
        </TabsContent>

        {/* Resource Explorer Tab */}
        <TabsContent value="data-explorer" className="space-y-6 mt-0">
          <ResourceExplorer />
        </TabsContent>

        {/* Popups Tab */}
        <TabsContent value="popups" className="space-y-6 mt-0">
          <PopupsManagementTab />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6 mt-0">
          <AuditLogTab />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6 mt-0">
          <EmailBuilder />
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6 mt-0">
          <FeedbackManagementTab />
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6 mt-0">
          <SupportTicketsTab />
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-6 mt-0">
          <InviteCodesTab />
        </TabsContent>

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-6 mt-0">
          <DiscountCodesTab />
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6 mt-0">
          <RevenueAnalyticsTab />
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-6 mt-0">
          <ContentModerationTab />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6 mt-0">
          <SystemAlertsTab />
        </TabsContent>

        {/* AI Training Tab */}
        <TabsContent value="ai-training" className="space-y-6 mt-0">
          <AITrainingTab />
        </TabsContent>

        {/* App Tours Tab */}
        <TabsContent value="tours" className="space-y-6 mt-0">
          <ToursManager />
        </TabsContent>

        {/* Showcase Tab */}
        <TabsContent value="showcase" className="space-y-6 mt-0">
          <ShowcaseManagementTab />
        </TabsContent>

        {/* Asset Library Tab */}
        <TabsContent value="asset-library" className="space-y-6 mt-0">
          <CosmoAssetLibraryTab />
        </TabsContent>

        {/* Websites Tab */}
        <TabsContent value="websites" className="space-y-6 mt-0">
          <WebsitesManagementTab />
        </TabsContent>
      </Tabs>

      <CreateTemplateForm
        project={selectedProject}
        open={templateFormOpen}
        onOpenChange={setTemplateFormOpen}
        onSuccess={loadDashboardData}
      />
    </AdminLayout>
  );
};

export default Admin;
