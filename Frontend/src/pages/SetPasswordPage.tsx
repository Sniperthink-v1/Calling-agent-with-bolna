import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface InviteInfo {
  valid: boolean;
  name?: string;
  email?: string;
  role?: string;
  message?: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  agent: 'Agent',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  manager: 'Full access to all leads and campaigns',
  agent: 'Can view and edit leads assigned to you',
  viewer: 'Read-only access to leads and analytics',
};

const SetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  // Validate token on mount
  useEffect(() => {
    let mounted = true;
    const validateToken = async () => {
      if (!token) {
        setValidating(false);
        setInviteInfo({ valid: false, message: 'No invite token provided' });
        return;
      }
      try {
        const res = await apiService.validateInviteToken(token);
        if (!mounted) return;
        setInviteInfo(res);
      } catch (e) {
        if (!mounted) return;
        setInviteInfo({ valid: false, message: 'Invalid or expired invite token' });
      } finally {
        if (mounted) setValidating(false);
      }
    };
    validateToken();
    return () => { mounted = false; };
  }, [token]);

  const canSubmit = password.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;
    
    setLoading(true);
    try {
      const res = await apiService.setTeamMemberPassword(token, password);
      
      if (res.token && res.user) {
        toast.success('Password set successfully! Welcome aboard.');
        
        // Store tokens manually (similar to login flow)
        localStorage.setItem('auth_token', res.token);
        if (res.refreshToken) {
          localStorage.setItem('refresh_token', res.refreshToken);
        }
        
        // Redirect to dashboard - the AuthContext will pick up the user on validation
        navigate('/dashboard');
        // Force page reload to initialize auth state with new tokens
        window.location.reload();
      } else {
        toast.error(res.error || 'Failed to set password');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full p-8 bg-white shadow-sm rounded-xl border border-gray-200">
          <h1 className="text-2xl font-semibold mb-2 text-gray-900">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This link doesn't include an invite token. Please check your email for the correct link.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Validating token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full p-8 bg-white shadow-sm rounded-xl border border-gray-200">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <p className="text-gray-700">Validating invite link…</p>
          </div>
        </div>
      </div>
    );
  }

  // Token invalid
  if (!inviteInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full p-8 bg-white shadow-sm rounded-xl border border-gray-200">
          <h1 className="text-2xl font-semibold mb-2 text-gray-900">Link Expired or Invalid</h1>
          <p className="text-gray-600 mb-6">
            {inviteInfo?.message || 'Your invite link is invalid or has expired. Please contact your administrator for a new invite.'}
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Token valid - show set password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full p-8 bg-white shadow-sm rounded-xl border border-gray-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome, {inviteInfo.name}!</h1>
          <p className="text-gray-600 mt-1">Set your password to get started</p>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{inviteInfo.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Role</span>
            <Badge variant="secondary" className="capitalize">
              {ROLE_LABELS[inviteInfo.role || 'agent']}
            </Badge>
          </div>
          {inviteInfo.role && (
            <p className="text-xs text-gray-500 mt-2">
              {ROLE_DESCRIPTIONS[inviteInfo.role]}
            </p>
          )}
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Setting Password...
              </>
            ) : (
              'Set Password & Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
