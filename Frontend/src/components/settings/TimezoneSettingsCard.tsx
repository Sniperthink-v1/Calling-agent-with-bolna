import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Globe, Check, Loader2, Info } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { detectBrowserTimezone, COMMON_TIMEZONES } from '@/utils/timezone';
import { toast } from 'sonner';

interface TimezoneSettingsProps {
  onTimezoneUpdate?: (timezone: string) => void;
}

export function TimezoneSettings({ onTimezoneUpdate }: TimezoneSettingsProps) {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    // Fetch user's current timezone setting first (DB is source of truth)
    fetchUserTimezone();

    // Detect browser timezone only for info/mismatch suggestion
    const detected = detectBrowserTimezone();
    setDetectedTimezone(detected);
  }, []);

  const fetchUserTimezone = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserProfile();
      
      // Backend returns { user: {...} } directly, not wrapped in ApiResponse
      const user = (response as any).user;
      const userTimezone = user?.timezone || 'UTC';
      // Check timezone_manually_set field (inverted from auto-detected)
      const manuallySet = user?.timezone_manually_set === true;
      
      console.log('Fetched user profile for timezone:', userTimezone, 'manually set:', manuallySet);
      
      setTimezone(userTimezone);
      setIsAutoDetected(!manuallySet);
    } catch (err) {
      console.error('Failed to fetch user timezone:', err);
      toast.error('Failed to load timezone settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setIsAutoDetected(false);
  };

  const handleUseDetected = () => {
    setTimezone(detectedTimezone);
    setIsAutoDetected(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await apiService.updateUserProfile({
        timezone: timezone,
        timezoneAutoDetected: isAutoDetected
      });

      // Backend returns { user: {...}, message: '...' } on success
      if ((response as any).user) {
        toast.success('Timezone settings saved successfully!');
        onTimezoneUpdate?.(timezone);
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('timezoneUpdated', { detail: { timezone } }));
      } else {
        throw new Error('Failed to update timezone');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save timezone settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchUserTimezone();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Timezone Settings</CardTitle>
        </div>
        <CardDescription>
          Set your timezone to ensure meeting times, campaign schedules, and notifications 
          are displayed correctly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Detected Timezone */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Detected Timezone</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{detectedTimezone}</span>
            {isAutoDetected && timezone === detectedTimezone && (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
          {timezone !== detectedTimezone && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUseDetected}
            >
              Use Detected Timezone
            </Button>
          )}
        </div>

        {/* Timezone Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Timezone</label>
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Indicator */}
        <div className={`p-3 rounded-lg border ${
          isAutoDetected 
            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
            : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-2">
            <Info className={`h-4 w-4 mt-0.5 ${
              isAutoDetected ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
            }`} />
            <p className={`text-sm ${
              isAutoDetected ? 'text-blue-900 dark:text-blue-100' : 'text-amber-900 dark:text-amber-100'
            }`}>
              {isAutoDetected 
                ? 'Timezone is automatically detected from your browser'
                : 'Manual timezone set. Update this if you travel or change locations.'
              }
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> All times in emails and notifications will be shown in 
            your timezone with a UTC reference (e.g., "2:00 PM PST (22:00 UTC)").
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default TimezoneSettings;
