import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Users, User, Loader2, Check, ExternalLink, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: 'all' | 'specific';
  target_user_id: string | null;
  action_label: string | null;
  action_url: string | null;
  image_url: string | null;
  created_at: string;
  created_by: string;
}

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

export const NotificationsTab = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNotifications();
    loadUsers();
  }, []);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    setNotifications(data as Notification[]);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading users:', error);
      setLoadingUsers(false);
      return;
    }

    setUsers(data as UserOption[]);
    setLoadingUsers(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-notifications')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('admin-notifications')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    if (targetType === 'specific' && !targetUserId) {
      toast.error('Please select a user');
      return;
    }

    setIsSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image if present
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          title: title.trim(),
          message: message.trim(),
          target_type: targetType,
          target_user_id: targetType === 'specific' ? targetUserId : null,
          action_label: actionLabel.trim() || null,
          action_url: actionUrl.trim() || null,
          image_url: imageUrl,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Notification sent successfully');
      
      // Reset form
      setTitle('');
      setMessage('');
      setTargetType('all');
      setTargetUserId('');
      setActionLabel('');
      setActionUrl('');
      setImageFile(null);
      setImagePreview(null);
      
      // Reload notifications
      loadNotifications();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Notification deleted');
      loadNotifications();
    } catch (error: any) {
      toast.error('Failed to delete notification');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Create Notification Form */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Send Notification</h2>
            <p className="text-sm text-zinc-500">Create and send notifications to users</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-zinc-300">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[100px]"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Image (Optional)</Label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {imagePreview ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 p-1 bg-zinc-900/80 rounded-full hover:bg-zinc-800"
                >
                  <X className="w-4 h-4 text-zinc-300" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 border border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors text-zinc-400 hover:text-zinc-300"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm">Upload image</span>
              </button>
            )}
          </div>

          {/* Target Audience */}
          <div className="space-y-3">
            <Label className="text-zinc-300">Target Audience</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(v) => setTargetType(v as 'all' | 'specific')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" className="border-zinc-600" />
                <Label htmlFor="all" className="text-zinc-300 flex items-center gap-2 cursor-pointer">
                  <Users className="w-4 h-4" />
                  All Users
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific" className="border-zinc-600" />
                <Label htmlFor="specific" className="text-zinc-300 flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Specific User
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* User Selector (shown when specific is selected) */}
          {targetType === 'specific' && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Select User</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Search and select a user..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[300px]">
                  <div className="p-2">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 mb-2"
                    />
                  </div>
                  {loadingUsers ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    </div>
                  ) : (
                    filteredUsers.slice(0, 20).map((user) => (
                      <SelectItem
                        key={user.id}
                        value={user.id}
                        className="text-zinc-100 focus:bg-zinc-700"
                      >
                        <div className="flex flex-col">
                          <span>{user.full_name || 'No name'}</span>
                          <span className="text-xs text-zinc-500">{user.email}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Button (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actionLabel" className="text-zinc-300">Button Label (Optional)</Label>
              <Input
                id="actionLabel"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                placeholder="e.g., View Details"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionUrl" className="text-zinc-300">Button URL (Optional)</Label>
              <Input
                id="actionUrl"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="e.g., https://example.com or /dashboard"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Supports both external URLs (https://...) and internal routes (/dashboard)
          </p>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isSending || isUploadingImage || !title.trim() || !message.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Recent Notifications */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Recent Notifications</h2>
        
        {notifications.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No notifications sent yet</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 bg-zinc-800/50 border border-zinc-800 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  {/* Image thumbnail if present */}
                  {notification.image_url && (
                    <div className="flex-shrink-0">
                      <img 
                        src={notification.image_url} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-zinc-100">{notification.title}</h3>
                      <Badge
                        className={
                          notification.target_type === 'all'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }
                      >
                        {notification.target_type === 'all' ? 'All Users' : 'Specific User'}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">{notification.message}</p>
                    {notification.action_label && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <ExternalLink className="w-3 h-3" />
                        <span>{notification.action_label}: {notification.action_url}</span>
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 mt-2">
                      {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(notification.id)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
