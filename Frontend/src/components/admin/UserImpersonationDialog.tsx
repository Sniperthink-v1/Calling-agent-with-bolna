import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserImpersonationDialog({ open, onOpenChange }: UserImpersonationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-for-impersonation'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      return result.data.users || [];
    },
    enabled: open,
  });

  const users: User[] = data || [];

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const handleImpersonate = async (userId: string, userName: string) => {
    try {
      // Store admin token for later restoration
      const adminToken = localStorage.getItem('auth_token');
      localStorage.setItem('admin_token_backup', adminToken!);
      
      // Fetch impersonation token from backend
      const response = await fetch(`${API_BASE_URL}/api/admin/impersonate/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to impersonate user');
      }

      const result = await response.json();
      
      // Store impersonation info
      localStorage.setItem('impersonating_user_id', userId);
      localStorage.setItem('impersonating_user_name', userName);
      localStorage.setItem('auth_token', result.data.token);
      if (result.data.refreshToken) {
        localStorage.setItem('refresh_token', result.data.refreshToken);
      }
      
      // Close dialog and redirect to user dashboard
      onOpenChange(false);
      navigate('/dashboard');
      window.location.reload(); // Force reload to apply new context
    } catch (error) {
      console.error('Impersonation error:', error);
      alert('Failed to impersonate user. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-600" />
            Sign in as User
          </DialogTitle>
          <DialogDescription>
            Select a user to view their dashboard and perform actions as them. You can exit anytime to return to admin view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 dark:bg-secondary/20">
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-foreground">Member Since</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-secondary/50 dark:hover:bg-secondary/20">
                        <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                        <TableCell className="text-foreground">{user.email}</TableCell>
                        <TableCell className="text-foreground capitalize">{user.role}</TableCell>
                        <TableCell className="text-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImpersonate(user.id, user.name)}
                            className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                          >
                            Sign in as {user.name.split(' ')[0]}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

