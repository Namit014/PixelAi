import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserCircle, Mail, Calendar, CreditCard, FolderKanban, Trash2, RotateCcw, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  onboarding_completed: boolean;
  industry?: string;
  company_size?: string;
}

interface UserCredit {
  balance: number;
  subscription_tier: string;
  subscription_expires_at: string | null;
}

interface UserProject {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export const UserManagementTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<{
    credits: UserCredit | null;
    projects: UserProject[];
    deletedProjects: UserProject[];
    transactions: CreditTransaction[];
  }>({ credits: null, projects: [], deletedProjects: [], transactions: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [creditAdjustAmount, setCreditAdjustAmount] = useState('');
  const [creditAdjustReason, setCreditAdjustReason] = useState('');
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditAdjustType, setCreditAdjustType] = useState<'add' | 'deduct'>('add');
  const [restoreProjectId, setRestoreProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useRealtimeSubscription(['profiles', 'credits', 'projects', 'credit_transactions'], () => {
    loadUsers();
    if (selectedUser) loadUserDetails(selectedUser.id);
  });

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('admin-list-users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      setUsers(data?.users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      setDetailsLoading(true);

      // Load credits
      const { data: creditsData } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Load active projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, thumbnail_url, created_at, deleted_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load deleted projects
      const { data: deletedProjectsData } = await supabase
        .from('projects')
        .select('id, title, thumbnail_url, created_at, deleted_at')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(10);

      // Load credit transactions
      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setUserDetails({
        credits: creditsData || null,
        projects: projectsData || [],
        deletedProjects: deletedProjectsData || [],
        transactions: transactionsData || [],
      });
    } catch (error: any) {
      console.error('Error loading user details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    await loadUserDetails(user.id);
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project restored successfully',
      });

      // Reload user details
      if (selectedUser) {
        await loadUserDetails(selectedUser.id);
      }
    } catch (error: any) {
      console.error('Error restoring project:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore project',
        variant: 'destructive',
      });
    } finally {
      setRestoreProjectId(null);
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedUser || !creditAdjustAmount || !creditAdjustReason) return;

    const amount = parseInt(creditAdjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const finalAmount = creditAdjustType === 'deduct' ? -amount : amount;
      const newBalance = (userDetails.credits?.balance || 0) + finalAmount;

      if (newBalance < 0) {
        toast({
          title: 'Error',
          description: 'Cannot deduct more credits than the user has',
          variant: 'destructive',
        });
        return;
      }

      // Update credits
      const { error: creditError } = await supabase
        .from('credits')
        .update({ balance: newBalance })
        .eq('user_id', selectedUser.id);

      if (creditError) throw creditError;

      // Log transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: selectedUser.id,
          amount: Math.abs(amount),
          transaction_type: creditAdjustType === 'add' ? 'admin_addition' : 'admin_deduction',
          description: `Admin: ${creditAdjustReason}`,
        });

      if (transactionError) throw transactionError;

      toast({
        title: 'Success',
        description: `${creditAdjustType === 'add' ? 'Added' : 'Deducted'} ${amount} credits`,
      });

      setShowCreditDialog(false);
      setCreditAdjustAmount('');
      setCreditAdjustReason('');
      await loadUserDetails(selectedUser.id);
    } catch (error: any) {
      console.error('Error adjusting credits:', error);
      toast({
        title: 'Error',
        description: 'Failed to adjust credits',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <UserCircle className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total Users</p>
              <p className="text-2xl font-bold text-zinc-100">{users.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <UserCircle className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Onboarded</p>
              <p className="text-2xl font-bold text-zinc-100">
                {users.filter(u => u.onboarding_completed).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <Calendar className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">This Week</p>
              <p className="text-2xl font-bold text-zinc-100">
                {users.filter(u => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(u.created_at) > weekAgo;
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <CreditCard className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Active Users</p>
              <p className="text-2xl font-bold text-zinc-100">
                {users.filter(u => u.onboarding_completed).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and User List */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <UserCircle className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-zinc-100">{user.full_name || 'No name'}</p>
                        {user.onboarding_completed ? (
                          <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                            Onboarded
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      {user.industry && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {user.industry} {user.company_size && `• ${user.company_size}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* User Details Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-zinc-900 border-zinc-800 text-zinc-100 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">User Details</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-zinc-400">Loading details...</p>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-zinc-800 border-zinc-700">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="deleted">Deleted ({userDetails.deletedProjects.length})</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card className="p-4 bg-zinc-800 border-zinc-700">
                  <h3 className="font-semibold mb-3 text-zinc-100">Profile Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Full Name:</span>
                      <span className="font-medium text-zinc-100">{selectedUser?.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Email:</span>
                      <span className="font-medium text-zinc-100">{selectedUser?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Joined:</span>
                      <span className="font-medium text-zinc-100">
                        {selectedUser && new Date(selectedUser.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Industry:</span>
                      <span className="font-medium text-zinc-100">{selectedUser?.industry || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Company Size:</span>
                      <span className="font-medium text-zinc-100">{selectedUser?.company_size || 'N/A'}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-zinc-800 border-zinc-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-zinc-100">Credit Information</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
                        onClick={() => {
                          setCreditAdjustType('add');
                          setShowCreditDialog(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"
                        onClick={() => {
                          setCreditAdjustType('deduct');
                          setShowCreditDialog(true);
                        }}
                      >
                        <Minus className="w-3 h-3 mr-1" />
                        Deduct
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Balance:</span>
                      <span className="font-bold text-2xl text-primary">
                        {userDetails.credits?.balance?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Subscription:</span>
                      <Badge className="bg-zinc-700 text-zinc-200">{userDetails.credits?.subscription_tier || 'free'}</Badge>
                    </div>
                    {userDetails.credits?.subscription_expires_at && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Expires:</span>
                        <span className="font-medium text-zinc-100">
                          {new Date(userDetails.credits.subscription_expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="projects">
                <ScrollArea className="h-[400px]">
                  {userDetails.projects.length === 0 ? (
                    <p className="text-zinc-500 text-center py-8">No projects yet</p>
                  ) : (
                    <div className="space-y-3">
                      {userDetails.projects.map((project) => (
                        <Card key={project.id} className="p-4 bg-zinc-800 border-zinc-700">
                          <div className="flex gap-3">
                            <div className="w-20 h-20 bg-zinc-700 rounded overflow-hidden flex-shrink-0">
                              {project.thumbnail_url ? (
                                <img 
                                  src={project.thumbnail_url} 
                                  alt={project.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FolderKanban className="w-8 h-8 text-zinc-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-zinc-100 mb-1">{project.title}</h4>
                              <p className="text-xs text-zinc-500">
                                Created {new Date(project.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="deleted">
                <ScrollArea className="h-[400px]">
                  {userDetails.deletedProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Trash2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500">No deleted projects</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userDetails.deletedProjects.map((project) => (
                        <Card key={project.id} className="p-4 bg-zinc-800 border-zinc-700">
                          <div className="flex gap-3">
                            <div className="w-20 h-20 bg-zinc-700 rounded overflow-hidden flex-shrink-0 opacity-50">
                              {project.thumbnail_url ? (
                                <img 
                                  src={project.thumbnail_url} 
                                  alt={project.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FolderKanban className="w-8 h-8 text-zinc-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-zinc-100 mb-1">{project.title}</h4>
                              <p className="text-xs text-zinc-500">
                                Deleted {project.deleted_at && new Date(project.deleted_at).toLocaleDateString()}
                              </p>
                              <Button
                                size="sm"
                                className="mt-2 bg-green-500/20 text-green-500 hover:bg-green-500/30"
                                onClick={() => setRestoreProjectId(project.id)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Restore
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transactions">
                <ScrollArea className="h-[400px]">
                  {userDetails.transactions.length === 0 ? (
                    <p className="text-zinc-500 text-center py-8">No transactions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.transactions.map((transaction) => (
                        <Card key={transaction.id} className="p-4 bg-zinc-800 border-zinc-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-zinc-100">{transaction.description}</p>
                              <p className="text-xs text-zinc-500">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                transaction.transaction_type.includes('addition') 
                                  ? 'text-green-500' 
                                  : 'text-red-500'
                              }`}>
                                {transaction.transaction_type.includes('addition') ? '+' : '-'}
                                {transaction.amount}
                              </p>
                              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                                {transaction.transaction_type}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit Adjustment Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {creditAdjustType === 'add' ? 'Add Credits' : 'Deduct Credits'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {creditAdjustType === 'add' 
                ? 'Add credits to this user\'s account'
                : 'Deduct credits from this user\'s account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">Amount</label>
              <Input
                type="number"
                value={creditAdjustAmount}
                onChange={(e) => setCreditAdjustAmount(e.target.value)}
                placeholder="Enter amount..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Reason</label>
              <Input
                value={creditAdjustReason}
                onChange={(e) => setCreditAdjustReason(e.target.value)}
                placeholder="Reason for adjustment..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdjustCredits}
                className={creditAdjustType === 'add' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'}
              >
                {creditAdjustType === 'add' ? 'Add Credits' : 'Deduct Credits'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreProjectId} onOpenChange={() => setRestoreProjectId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Restore Project</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to restore this project? It will be moved back to the user's active projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => restoreProjectId && handleRestoreProject(restoreProjectId)}
              className="bg-green-600 hover:bg-green-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
