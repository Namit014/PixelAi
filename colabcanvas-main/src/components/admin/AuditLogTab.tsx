import { useMemo, useState } from 'react';
import { useAdminTable } from '@/hooks/useAdminRealtime';
import { AdminTabShell, AdminEmptyState } from './AdminTabShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Search } from 'lucide-react';

interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  details: any;
  created_at: string | null;
}

export const AuditLogTab = () => {
  const { rows, loading } = useAdminTable<AdminAction>('admin_actions', { limit: 500 });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.action_type));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (actionFilter && r.action_type !== actionFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const blob = `${r.action_type} ${r.admin_id} ${r.target_user_id ?? ''} ${JSON.stringify(r.details ?? {})}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, actionFilter]);

  const exportCsv = () => {
    const header = ['created_at', 'action_type', 'admin_id', 'target_user_id', 'details'];
    const lines = [header.join(',')];
    filtered.forEach((r) => {
      lines.push(
        [
          r.created_at ?? '',
          r.action_type,
          r.admin_id,
          r.target_user_id ?? '',
          JSON.stringify(r.details ?? {}).replace(/"/g, '""'),
        ]
          .map((v) => `"${v}"`)
          .join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminTabShell
      title="Audit Log"
      description="Every administrative action is recorded here in realtime. Use it to investigate access, changes, and incidents."
      actions={
        <Button variant="outline" size="sm" onClick={exportCsv} className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search admin, user, action, payload..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-200"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm px-3"
        >
          <option value="">All actions</option>
          {actionTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading audit trail...</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState title="No audit entries" description="Admin actions will appear here as they happen." />
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Admin</th>
                <th className="py-2 pr-4 font-medium">Target user</th>
                <th className="py-2 pr-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge className="bg-zinc-800 text-zinc-200 border-zinc-700 font-medium">
                      {r.action_type}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-zinc-400 font-mono text-xs">
                    {r.admin_id.slice(0, 8)}…
                  </td>
                  <td className="py-2 pr-4 text-zinc-400 font-mono text-xs">
                    {r.target_user_id ? `${r.target_user_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500 max-w-md truncate">
                    {r.details ? JSON.stringify(r.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminTabShell>
  );
};
