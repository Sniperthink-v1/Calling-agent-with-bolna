import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

export const RoleDebugComponent: React.FC = () => {
  const { user } = useAuth();
  const { hasRole, permissions } = useAdmin();

  if (!user) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-bold">Debug: No User Found</h3>
        <p>User is not authenticated</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded mb-4">
      <h3 className="font-bold">Debug: Role Information</h3>
      <div className="mt-2 space-y-1">
        <p><strong>User Role:</strong> {user.role}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>User Email:</strong> {user.email}</p>
        <p><strong>Has Admin Role:</strong> {hasRole('admin') ? 'Yes' : 'No'}</p>
        <p><strong>Has Super Admin Role:</strong> {hasRole('super_admin') ? 'Yes' : 'No'}</p>
        <p><strong>Can Manage System:</strong> {permissions.canManageSystem ? 'Yes' : 'No'}</p>
        <p><strong>Can Manage API Keys:</strong> {permissions.canManageAPIKeys ? 'Yes' : 'No'}</p>
        <p><strong>Can Manage Feature Flags:</strong> {permissions.canManageFeatureFlags ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default RoleDebugComponent;