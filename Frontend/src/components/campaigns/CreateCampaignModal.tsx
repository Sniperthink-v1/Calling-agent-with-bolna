import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle, Download, HelpCircle, Loader2, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { authenticatedFetch, getAuthHeaders } from '@/utils/auth';
import { CampaignCreditEstimator } from '@/components/campaigns/CampaignCreditEstimator';
import { useCreditToasts } from '@/components/ui/ToastProvider';
import CampaignTimezoneSelectorCard from '@/components/campaigns/CampaignTimezoneSelectorCard';
import { detectBrowserTimezone } from '@/utils/timezone';
import { API_ENDPOINTS } from '@/config/api';
import * as XLSX from 'xlsx';

// Phone number interface for dropdown
interface PhoneNumber {
  id: string;
  name: string;
  phoneNumber: string;
  assignedToAgentId?: string | null;
  agentName?: string;
  isActive: boolean;
}

/**
 * Get current date in a specific timezone as YYYY-MM-DD
 */
function getDateInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Returns YYYY-MM-DD format
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedContacts?: string[]; // For bulk call button integration
}

interface CsvUploadResult {
  campaignId: string;
  totalRows: number;
  contactsCreated: number;
  contactsSkipped: number;
  invalidRows: number;
  skippedContacts?: Array<{
    row: number;
    phone: string;
    reason: string;
  }>;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  preSelectedContacts = [],
}) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [firstCallTime, setFirstCallTime] = useState('09:00');
  const [lastCallTime, setLastCallTime] = useState('17:00');
  const [startDate, setStartDate] = useState(''); // Will be set after fetching timezone
  const [endDate, setEndDate] = useState('');
  const [nextAction, setNextAction] = useState('call');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<CsvUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedContactCount, setParsedContactCount] = useState(0);
  
  // Phone number selection states
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('');
  const [isFetchingPhoneNumbers, setIsFetchingPhoneNumbers] = useState(false);
  
  // Timezone states
  const [useCustomTimezone, setUseCustomTimezone] = useState(false);
  const [campaignTimezone, setCampaignTimezone] = useState<string>('');
  const [userTimezone, setUserTimezone] = useState<string>('');
  
  // Retry configuration states
  const [maxRetries, setMaxRetries] = useState(0);
  const [retryIntervalMinutes, setRetryIntervalMinutes] = useState(60);
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  
  // Credit estimation states
  const [showEstimator, setShowEstimator] = useState(false);
  const [estimatedContactCount, setEstimatedContactCount] = useState(0);
  const [pendingCampaignData, setPendingCampaignData] = useState<any>(null);
  
  // Updated credits toast hook signature (remove non-existent showCreditInsufficient)
  const { showInsufficientCreditsToast } = useCreditToasts();

  // Fetch agents for selection
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
  });

  const agents = (agentsData?.data || []).filter(
    (agent: any) => agent.type === 'CallAgent' || agent.agent_type === 'call'
  );

  // Fetch user profile for timezone and set initial date
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await authenticatedFetch('/api/users/profile');
        if (response.ok) {
          const data = await response.json();
          const profileTimezone = data.user?.timezone || detectBrowserTimezone();
          setUserTimezone(profileTimezone);
          // Set start date to today in user's timezone
          setStartDate(getDateInTimezone(profileTimezone));
        } else {
          const browserTz = detectBrowserTimezone();
          setUserTimezone(browserTz);
          setStartDate(getDateInTimezone(browserTz));
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        const browserTz = detectBrowserTimezone();
        setUserTimezone(browserTz);
        setStartDate(getDateInTimezone(browserTz));
      }
    };
    
    if (isOpen) {
      fetchUserProfile();
      fetchPhoneNumbers();
    }
  }, [isOpen]);

  // Fetch phone numbers for selection
  const fetchPhoneNumbers = async () => {
    setIsFetchingPhoneNumbers(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(API_ENDPOINTS.PHONE_NUMBERS.LIST, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }

      const data = await response.json();
      
      // Handle response format
      let phoneNumbersList: PhoneNumber[] = [];
      if (data.success && Array.isArray(data.data)) {
        phoneNumbersList = data.data.map((pn: any) => ({
          id: pn.id,
          name: pn.name,
          phoneNumber: pn.phone_number || pn.phoneNumber,
          assignedToAgentId: pn.assigned_to_agent_id || pn.assignedToAgentId,
          agentName: pn.agent_name || pn.agentName,
          isActive: pn.is_active !== false,
        }));
      } else if (Array.isArray(data)) {
        phoneNumbersList = data.map((pn: any) => ({
          id: pn.id,
          name: pn.name,
          phoneNumber: pn.phone_number || pn.phoneNumber,
          assignedToAgentId: pn.assigned_to_agent_id || pn.assignedToAgentId,
          agentName: pn.agent_name || pn.agentName,
          isActive: pn.is_active !== false,
        }));
      }

      // Filter only active phone numbers
      const activePhoneNumbers = phoneNumbersList.filter(pn => pn.isActive);
      setPhoneNumbers(activePhoneNumbers);

      // Auto-select first phone number if available
      if (activePhoneNumbers.length > 0 && !selectedPhoneNumberId) {
        setSelectedPhoneNumberId(activePhoneNumbers[0].id);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load phone numbers. You can still create the campaign.',
        variant: 'default',
      });
    } finally {
      setIsFetchingPhoneNumbers(false);
    }
  };

  // Create campaign mutation (for contact-based campaigns)
  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      agent_id: string; 
      phone_number_id?: string;
      contact_ids: string[];
      first_call_time: string;
      last_call_time: string;
      start_date: string;
      end_date?: string;
      next_action: string;
    }) => {
      const response = await authenticatedFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to create campaign');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign Created',
        description: 'Campaign has been created successfully',
      });
      setShowEstimator(false);
      setPendingCampaignData(null);
      setEstimatedContactCount(0);
      setIsUploading(false);
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setShowEstimator(false);
      setIsUploading(false);
    },
  });

  // CSV upload mutation
  const uploadCsvMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await authenticatedFetch('/api/campaigns/upload-csv', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        // Try to parse error JSON; fallback to text
        let errMsg = 'Failed to upload file';
        try {
          const error = await response.json();
          errMsg = error.message || error.error || errMsg;
        } catch {
          const text = await response.text();
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      return response.json();
    },
    onSuccess: (data: CsvUploadResult) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setUploadResult(data);
      toast({
        title: 'Campaign Created from CSV',
        description: `Created campaign with ${data.totalRows} contacts`,
      });
      setShowEstimator(false);
      setPendingCampaignData(null);
      setEstimatedContactCount(0);
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'CSV Upload Error',
        description: error.message,
        variant: 'destructive',
      });
      setShowEstimator(false);
      setIsUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!(/\.(csv|xlsx|xls)$/i).test(file.name)) {
        toast({
          title: 'Invalid File',
          description: 'Please select an Excel (.xlsx/.xls) or CSV (.csv) file',
          variant: 'destructive',
        });
        return;
      }
      
      // Parse file to count valid contacts
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
        
        if (jsonData.length < 2) {
          setParsedContactCount(0);
        } else {
          // Get headers
          const headers = jsonData[0].map((h: any) => 
            h?.toString().toLowerCase().trim().replace(/\s+/g, '_')
          );
          
          // Find phone column index
          const phoneIndex = headers.findIndex((h: string) => 
            ['phone', 'phone_number', 'mobile', 'cell', 'phonenumber'].includes(h)
          );
          
          if (phoneIndex === -1) {
            toast({
              title: 'Invalid Template',
              description: 'Phone number column not found in the file',
              variant: 'destructive',
            });
            return;
          }
          
          // Count valid contacts (skip header, count rows with valid phone numbers)
          let validCount = 0;
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || row.length === 0) continue;
            const hasContent = row.some((cell: any) => cell && cell.toString().trim() !== '');
            if (!hasContent) continue;
            
            // Check if phone number is valid
            const phone = row[phoneIndex];
            if (!phone) continue;
            
            const phoneStr = phone.toString().trim();
            const cleanPhone = phoneStr.replace(/\s+/g, '');
            
            // Skip rows without digits (instruction rows won't have phone numbers)
            if (!cleanPhone || !/\d/.test(cleanPhone)) continue;
            
            const digitCount = (cleanPhone.match(/\d/g) || []).length;
            if (digitCount < 10) continue;
            
            validCount++;
          }
          
          setParsedContactCount(validCount);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Parse Error',
          description: 'Failed to parse the file. Please ensure it\'s a valid Excel or CSV file.',
          variant: 'destructive',
        });
        return;
      }
      
      setCsvFile(file);
      setUploadResult(null);
    }
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    setParsedContactCount(0);
    setUploadResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      // Use backend template endpoint (same as contacts)
      const response = await authenticatedFetch('/api/campaigns/template');
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'campaign_contacts_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Template Downloaded',
        description: 'Excel template downloaded successfully. Phone numbers are pre-formatted to prevent Excel errors.',
      });
    } catch (error) {
      console.error('Failed to download campaign template:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Campaign name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!agentId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an agent',
        variant: 'destructive',
      });
      return;
    }

    // Calculate contact count and show credit estimator
    let contactCount = 0;
    let campaignData: any = null;
    
    // Determine which timezone to use
    const effectiveTimezone = useCustomTimezone ? campaignTimezone : userTimezone;

    if (csvFile) {
      // Use the parsed contact count from file analysis
      contactCount = parsedContactCount;
      campaignData = {
        type: 'csv',
        name,
        agent_id: agentId,
        first_call_time: firstCallTime,
        last_call_time: lastCallTime,
        start_date: startDate,
        end_date: endDate || undefined,
        next_action: nextAction,
        csvFile,
        use_custom_timezone: useCustomTimezone,
        campaign_timezone: effectiveTimezone,
        max_retries: maxRetries,
        retry_interval_minutes: retryIntervalMinutes,
        phone_number_id: selectedPhoneNumberId || undefined,
      };
    } else if (preSelectedContacts.length > 0) {
      contactCount = preSelectedContacts.length;
      campaignData = {
        type: 'contacts',
        name,
        agent_id: agentId,
        phone_number_id: selectedPhoneNumberId || undefined,
        contact_ids: preSelectedContacts,
        first_call_time: firstCallTime,
        last_call_time: lastCallTime,
        start_date: startDate,
        end_date: endDate || undefined,
        next_action: nextAction,
        use_custom_timezone: useCustomTimezone,
        campaign_timezone: effectiveTimezone,
        max_retries: maxRetries,
        retry_interval_minutes: retryIntervalMinutes,
      };
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please upload a CSV file or select contacts',
        variant: 'destructive',
      });
      return;
    }

    // Store data and show credit estimator
    setEstimatedContactCount(contactCount);
    setPendingCampaignData(campaignData);
    setShowEstimator(true);
  };

  // New function to handle confirmed campaign creation
  const handleEstimatorConfirm = async () => {
    if (!pendingCampaignData) return;

    try {
      if (pendingCampaignData.type === 'csv') {
        // Handle CSV upload
        setIsUploading(true);
        const formData = new FormData();
        // Use field name 'file' to match backend upload middleware
        formData.append('file', pendingCampaignData.csvFile);
        formData.append('name', pendingCampaignData.name);
        formData.append('agent_id', pendingCampaignData.agent_id);
        formData.append('first_call_time', pendingCampaignData.first_call_time);
        formData.append('last_call_time', pendingCampaignData.last_call_time);
        formData.append('start_date', pendingCampaignData.start_date);
        formData.append('next_action', pendingCampaignData.next_action);
        if (pendingCampaignData.end_date) {
          formData.append('end_date', pendingCampaignData.end_date);
        }
        if (pendingCampaignData.use_custom_timezone) {
          formData.append('use_custom_timezone', 'true');
          formData.append('campaign_timezone', pendingCampaignData.campaign_timezone);
        }
        // Add retry configuration
        formData.append('max_retries', pendingCampaignData.max_retries.toString());
        formData.append('retry_interval_minutes', pendingCampaignData.retry_interval_minutes.toString());
        
        // Add phone number ID if selected
        if (pendingCampaignData.phone_number_id) {
          formData.append('phone_number_id', pendingCampaignData.phone_number_id);
        }
        
        uploadCsvMutation.mutate(formData);
      } else {
        // Handle contact-based campaign
        createMutation.mutate(pendingCampaignData);
      }
      
      setShowEstimator(false);
    } catch (error: any) {
      if (error.message.includes('insufficient credits')) {
        showInsufficientCreditsToast(0, 0);
      }
      setShowEstimator(false);
    }
  };

  const handleEstimatorCancel = () => {
    setShowEstimator(false);
    setPendingCampaignData(null);
    setEstimatedContactCount(0);
    setIsUploading(false);
  };

  const handleClose = () => {
    setName('');
    setAgentId('');
    setSelectedPhoneNumberId('');
    setFirstCallTime('09:00');
    setLastCallTime('17:00');
    // Reset to today's date in user's timezone
    setStartDate(userTimezone ? getDateInTimezone(userTimezone) : getDateInTimezone(detectBrowserTimezone()));
    setEndDate('');
    setNextAction('call');
    setCsvFile(null);
    setUploadResult(null);
    setIsUploading(false);
    setShowEstimator(false);
    setPendingCampaignData(null);
    setEstimatedContactCount(0);
    setMaxRetries(0);
    setRetryIntervalMinutes(60);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`max-w-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Create a new calling campaign by uploading a CSV file or selecting contacts
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 thin-scrollbar">
          {/* Campaign Name */}
          <div>
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Outreach Campaign"
              className="mt-1"
            />
          </div>

          {/* Agent Selection */}
          <div>
            <Label htmlFor="agent">Select Agent *</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a calling agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone Number Selection */}
          <div>
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Caller Phone Number
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Select the phone number that will be used to make outbound calls for this campaign. If not selected, the agent's assigned phone or any available number will be used.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            {isFetchingPhoneNumbers ? (
              <div className="flex items-center justify-center p-3 border rounded-md mt-1">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading phone numbers...</span>
              </div>
            ) : phoneNumbers.length === 0 ? (
              <div className={`p-3 border rounded-md mt-1 text-sm ${theme === 'dark' ? 'bg-yellow-950/20 border-yellow-800 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                No phone numbers available. The agent's assigned phone number or system default will be used.
              </div>
            ) : (
              <Select value={selectedPhoneNumberId} onValueChange={setSelectedPhoneNumberId}>
                <SelectTrigger id="phoneNumber" className="mt-1">
                  <SelectValue placeholder="Choose a phone number (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone) => {
                    // Find the agent name for this phone number
                    const assignedAgent = phone.assignedToAgentId 
                      ? agents.find((a: any) => a.id === phone.assignedToAgentId)
                      : null;
                    
                    return (
                      <SelectItem key={phone.id} value={phone.id}>
                        <span className="font-medium">{phone.phoneNumber}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {phone.name}
                          {assignedAgent 
                            ? ` • Linked to ${assignedAgent.name}` 
                            : ' • Not linked to any agent'}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Call Time Window */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstCallTime">First Call Time *</Label>
              <Input
                id="firstCallTime"
                type="time"
                value={firstCallTime}
                onChange={(e) => setFirstCallTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lastCallTime">Last Call Time *</Label>
              <Input
                id="lastCallTime"
                type="time"
                value={lastCallTime}
                onChange={(e) => setLastCallTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1"
              />
            </div>
          </div>

          {/* Next Action */}
          <div>
            <Label htmlFor="nextAction">Next Action *</Label>
            <Select value={nextAction} onValueChange={setNextAction}>
              <SelectTrigger id="nextAction" className="mt-1">
                <SelectValue placeholder="Select next action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Retry Configuration */}
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Label className="text-base font-medium">Auto-Retry for Not Connected Leads</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>If a call ends with &quot;no answer&quot; or &quot;busy&quot;, the system will automatically retry calling that lead after the specified interval, up to the maximum number of retries.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxRetries">Number of Retries</Label>
                <Select value={maxRetries.toString()} onValueChange={(val) => setMaxRetries(parseInt(val))}>
                  <SelectTrigger id="maxRetries" className="mt-1">
                    <SelectValue placeholder="Select retries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No retries</SelectItem>
                    <SelectItem value="1">1 retry</SelectItem>
                    <SelectItem value="2">2 retries</SelectItem>
                    <SelectItem value="3">3 retries</SelectItem>
                    <SelectItem value="4">4 retries</SelectItem>
                    <SelectItem value="5">5 retries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="retryInterval">Retry Interval (Minutes)</Label>
                <div className="flex gap-2">
                  <Select 
                    value={isCustomInterval ? "custom" : retryIntervalMinutes.toString()} 
                    onValueChange={(val) => {
                      if (val === "custom") {
                        setIsCustomInterval(true);
                      } else {
                        setIsCustomInterval(false);
                        setRetryIntervalMinutes(parseInt(val));
                      }
                    }}
                    disabled={maxRetries === 0}
                  >
                    <SelectTrigger id="retryInterval" className="mt-1 flex-1">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="360">6 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {isCustomInterval && (
                    <Input
                      type="number"
                      value={retryIntervalMinutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setRetryIntervalMinutes(val);
                        } else {
                          setRetryIntervalMinutes(0);
                        }
                      }}
                      className="mt-1 w-24"
                      min={1}
                      max={1440}
                      placeholder="Mins"
                    />
                  )}
                </div>
              </div>
            </div>
            {maxRetries > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Leads that don&apos;t connect will be retried up to {maxRetries} time{maxRetries > 1 ? 's' : ''} with {retryIntervalMinutes >= 60 ? `${retryIntervalMinutes / 60} hour${retryIntervalMinutes >= 120 ? 's' : ''}` : `${retryIntervalMinutes} minutes`} between each attempt. Retries will respect campaign time windows.
              </p>
            )}
          </div>

          {/* Timezone Settings */}
          <CampaignTimezoneSelectorCard
            userTimezone={userTimezone}
            campaignTimezone={campaignTimezone}
            useCustomTimezone={useCustomTimezone}
            onChange={({ useCustomTimezone, campaignTimezone }) => {
              setUseCustomTimezone(useCustomTimezone);
              setCampaignTimezone(campaignTimezone || '');
            }}
          />

          {/* File Upload Section */}
          {preSelectedContacts.length === 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Upload Contacts (Excel/CSV)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <div
                className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center ${
                  theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
                }`}
              >
                {!csvFile ? (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="mb-2">Drop your Excel or CSV file here or click to browse</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Supports .xlsx, .xls, and .csv files. Only phone_number is required.
                    </p>
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-8 h-8 mr-3 text-blue-500" />
                      <div className="text-left">
                        <p className="font-medium">{csvFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(csvFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pre-selected Contacts Info */}
          {preSelectedContacts.length > 0 && (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                <span className="font-medium">
                  {preSelectedContacts.length} contacts selected
                </span>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-4 rounded-lg space-y-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-green-50'}`}>
              <div className="flex items-center font-medium text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                Campaign Created Successfully!
              </div>
              <div className="text-sm space-y-1">
                <p>Total rows processed: {uploadResult.totalRows}</p>
                <p>New contacts created: {uploadResult.contactsCreated}</p>
                {uploadResult.contactsSkipped > 0 && (
                  <p className="text-yellow-600">
                    Contacts skipped (already exist): {uploadResult.contactsSkipped}
                  </p>
                )}
                {uploadResult.invalidRows > 0 && (
                  <p className="text-red-600">
                    Invalid rows: {uploadResult.invalidRows}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {uploadResult ? 'Close' : 'Cancel'}
            </Button>
            {!uploadResult && (
              <Button
                type="submit"
                disabled={createMutation.isPending || isUploading}
                style={{ backgroundColor: '#1A6262' }}
                className="text-white"
              >
                {isUploading ? 'Creating...' : 'Create Campaign'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Credit Estimator Dialog */}
    <Dialog open={showEstimator} onOpenChange={handleEstimatorCancel}>
      <DialogContent className={`max-w-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <DialogHeader>
          <DialogTitle>Campaign Cost Estimate</DialogTitle>
          <DialogDescription>
            Review the estimated cost for your campaign before proceeding
          </DialogDescription>
        </DialogHeader>
        
        <CampaignCreditEstimator
          contactCount={estimatedContactCount}
          showDetailedBreakdown={true}
          estimateOnly={false}
        />
        
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={handleEstimatorCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleEstimatorConfirm}
            disabled={createMutation.isPending || isUploading}
            style={{ backgroundColor: '#1A6262' }}
            className="text-white"
          >
            {isUploading || createMutation.isPending ? 'Creating...' : 'Confirm & Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default CreateCampaignModal;
