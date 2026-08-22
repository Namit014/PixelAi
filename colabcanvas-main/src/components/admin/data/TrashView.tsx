import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RotateCcw, AlertTriangle, Search, Filter, FolderKanban, Workflow, Palette } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeletedItem {
  id: string;
  title: string;
  type: 'project' | 'workflow' | 'brand';
  deleted_at: string;
  deleted_by: string | null;
  user_id: string;
  user_name?: string;
  thumbnail_url?: string;
}

export const TrashView = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'project' | 'workflow' | 'brand'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'delete'; itemId: string } | null>(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'restore' | 'delete' | null>(null);

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const loadDeletedItems = async () => {
    try {
      const deletedItems: DeletedItem[] = [];

      // Load deleted projects with user info
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, thumbnail_url, deleted_at, deleted_by, user_id, profiles(full_name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (projects) {
        projects.forEach(p => {
          const profile = p.profiles as any;
          deletedItems.push({
            id: p.id,
            title: p.title,
            type: 'project',
            deleted_at: p.deleted_at!,
            deleted_by: p.deleted_by,
            user_id: p.user_id,
            user_name: profile?.full_name || undefined,
            thumbnail_url: p.thumbnail_url || undefined,
          });
        });
      }

      // Load deleted workflows
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, title, thumbnail_url, deleted_at, deleted_by, user_id, profiles(full_name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (workflows) {
        workflows.forEach(w => {
          const profile = w.profiles as any;
          deletedItems.push({
            id: w.id,
            title: w.title,
            type: 'workflow',
            deleted_at: w.deleted_at!,
            deleted_by: w.deleted_by,
            user_id: w.user_id,
            user_name: profile?.full_name || undefined,
            thumbnail_url: w.thumbnail_url || undefined,
          });
        });
      }

      // Load deleted brands
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, deleted_at, deleted_by, user_id')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (brands) {
        brands.forEach(b => {
          deletedItems.push({
            id: b.id,
            title: b.name,
            type: 'brand',
            deleted_at: b.deleted_at!,
            deleted_by: b.deleted_by,
            user_id: b.user_id,
          });
        });
      }

      // Sort by deleted_at
      deletedItems.sort((a, b) => 
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      );

      setItems(deletedItems);
    } catch (error) {
      console.error('Error loading deleted items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deleted items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: DeletedItem) => {
    try {
      const table = item.type === 'project' ? 'projects' : item.type === 'workflow' ? 'workflows' : 'brands';
      
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${item.type} restored successfully`,
      });

      loadDeletedItems();
    } catch (error) {
      console.error('Error restoring item:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore item',
        variant: 'destructive',
      });
    } finally {
      setConfirmAction(null);
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    try {
      const table = item.type === 'project' ? 'projects' : item.type === 'workflow' ? 'workflows' : 'brands';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${item.type} permanently deleted`,
      });

      loadDeletedItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    } finally {
      setConfirmAction(null);
    }
  };

  const handleBulkRestore = async () => {
    try {
      const selectedItemsList = items.filter(i => selectedItems.has(i.id));
      
      for (const item of selectedItemsList) {
        const table = item.type === 'project' ? 'projects' : item.type === 'workflow' ? 'workflows' : 'brands';
        await supabase
          .from(table)
          .update({ deleted_at: null, deleted_by: null })
          .eq('id', item.id);
      }

      toast({
        title: 'Success',
        description: `${selectedItems.size} items restored`,
      });

      setSelectedItems(new Set());
      loadDeletedItems();
    } catch (error) {
      console.error('Error bulk restoring:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore some items',
        variant: 'destructive',
      });
    } finally {
      setBulkConfirmAction(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const selectedItemsList = items.filter(i => selectedItems.has(i.id));
      
      for (const item of selectedItemsList) {
        const table = item.type === 'project' ? 'projects' : item.type === 'workflow' ? 'workflows' : 'brands';
        await supabase
          .from(table)
          .delete()
          .eq('id', item.id);
      }

      toast({
        title: 'Success',
        description: `${selectedItems.size} items permanently deleted`,
      });

      setSelectedItems(new Set());
      loadDeletedItems();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some items',
        variant: 'destructive',
      });
    } finally {
      setBulkConfirmAction(null);
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="w-4 h-4 text-purple-500" />;
      case 'workflow':
        return <Workflow className="w-4 h-4 text-cyan-500" />;
      case 'brand':
        return <Palette className="w-4 h-4 text-orange-500" />;
      default:
        return <Trash2 className="w-4 h-4 text-zinc-400" />;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="text-zinc-400">Loading trash...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400">
          <Trash2 className="h-5 w-5" />
          <span className="text-sm">
            {items.length} deleted items • Items will be automatically deleted after 30 days
          </span>
        </div>
        
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">{selectedItems.size} selected</span>
            <Button
              size="sm"
              className="bg-green-500/20 text-green-500 hover:bg-green-500/30"
              onClick={() => setBulkConfirmAction('restore')}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Restore All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="bg-red-500/20 text-red-500 hover:bg-red-500/30"
              onClick={() => setBulkConfirmAction('delete')}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Delete All
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <Input
            placeholder="Search by title or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        
        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-zinc-100">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="workflow">Workflows</SelectItem>
            <SelectItem value="brand">Brands</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
          <Trash2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">
            {searchTerm || filterType !== 'all' ? 'No matching items found' : 'Trash is empty'}
          </p>
        </Card>
      ) : (
        <>
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 px-4">
            <input
              type="checkbox"
              checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800"
            />
            <span className="text-sm text-zinc-400">Select all</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="p-4 bg-zinc-900 border-zinc-800">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleSelectItem(item.id)}
                    className="w-4 h-4 mt-1 rounded border-zinc-700 bg-zinc-800"
                  />
                  
                  <div className="flex-1">
                    {item.thumbnail_url && (
                      <div className="aspect-video bg-zinc-800 rounded-lg mb-3 overflow-hidden">
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-50"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      {getItemIcon(item.type)}
                      <h3 className="text-zinc-100 font-medium truncate flex-1">{item.title}</h3>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs capitalize">
                        {item.type}
                      </Badge>
                      {item.user_name && (
                        <p className="text-xs text-zinc-500">Owner: {item.user_name}</p>
                      )}
                      <p className="text-xs text-zinc-500">
                        Deleted {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setConfirmAction({ type: 'restore', itemId: item.id })}
                        className="flex-1 bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30"
                      >
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmAction({ type: 'delete', itemId: item.id })}
                        className="bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30"
                      >
                        <AlertTriangle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Single Item Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              {confirmAction?.type === 'restore' ? 'Restore Item' : 'Permanently Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {confirmAction?.type === 'restore' 
                ? 'This item will be restored to the user\'s account.'
                : 'This action cannot be undone. The item will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                const item = items.find(i => i.id === confirmAction?.itemId);
                if (item) {
                  if (confirmAction?.type === 'restore') {
                    handleRestore(item);
                  } else {
                    handlePermanentDelete(item);
                  }
                }
              }}
              className={confirmAction?.type === 'restore' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmAction?.type === 'restore' ? 'Restore' : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Confirm Dialog */}
      <AlertDialog open={!!bulkConfirmAction} onOpenChange={() => setBulkConfirmAction(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              {bulkConfirmAction === 'restore' ? 'Restore Selected Items' : 'Permanently Delete Selected'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {bulkConfirmAction === 'restore' 
                ? `${selectedItems.size} items will be restored.`
                : `${selectedItems.size} items will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (bulkConfirmAction === 'restore') {
                  handleBulkRestore();
                } else {
                  handleBulkDelete();
                }
              }}
              className={bulkConfirmAction === 'restore' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'}
            >
              {bulkConfirmAction === 'restore' ? 'Restore All' : 'Delete All Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
