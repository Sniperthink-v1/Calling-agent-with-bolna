import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  FormControl, 
  Select, 
  MenuItem, 
  Button, 
  Box, 
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Schedule as ClockIcon, 
  Check as CheckIcon, 
  Public as GlobeIcon 
} from '@mui/icons-material';
import apiService from '../../services/apiService';
import { detectBrowserTimezone, COMMON_TIMEZONES } from '../../utils/timezone';

interface TimezoneSettingsProps {
  userId?: string;
}

export const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({ userId }) => {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Detect browser timezone
    const detected = detectBrowserTimezone();
    setDetectedTimezone(detected);

    // Fetch user's current timezone setting
    fetchUserTimezone();
  }, []);

  const fetchUserTimezone = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data) {
        const userTimezone = response.data.timezone || 'UTC';
        const manuallySet = response.data.timezone_manually_set === true;
        
        setTimezone(userTimezone);
        setIsAutoDetected(!manuallySet);
      }
    } catch (err) {
      console.error('Failed to fetch user timezone:', err);
      setError('Failed to load timezone settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneChange = (event: any) => {
    setTimezone(event.target.value);
    setIsAutoDetected(false);
    setSuccess(false);
  };

  const handleUseDetected = () => {
    setTimezone(detectedTimezone);
    setIsAutoDetected(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const response = await apiService.updateUserProfile({
        timezone: timezone,
        timezoneAutoDetected: isAutoDetected
      });

      if (response.success) {
        setSuccess(true);
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('timezoneUpdated', { detail: { timezone } }));
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error('Failed to update timezone');
      }
    } catch (err: any) {
      console.error('Timezone save error:', err);
      setError(err.message || 'Failed to save timezone settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <ClockIcon color="primary" />
          <Typography variant="h6" component="h2">
            Timezone Settings
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Set your timezone to ensure meeting times, campaign schedules, and notifications 
          are displayed correctly.
        </Typography>

        {/* Detected Timezone */}
        <Box mb={3} p={2} bgcolor="background.default" borderRadius={1}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <GlobeIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" color="text.secondary">
              Detected Timezone
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body1" fontWeight="medium">
              {detectedTimezone}
            </Typography>
            {isAutoDetected && timezone === detectedTimezone && (
              <Chip 
                label="Active" 
                size="small" 
                color="success" 
                icon={<CheckIcon />}
              />
            )}
          </Box>
          {timezone !== detectedTimezone && (
            <Button 
              size="small" 
              onClick={handleUseDetected}
              sx={{ mt: 1 }}
            >
              Use Detected Timezone
            </Button>
          )}
        </Box>

        {/* Timezone Selector */}
        <FormControl fullWidth margin="normal">
          <Typography variant="subtitle2" gutterBottom>
            Select Timezone
          </Typography>
          <Select
            value={timezone}
            onChange={handleTimezoneChange}
            displayEmpty
          >
            {COMMON_TIMEZONES.map((tz) => (
              <MenuItem key={tz.value} value={tz.value}>
                {tz.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status Indicator */}
        <Box mt={2} mb={2}>
          {isAutoDetected ? (
            <Alert severity="info" icon={<GlobeIcon />}>
              Timezone is automatically detected from your browser
            </Alert>
          ) : (
            <Alert severity="warning">
              Manual timezone set. Update this if you travel or change locations.
            </Alert>
          )}
        </Box>

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Timezone settings saved successfully!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Save Button */}
        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={fetchUserTimezone}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        {/* Info Box */}
        <Box mt={3} p={2} bgcolor="info.light" borderRadius={1}>
          <Typography variant="caption" color="info.dark">
            💡 <strong>Tip:</strong> All times in emails and notifications will be shown in 
            your timezone with a UTC reference (e.g., "2:00 PM PST (22:00 UTC)").
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TimezoneSettings;
