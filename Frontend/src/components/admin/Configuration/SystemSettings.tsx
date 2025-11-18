import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { useToast } from '../../ui/use-toast';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { adminApiService } from '../../../services/adminApiService';

interface SystemConfig {
  // Billing Configuration
  credits_per_minute: number;
  new_user_bonus_credits: number;
  minimum_credit_purchase: number;
  max_contacts_per_upload: number;
  
  // Authentication & Security Configuration
  session_duration_hours: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  password_min_length: number;
  require_email_verification: boolean;
  password_reset_token_expiry_hours: number;
  
  // System Operation Configuration
  kpi_refresh_interval_minutes: number;
}

interface SystemSettingsProps {
  className?: string;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ className }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load system configuration
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await adminApiService.getSystemConfig();
      if (response.success) {
        setConfig(response.data);
        setOriginalConfig(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load system configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load system configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Save configuration changes
  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const response = await adminApiService.updateSystemConfig(config);
      
      if (response.success) {
        setOriginalConfig(config);
        toast({
          title: "Success",
          description: "System configuration updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update system configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update system configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    setConfig(originalConfig);
  };

  // Update config value
  const updateConfig = (key: keyof SystemConfig, value: number | boolean) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  // Check if there are unsaved changes
  const hasChanges = config && originalConfig && 
    JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-muted-foreground">Failed to load configuration</p>
        <Button onClick={loadConfig} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Configuration</h2>
          <p className="text-muted-foreground">
            Manage system-wide settings and configurations
          </p>
        </div>
        <div className="flex space-x-2">
          {hasChanges && (
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Billing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="credits_per_minute">Credits per Minute</Label>
              <Input
                id="credits_per_minute"
                type="number"
                min="1"
                value={config.credits_per_minute}
                onChange={(e) => updateConfig('credits_per_minute', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Credits charged per minute of call time
              </p>
            </div>
            
            <div>
              <Label htmlFor="new_user_bonus_credits">New User Bonus Credits</Label>
              <Input
                id="new_user_bonus_credits"
                type="number"
                min="0"
                value={config.new_user_bonus_credits}
                onChange={(e) => updateConfig('new_user_bonus_credits', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Free credits given to new users
              </p>
            </div>

            <div>
              <Label htmlFor="minimum_credit_purchase">Minimum Credit Purchase</Label>
              <Input
                id="minimum_credit_purchase"
                type="number"
                min="1"
                value={config.minimum_credit_purchase}
                onChange={(e) => updateConfig('minimum_credit_purchase', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum credits that can be purchased at once
              </p>
            </div>

            <div>
              <Label htmlFor="max_contacts_per_upload">Max Contacts per Upload</Label>
              <Input
                id="max_contacts_per_upload"
                type="number"
                min="1"
                value={config.max_contacts_per_upload}
                onChange={(e) => updateConfig('max_contacts_per_upload', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum contacts allowed in bulk upload
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication & Security Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session_duration_hours">Session Duration (Hours)</Label>
              <Input
                id="session_duration_hours"
                type="number"
                min="1"
                max="168"
                value={config.session_duration_hours}
                onChange={(e) => updateConfig('session_duration_hours', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Hours until user session expires
              </p>
            </div>

            <div>
              <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
              <Input
                id="max_login_attempts"
                type="number"
                min="3"
                max="10"
                value={config.max_login_attempts}
                onChange={(e) => updateConfig('max_login_attempts', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Failed attempts before account lockout
              </p>
            </div>

            <div>
              <Label htmlFor="lockout_duration_minutes">Lockout Duration (Minutes)</Label>
              <Input
                id="lockout_duration_minutes"
                type="number"
                min="5"
                max="1440"
                value={config.lockout_duration_minutes}
                onChange={(e) => updateConfig('lockout_duration_minutes', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Duration of account lockout after max attempts
              </p>
            </div>

            <div>
              <Label htmlFor="password_min_length">Password Minimum Length</Label>
              <Input
                id="password_min_length"
                type="number"
                min="4"
                max="128"
                value={config.password_min_length}
                onChange={(e) => updateConfig('password_min_length', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum password length requirement
              </p>
            </div>

            <div>
              <Label htmlFor="password_reset_token_expiry_hours">Password Reset Token Expiry (Hours)</Label>
              <Input
                id="password_reset_token_expiry_hours"
                type="number"
                min="1"
                max="24"
                value={config.password_reset_token_expiry_hours}
                onChange={(e) => updateConfig('password_reset_token_expiry_hours', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Hours until password reset token expires
              </p>
            </div>

            <div>
              <Label htmlFor="require_email_verification">Require Email Verification</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="require_email_verification"
                  checked={config.require_email_verification}
                  onCheckedChange={(checked) => updateConfig('require_email_verification', checked)}
                />
                <Label htmlFor="require_email_verification" className="text-sm">
                  {config.require_email_verification ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Whether new users must verify their email
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Operations Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>System Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kpi_refresh_interval_minutes">KPI Refresh Interval (Minutes)</Label>
              <Input
                id="kpi_refresh_interval_minutes"
                type="number"
                min="5"
                max="1440"
                value={config.kpi_refresh_interval_minutes}
                onChange={(e) => updateConfig('kpi_refresh_interval_minutes', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Interval for refreshing KPI summary data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;