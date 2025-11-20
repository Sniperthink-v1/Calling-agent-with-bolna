import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  Typography,
  Tooltip,
  IconButton,
  Alert
} from '@mui/material';
import { Info as InfoIcon, Public as GlobeIcon } from '@mui/icons-material';
import { COMMON_TIMEZONES } from '../../utils/timezone';

interface CampaignTimezoneSelectorProps {
  userTimezone?: string;
  campaignTimezone?: string | null;
  useCustomTimezone?: boolean;
  onChange: (data: { campaignTimezone?: string | null; useCustomTimezone: boolean }) => void;
  disabled?: boolean;
}

export const CampaignTimezoneSelector: React.FC<CampaignTimezoneSelectorProps> = ({
  userTimezone = 'UTC',
  campaignTimezone = null,
  useCustomTimezone = false,
  onChange,
  disabled = false
}) => {
  const [useCustom, setUseCustom] = useState<boolean>(useCustomTimezone);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    campaignTimezone || userTimezone
  );

  useEffect(() => {
    setUseCustom(useCustomTimezone);
    setSelectedTimezone(campaignTimezone || userTimezone);
  }, [useCustomTimezone, campaignTimezone, userTimezone]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
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

  const handleTimezoneChange = (event: any) => {
    const newTimezone = event.target.value;
    setSelectedTimezone(newTimezone);
    
    if (useCustom) {
      onChange({
        useCustomTimezone: true,
        campaignTimezone: newTimezone
      });
    }
  };

  const effectiveTimezone = useCustom ? selectedTimezone : userTimezone;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <GlobeIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">
          Campaign Timezone
        </Typography>
        <Tooltip title="Set a specific timezone for this campaign's calling hours. If not set, your user timezone will be used.">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={useCustom}
            onChange={handleCheckboxChange}
            disabled={disabled}
            color="primary"
          />
        }
        label={
          <Typography variant="body2">
            Use custom timezone for this campaign
          </Typography>
        }
      />

      {useCustom && (
        <FormControl fullWidth margin="normal">
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Campaign Timezone
          </Typography>
          <Select
            value={selectedTimezone}
            onChange={handleTimezoneChange}
            disabled={disabled}
            size="small"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <MenuItem key={tz.value} value={tz.value}>
                {tz.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Alert severity="info" sx={{ mt: 2 }} icon={<InfoIcon />}>
        <Typography variant="caption">
          <strong>Effective Timezone:</strong> {effectiveTimezone}
          <br />
          Campaign calling hours will be interpreted in this timezone.
          {!useCustom && (
            <>
              <br />
              <em>(Using your user timezone)</em>
            </>
          )}
        </Typography>
      </Alert>

      <Box mt={2} p={1.5} bgcolor="background.paper" borderRadius={1} border="1px solid" borderColor="divider">
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Example:</strong> If you set calling hours as 9:00 AM - 5:00 PM in{' '}
          <strong>{effectiveTimezone}</strong>, calls will be made during those hours in that timezone, 
          regardless of your current location.
        </Typography>
      </Box>
    </Box>
  );
};

export default CampaignTimezoneSelector;
