import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Info } from 'lucide-react';
import { COMMON_TIMEZONES } from '@/utils/timezone';

interface CampaignTimezoneSelectorProps {
  userTimezone?: string;
  campaignTimezone?: string | null;
  useCustomTimezone?: boolean;
  onChange: (data: { campaignTimezone?: string | null; useCustomTimezone: boolean }) => void;
  disabled?: boolean;
}

export function CampaignTimezoneSelector({
  userTimezone = 'UTC',
  campaignTimezone = null,
  useCustomTimezone = false,
  onChange,
  disabled = false
}: CampaignTimezoneSelectorProps) {
  const [useCustom, setUseCustom] = useState<boolean>(useCustomTimezone);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    campaignTimezone || userTimezone
  );

  useEffect(() => {
    setUseCustom(useCustomTimezone);
    setSelectedTimezone(campaignTimezone || userTimezone);
  }, [useCustomTimezone, campaignTimezone, userTimezone]);

  const handleCheckboxChange = (checked: boolean) => {
    setUseCustom(checked);
    
    if (checked) {
      // When enabling custom timezone, use the current selection
      onChange({
        useCustomTimezone: true,
        campaignTimezone: selectedTimezone
      });
    } else {
      // When disabling, clear custom timezone (will use user timezone)
      onChange({
        useCustomTimezone: false,
        campaignTimezone: null
      });
    }
  };

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    
    if (useCustom) {
      onChange({
        useCustomTimezone: true,
        campaignTimezone: value
      });
    }
  };

  const effectiveTimezone = useCustom ? selectedTimezone : userTimezone;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Label className="text-base">Campaign Timezone</Label>
        <div className="group relative">
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          <div className="invisible group-hover:visible absolute left-0 top-6 z-10 w-64 p-2 text-xs bg-popover border rounded-md shadow-md">
            Set a specific timezone for this campaign's calling hours. If not set, your user timezone will be used.
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="use-custom-timezone"
          checked={useCustom}
          onCheckedChange={handleCheckboxChange}
          disabled={disabled}
        />
        <label
          htmlFor="use-custom-timezone"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Use custom timezone for this campaign
        </label>
      </div>

      {useCustom && (
        <div className="space-y-2 pl-6">
          <Label className="text-sm text-muted-foreground">Campaign Timezone</Label>
          <Select
            value={selectedTimezone}
            onValueChange={handleTimezoneChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
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
      )}

      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
            <p>
              <strong>Effective Timezone:</strong> {effectiveTimezone}
              <br />
              Campaign calling hours will be interpreted in this timezone.
              {!useCustom && (
                <>
                  <br />
                  <em className="text-blue-700 dark:text-blue-300">(Using your user timezone)</em>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Example:</strong> If you set calling hours as 9:00 AM - 5:00 PM in{' '}
            <strong>{effectiveTimezone}</strong>, calls will be made during those hours in that timezone, 
            regardless of your current location.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default CampaignTimezoneSelector;
