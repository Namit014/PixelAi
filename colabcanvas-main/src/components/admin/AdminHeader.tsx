import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AdminHeader = ({ title = 'Home', subtitle }: AdminHeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-zinc-900">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">{title}</h1>
        {subtitle && (
          <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      
      <Button
        variant="ghost"
        onClick={handleSignOut}
        className="gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </Button>
    </header>
  );
};
