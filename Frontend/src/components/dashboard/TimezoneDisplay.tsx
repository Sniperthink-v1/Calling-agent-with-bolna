import { useState, useEffect } from 'react';
import { Globe, AlertCircle } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { detectBrowserTimezone } from '@/utils/timezone';
import { authenticatedFetch } from '@/utils/auth';
import { useNavigate } from 'react-router-dom';

const TimezoneDisplay = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showMismatch, setShowMismatch] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');

  useEffect(() => {
    const fetchUserTimezone = async () => {
      try {
        const detected = detectBrowserTimezone();
        setDetectedTimezone(detected);
        
        const response = await authenticatedFetch('/api/users/profile');
        if (response.ok) {
          const data = await response.json();
          const userTimezone = data.user?.timezone || detected;
          setTimezone(userTimezone);
          
          // Check if location has changed
          if (userTimezone !== detected && data.user?.timezone_manually_set) {
            setShowMismatch(true);
          }
        } else {
          setTimezone(detected);
        }
      } catch (error) {
        console.error('Failed to fetch user timezone:', error);
        setTimezone(detectBrowserTimezone());
      } finally {
        setLoading(false);
      }
    };

    fetchUserTimezone();
    
    // Listen for timezone updates
    const handleTimezoneUpdate = (event: any) => {
      setTimezone(event.detail.timezone);
      setShowMismatch(false);
    };
    
    window.addEventListener('timezoneUpdated', handleTimezoneUpdate);
    return () => window.removeEventListener('timezoneUpdated', handleTimezoneUpdate);
  }, []);

  if (loading) return null;

  // Format timezone for display (e.g., "America/New_York" -> "New York")
  const displayTimezone = timezone
    .split('/')
    .pop()
    ?.replace(/_/g, ' ') || timezone;

  const handleClick = () => {
    if (showMismatch) {
      navigate('/settings');
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
        theme === 'dark'
          ? showMismatch
            ? 'bg-orange-900/30 text-orange-300 hover:bg-orange-900/50'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          : showMismatch
            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={showMismatch 
        ? `Your timezone (${timezone}) doesn't match detected location (${detectedTimezone}). Click to update.`
        : `Timezone: ${timezone}`
      }
      onClick={handleClick}
    >
      {showMismatch ? <AlertCircle className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
      <span className="hidden sm:inline">{displayTimezone}</span>
      {showMismatch && (
        <span className="hidden md:inline text-xs opacity-75">• Update?</span>
      )}
    </div>
  );
};

export default TimezoneDisplay;
