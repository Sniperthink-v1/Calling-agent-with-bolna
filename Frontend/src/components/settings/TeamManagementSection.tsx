import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Mail, 
  MoreVertical, 
  Shield, 
  Eye, 
  UserCog, 
  Loader2,
  Check,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'agent' | 'viewer';
  is_active: boolean;
  password_set: boolean;
  invite_pending: boolean;
  last_login: string | null;
  created_at: string;
}

interface TeamStats {
  total: number;
  by_role: {
    manager: number;
    agent: number;
    viewer: number;
  };
  active: number;
  pending_invite: number;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  manager: <Shield className="h-4 w-4" />,
  agent: <UserCog className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

const ROLE_COLORS: Record<string, string> = {
  manager: 'bg-purple-100 text-purple-800',
  agent: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const ROLE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  manager: {
    label: 'Manager',
    description: 'Full access to all leads and campaigns. Can manage team members.',
  },
  agent: {
    label: 'Agent',
    description: 'Can only view and edit leads assigned to them.',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access. Cannot edit any data.',
  },
};

export const TeamManagementSection: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // New member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('agent');

  // Check if current user is a team member (not owner)
  const isTeamMember = (user as any)?.isTeamMember;

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [membersRes, statsRes] = await Promise.all([
        apiService.getTeamMembers(),
        apiService.getTeamStats(),
      ]);

      // Access data through ApiResponse structure
      if (membersRes.success && membersRes.data?.team_members) {
        setTeamMembers(membersRes.data.team_members);
      }
      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is owner (not a team member)
    if (!isTeamMember) {
      fetchTeamData();
    }
  }, [isTeamMember]);

  const handleInvite = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both name and email',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      const res = await apiService.inviteTeamMember({
        name: newMemberName.trim(),
        email: newMemberEmail.trim().toLowerCase(),
        role: newMemberRole,
      });

      if (res.success && res.data?.team_member) {
        toast({
          title: 'Invitation Sent',
          description: `${newMemberName} has been invited as ${ROLE_DESCRIPTIONS[newMemberRole].label}`,
        });
        setInviteDialogOpen(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberRole('agent');
        fetchTeamData();
      } else {
        toast({
          title: 'Error',
          description: res.error?.message || 'Failed to send invitation',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (member: TeamMember) => {
    try {
      await apiService.resendTeamMemberInvite(member.id);
      toast({
        title: 'Invitation Resent',
        description: `A new invite email has been sent to ${member.email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      if (member.is_active) {
        await apiService.deactivateTeamMember(member.id);
        toast({
          title: 'Member Deactivated',
          description: `${member.name} has been deactivated`,
        });
      } else {
        await apiService.updateTeamMember(member.id, { is_active: true });
        toast({
          title: 'Member Activated',
          description: `${member.name} has been reactivated`,
        });
      }
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update member status',
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (member: TeamMember, newRole: string) => {
    try {
      await apiService.updateTeamMember(member.id, { role: newRole });
      toast({
        title: 'Role Updated',
        description: `${member.name} is now a ${ROLE_DESCRIPTIONS[newRole].label}`,
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  // Show message if user is a team member
  if (isTeamMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
          <CardDescription>
            Only account owners can manage team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact your account owner to add or modify team members.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Invite team members to help manage leads and campaigns
            </CardDescription>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add a new team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_DESCRIPTIONS).map(([role, info]) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            {ROLE_ICONS[role]}
                            <div>
                              <div className="font-medium">{info.label}</div>
                              <div className="text-xs text-muted-foreground">{info.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Members</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_invite}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">{stats.by_role.manager}</div>
              <div className="text-xs text-muted-foreground">Managers</div>
            </div>
          </div>
        )}

        {/* Team Members Table */}
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No Team Members Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Invite your first team member to get started
            </p>
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ROLE_COLORS[member.role]}>
                      <span className="flex items-center gap-1">
                        {ROLE_ICONS[member.role]}
                        {ROLE_DESCRIPTIONS[member.role].label}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.invite_pending ? (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Invite Pending
                      </Badge>
                    ) : member.is_active ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Deactivated
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.last_login ? (
                      <span className="text-sm">
                        {new Date(member.last_login).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.invite_pending && (
                          <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleChangeRole(member, 'manager')} disabled={member.role === 'manager'}>
                          <Shield className="h-4 w-4 mr-2" />
                          Make Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(member, 'agent')} disabled={member.role === 'agent'}>
                          <UserCog className="h-4 w-4 mr-2" />
                          Make Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(member, 'viewer')} disabled={member.role === 'viewer'}>
                          <Eye className="h-4 w-4 mr-2" />
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleActive(member)}
                          className={member.is_active ? 'text-red-600' : 'text-green-600'}
                        >
                          {member.is_active ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Reactivate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManagementSection;
