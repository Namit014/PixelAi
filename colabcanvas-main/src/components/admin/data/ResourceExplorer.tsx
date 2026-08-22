import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminTabShell, AdminEmptyState } from '../AdminTabShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Database, Plus, Download, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { ResourceRowDrawer } from './ResourceRowDrawer';

interface TableMeta {
  name: string;
  columns: string[];
  primary_key: string | null;
}

const PAGE_SIZE = 50;

export const ResourceExplorer = () => {
  const { toast } = useToast();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [tableFilter, setTableFilter] = useState('');
  const [active, setActive] = useState<TableMeta | null>(null);

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState('');

  const [drawer, setDrawer] = useState<{ open: boolean; row: any | null }>({ open: false, row: null });

  // Load table list
  useEffect(() => {
    (async () => {
      setLoadingTables(true);
      const { data, error } = await supabase.functions.invoke('admin-list-tables');
      if (error) {
        toast({ title: 'Failed to load tables', description: error.message, variant: 'destructive' });
      } else if (data?.tables) {
        setTables(data.tables);
      }
      setLoadingTables(false);
    })();
  }, [toast]);

  const filteredTables = useMemo(() => {
    if (!tableFilter) return tables;
    const f = tableFilter.toLowerCase();
    return tables.filter((t) => t.name.toLowerCase().includes(f));
  }, [tables, tableFilter]);

  const loadRows = async (tbl: TableMeta = active!, opts: { page?: number; search?: string; column?: string } = {}) => {
    if (!tbl) return;
    setLoadingRows(true);
    const { data, error } = await supabase.functions.invoke('admin-table-query', {
      body: {
        table: tbl.name,
        page: opts.page ?? page,
        pageSize: PAGE_SIZE,
        orderBy: tbl.columns.includes('created_at') ? 'created_at' : tbl.primary_key,
        ascending: false,
        search: opts.search && opts.column ? { column: opts.column, value: opts.search } : null,
      },
    });
    setLoadingRows(false);
    if (error) {
      toast({ title: 'Query failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRows(data?.rows ?? []);
    setTotal(data?.count ?? 0);
  };

  useEffect(() => {
    if (active) {
      setPage(0);
      setSearch('');
      setSearchColumn(active.columns.includes('email') ? 'email' : active.columns[0] ?? '');
      loadRows(active, { page: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleDelete = async (row: any) => {
    if (!active?.primary_key) {
      toast({ title: 'Cannot delete', description: 'No primary key on this table', variant: 'destructive' });
      return;
    }
    if (!confirm(`Delete this row from ${active.name}? This cannot be undone.`)) return;
    const { error } = await supabase.functions.invoke('admin-table-mutate', {
      body: {
        table: active.name,
        op: 'delete',
        match: { column: active.primary_key, value: row[active.primary_key] },
      },
    });
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Row deleted' });
    loadRows();
  };

  const handleExport = async () => {
    if (!active) return;
    const { data, error } = await supabase.functions.invoke('admin-export-table', {
      body: { table: active.name },
    });
    if (error) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
      toast({ title: `Exported ${data.rows} rows`, description: 'Download will start in a new tab.' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminTabShell
      title="Resource Explorer"
      description="View, edit, and back up every table in the database. All writes are recorded in the audit log."
      bare
    >
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Left rail: tables */}
        <aside className="w-64 shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                placeholder="Filter tables..."
                className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-200 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingTables ? (
              <p className="text-xs text-zinc-500 p-3">Loading tables…</p>
            ) : (
              filteredTables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setActive(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    active?.name === t.name
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                  <span className="truncate font-mono text-xs">{t.name}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right pane: rows */}
        <section className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden min-w-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <AdminEmptyState
                title="Select a table"
                description="Pick a table from the left to view, edit, or back up its rows."
              />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100 font-mono">{active.name}</h3>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs">
                      {total.toLocaleString()} rows
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={searchColumn}
                    onChange={(e) => setSearchColumn(e.target.value)}
                    className="h-9 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2"
                  >
                    {active.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <Input
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setPage(0);
                          loadRows(active, { page: 0, search, column: searchColumn });
                        }
                      }}
                      className="pl-8 h-9 bg-zinc-950 border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => loadRows()}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    onClick={handleExport}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Backup
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setDrawer({ open: true, row: null })}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    New row
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loadingRows ? (
                  <p className="text-sm text-zinc-500 p-6">Loading rows…</p>
                ) : rows.length === 0 ? (
                  <AdminEmptyState title="No rows" description="This table is empty (or no rows match your filter)." />
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 z-10">
                      <tr>
                        <th className="text-left p-3 font-medium text-zinc-500 w-10"></th>
                        {active.columns.slice(0, 8).map((c) => (
                          <th key={c} className="text-left p-3 font-medium text-zinc-500 font-mono whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-800/40">
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setDrawer({ open: true, row })}
                                className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(row)}
                                className="p-1 rounded hover:bg-red-900/30 text-zinc-400 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          {active.columns.slice(0, 8).map((c) => (
                            <td key={c} className="p-3 text-zinc-300 font-mono whitespace-nowrap max-w-[260px] truncate">
                              {formatCell(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => {
                      const next = Math.max(0, page - 1);
                      setPage(next);
                      loadRows(active, { page: next, search, column: searchColumn });
                    }}
                    className="bg-zinc-950 border-zinc-800 text-zinc-300 disabled:opacity-40"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= totalPages}
                    onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      loadRows(active, { page: next, search, column: searchColumn });
                    }}
                    className="bg-zinc-950 border-zinc-800 text-zinc-300 disabled:opacity-40"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {active && (
        <ResourceRowDrawer
          open={drawer.open}
          onOpenChange={(o) => setDrawer({ open: o, row: o ? drawer.row : null })}
          table={active.name}
          primaryKey={active.primary_key}
          row={drawer.row}
          onSaved={() => {
            setDrawer({ open: false, row: null });
            loadRows();
          }}
        />
      )}
    </AdminTabShell>
  );
};

function formatCell(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && value.length > 80) return value.slice(0, 80) + '…';
  return String(value);
}
