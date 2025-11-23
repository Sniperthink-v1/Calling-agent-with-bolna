import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const impersonatingUserId = localStorage.getItem('impersonating_user_id');
  const impersonatingUserName = localStorage.getItem('impersonating_user_name');

  const handleExitImpersonation = () => {
    // Restore admin token
    const adminToken = localStorage.getItem('admin_token_backup');
    if (adminToken) {
      localStorage.setItem('auth_token', adminToken);
    }
    
    // Clear impersonation data
    localStorage.removeItem('impersonating_user_id');
    localStorage.removeItem('impersonating_user_name');
    localStorage.removeItem('admin_token_backup');
    
    // Redirect to admin panel
    navigate('/admin');
    window.location.reload();
  };

  if (!impersonatingUserId) {
    return null;
  }

  return (
    <div className="bg-orange-600 text-white px-4 py-3 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span className="font-semibold">
            You are viewing as: {impersonatingUserName}
          </span>
          <span className="text-orange-200 text-sm">
            All actions will be performed as this user
          </span>
        </div>
        <Button
          onClick={handleExitImpersonation}
          variant="outline"
          size="sm"
          className="bg-card text-orange-600 border-card hover:bg-orange-50 dark:hover:bg-orange-900/20 font-semibold"
        >
          <X className="h-4 w-4 mr-2" />
          Exit to Admin
        </Button>
      </div>
    </div>
  );
}
