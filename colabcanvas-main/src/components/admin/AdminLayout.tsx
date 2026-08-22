import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle?: string }> = {
  overview: { title: 'Home', subtitle: 'Welcome back' },
  users: { title: 'Users', subtitle: 'Manage user accounts' },
  notifications: { title: 'Notifications', subtitle: 'Send notifications to users' },
  analytics: { title: 'Analytics', subtitle: 'Platform insights' },
  revenue: { title: 'Revenue', subtitle: 'Financial overview' },
  data: { title: 'Data', subtitle: 'Database management' },
  'data-explorer': { title: 'Resource Explorer', subtitle: 'Browse, edit, and back up every table' },
  popups: { title: 'Popups', subtitle: 'Page-targeted announcement popups' },
  audit: { title: 'Audit Log', subtitle: 'Every administrative action, in realtime' },
  email: { title: 'Email', subtitle: 'Email campaigns' },
  templates: { title: 'Templates', subtitle: 'Manage templates' },
  tours: { title: 'App Tours', subtitle: 'Manage onboarding and feature tours' },
  showcase: { title: 'Showcase', subtitle: 'Manage design showcase gallery' },
  'ai-training': { title: 'AI Training', subtitle: 'Train AI agents with custom materials' },
  feedback: { title: 'Feedback', subtitle: 'User feedback' },
  support: { title: 'Support', subtitle: 'Support tickets' },
  invites: { title: 'Invite Codes', subtitle: 'Manage invitations' },
  discounts: { title: 'Discounts', subtitle: 'Discount codes' },
  moderation: { title: 'Moderation', subtitle: 'Content review' },
  alerts: { title: 'Alerts', subtitle: 'System alerts' },
  system: { title: 'System', subtitle: 'System health' },
};

export const AdminLayout = ({ children, activeTab, onTabChange }: AdminLayoutProps) => {
  const { title, subtitle } = TAB_TITLES[activeTab] || { title: 'Admin' };

  // Sticky shell: only the main column scrolls. Sidebar stays pinned full-height.
  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-zinc-50 flex">
      <div className="h-screen sticky top-0 shrink-0">
        <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      <div className="flex-1 flex flex-col h-screen min-w-0">
        <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75 border-b border-zinc-900">
          <AdminHeader title={title} subtitle={subtitle} />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
