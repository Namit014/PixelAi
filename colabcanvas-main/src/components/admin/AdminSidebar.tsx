import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  DollarSign,
  FileText,
  Settings,
  Database,
  Mail,
  MessageSquare,
  Headphones,
  Ticket,
  Tag,
  Search,
  Zap,
  FileCode,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Bell,
  Brain,
  Route,
  ImageIcon,
  FolderOpen,
  UserCheck,
  Megaphone,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const navigationItems = [
  { title: 'Home', value: 'overview', icon: LayoutDashboard },
  { title: 'Users', value: 'users', icon: Users },
  { title: 'Websites', value: 'websites', icon: Globe },
  { title: 'Popups', value: 'popups', icon: Megaphone },
  { title: 'Talent Reviews', value: 'talent-reviews', icon: UserCheck },
  { title: 'Talent Coupons', value: 'talent-coupons', icon: Tag },
  { title: 'Notifications', value: 'notifications', icon: Bell },
  { title: 'Analytics', value: 'analytics', icon: BarChart3 },
  { title: 'Revenue', value: 'revenue', icon: DollarSign },
  { title: 'Data', value: 'data', icon: Database },
  { title: 'Resource Explorer', value: 'data-explorer', icon: FolderOpen },
  { title: 'Audit Log', value: 'audit', icon: ShieldAlert },
  { title: 'Email', value: 'email', icon: Mail },
  { title: 'Templates', value: 'templates', icon: FileText },
  { title: 'App Tours', value: 'tours', icon: Route },
  { title: 'Showcase', value: 'showcase', icon: ImageIcon },
  { title: 'Asset Library', value: 'asset-library', icon: FolderOpen },
  { title: 'AI Training', value: 'ai-training', icon: Brain },
  { title: 'Feedback', value: 'feedback', icon: MessageSquare },
  { title: 'Support', value: 'support', icon: Headphones },
  { title: 'Invite Codes', value: 'invites', icon: Ticket },
  { title: 'Discounts', value: 'discounts', icon: Tag },
  { title: 'Moderation', value: 'moderation', icon: ShieldAlert },
  { title: 'Alerts', value: 'alerts', icon: AlertTriangle },
  { title: 'System', value: 'system', icon: Settings },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  return (
    <aside className="w-60 h-full bg-black border-r border-zinc-900 flex flex-col">
      {/* Header with Logo and Quick Actions */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <Zap className="w-4 h-4 text-zinc-400" />
          </button>
          <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <FileCode className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input
            placeholder="Search..."
            className="pl-9 pr-12 h-9 bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-0 rounded-lg text-sm"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-0.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
              ⌘
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <div className="space-y-0.5">
          {navigationItems.map((item) => (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === item.value
                  ? "bg-zinc-900 text-zinc-100 border-l-2 border-blue-500 -ml-0.5 pl-[11px]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-zinc-900">
        <div className="p-2 space-y-0.5">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Support</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </div>

        {/* Organization Selector */}
        <div className="p-3 border-t border-zinc-900">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
              <span className="text-xs font-bold text-zinc-300">CL</span>
            </div>
            <span className="text-sm font-medium text-zinc-300 flex-1 text-left truncate">
              CoLab Canvas
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>
    </aside>
  );
};
