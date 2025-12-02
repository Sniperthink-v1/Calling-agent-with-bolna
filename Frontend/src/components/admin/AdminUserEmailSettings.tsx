import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Mail,
  Users,
  Settings2,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Edit,
  Sparkles,
  Filter,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface UserEmailSettingsSummary {
  user_id: string;
  email: string;
  name: string;
  admin_prompt_id?: string;
  settings_id?: string;
  auto_send_enabled: boolean;
  user_prompt_id?: string;
  send_conditions?: string[];
  lead_status_filters?: string[];
  skip_if_no_email?: boolean;
  send_delay_minutes?: number;
}

interface AdminUserEmailSettingsProps {
  className?: string;
}

export const AdminUserEmailSettings: React.FC<AdminUserEmailSettingsProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserEmailSettingsSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAutoSend, setFilterAutoSend] = useState<string>('');
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserEmailSettingsSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [validatingPrompt, setValidatingPrompt] = useState(false);
  
  // Edit form state
  const [editPromptId, setEditPromptId] = useState('');
  const [promptValidation, setPromptValidation] = useState<{
    status: 'idle' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    loadUsers();
  }, [page, filterAutoSend]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      let url = `${import.meta.env.VITE_API_BASE_URL}/api/admin/email-settings?page=${page}&limit=20`;
      if (filterAutoSend) {
        url += `&auto_send_enabled=${filterAutoSend}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      if (data.success && data.data?.users) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users list');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserEmailSettingsSummary) => {
    setSelectedUser(user);
    setEditPromptId(user.admin_prompt_id || '');
    setPromptValidation({ status: 'idle' });
    setEditModalOpen(true);
  };

  const handleValidatePrompt = async () => {
    if (!editPromptId) {
      setPromptValidation({ status: 'idle' });
      return;
    }
    
    if (!editPromptId.startsWith('pmpt_')) {
      setPromptValidation({
        status: 'invalid',
        message: 'Prompt ID must start with "pmpt_"',
      });
      return;
    }

    try {
      setValidatingPrompt(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/email-settings/validate-prompt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt_id: editPromptId }),
        }
      );

      const data = await response.json();
      
      if (data.data?.valid) {
        setPromptValidation({ status: 'valid', message: 'Valid prompt ID' });
        toast.success('Prompt validated successfully');
      } else {
        setPromptValidation({
          status: 'invalid',
          message: data.data?.error || 'Invalid prompt ID',
        });
        toast.error(data.data?.error || 'Invalid prompt ID');
      }
    } catch (error) {
      setPromptValidation({ status: 'invalid', message: 'Validation failed' });
      toast.error('Failed to validate prompt');
    } finally {
      setValidatingPrompt(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${selectedUser.user_id}/followup-prompt`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt_id: editPromptId || null }),
        }
      );

      if (response.ok) {
        toast.success(`Updated prompt for ${selectedUser.name}`);
        setEditModalOpen(false);
        await loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error?.message || 'Failed to save prompt');
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      toast.error('Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const getConditionBadges = (conditions: string[] | undefined) => {
    if (!conditions || conditions.length === 0) return null;
    
    return conditions.map(c => (
      <Badge key={c} variant="outline" className="text-xs mr-1">
        {c.replace('_', ' ')}
      </Badge>
    ));
  };

  const getStatusBadges = (filters: string[] | undefined) => {
    if (!filters || filters.length === 0 || filters.includes('any')) {
      return <Badge variant="secondary" className="text-xs">Any</Badge>;
    }
    
    return filters.map(f => (
      <Badge 
        key={f} 
        variant={f === 'hot' ? 'destructive' : 'outline'} 
        className="text-xs mr-1"
      >
        {f}
      </Badge>
    ));
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            User Email Settings Management
          </CardTitle>
          <CardDescription>
            View and manage follow-up email settings for all users. Set OpenAI prompt IDs per-user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Label>Auto-Send Filter:</Label>
              <Select value={filterAutoSend} onValueChange={setFilterAutoSend}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                No users found with the current filter.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Auto-Send</TableHead>
                    <TableHead>Admin Prompt ID</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Lead Filters</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.auto_send_enabled ? 'default' : 'secondary'}>
                          {user.auto_send_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.admin_prompt_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {user.admin_prompt_id.substring(0, 15)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getConditionBadges(user.send_conditions)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadges(user.lead_status_filters)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit Prompt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {users.length} of {total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={users.length < 20}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Help Text */}
          <Alert className="mt-6">
            <Sparkles className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-2">About Admin Prompt Settings</p>
              <ul className="text-sm space-y-1">
                <li>• Admin-set prompt IDs override user's custom prompt settings</li>
                <li>• Used for generating personalized follow-up emails based on call transcripts</li>
                <li>• Leave blank to let users configure their own prompts</li>
                <li>• Create prompts at{' '}
                  <a 
                    href="https://platform.openai.com/prompts" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    OpenAI Platform
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Set Follow-up Email Prompt
            </DialogTitle>
            <DialogDescription>
              Configure the OpenAI prompt ID for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-4">
              {/* User Info */}
              <Alert>
                <Users className="w-4 h-4" />
                <AlertDescription>
                  <strong>User:</strong> {selectedUser.name} ({selectedUser.email})
                </AlertDescription>
              </Alert>

              {/* Current Status */}
              <div className="flex gap-2">
                <Badge variant={selectedUser.auto_send_enabled ? 'default' : 'secondary'}>
                  Auto-Send: {selectedUser.auto_send_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {selectedUser.user_prompt_id && (
                  <Badge variant="outline">Has User Prompt</Badge>
                )}
              </div>

              <Separator />

              {/* Prompt ID Input */}
              <div className="space-y-2">
                <Label>OpenAI Follow-up Email Prompt ID (Admin Override)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={editPromptId}
                      onChange={(e) => {
                        setEditPromptId(e.target.value);
                        setPromptValidation({ status: 'idle' });
                      }}
                      placeholder="pmpt_..."
                      disabled={saving}
                    />
                    {promptValidation.status !== 'idle' && (
                      <p className={`text-sm mt-1 flex items-center gap-1 ${
                        promptValidation.status === 'valid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {promptValidation.status === 'valid' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {promptValidation.message}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleValidatePrompt}
                    disabled={!editPromptId || validatingPrompt || saving}
                  >
                    {validatingPrompt ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Leave blank to let the user's own prompt setting take effect.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePrompt}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Prompt'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserEmailSettings;
