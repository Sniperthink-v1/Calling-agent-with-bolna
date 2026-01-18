import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authenticatedFetch } from '@/utils/auth';
import { API_ENDPOINTS } from '@/config/api';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  company?: string;
  city?: string;
  country?: string;
  business_context?: string;
}

interface EmailPreviewProps {
  subject: string;
  body: string;
  selectedContactIds: string[];
}

/**
 * Extract first name from full name
 */
function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

/**
 * Extract last name from full name
 */
function extractLastName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return '';
  return parts.slice(1).join(' ');
}

/**
 * Replace tokens in text with contact data
 */
function replaceTokens(text: string, contact: Contact): string {
  if (!text) return '';

  const tokenMap: Record<string, string> = {
    first_name: extractFirstName(contact.name),
    last_name: extractLastName(contact.name),
    name: contact.name || '',
    email: contact.email || '',
    phone_number: contact.phone_number || '',
    company: contact.company || '',
    city: contact.city || '',
    country: contact.country || '',
    business_context: contact.business_context || '',
  };

  // Replace {token|fallback} or {token}
  return text.replace(/\{([a-z_]+)(?:\|([^}]+))?\}/g, (match, token, fallback) => {
    const value = tokenMap[token];
    if (value && value.trim()) {
      return value;
    }
    return fallback || match; // Return fallback or original token if no value
  });
}

/**
 * Replace tokens with HTML highlighting for missing values
 */
function replaceTokensWithHighlight(text: string, contact: Contact): string {
  if (!text) return '';

  const tokenMap: Record<string, string> = {
    first_name: extractFirstName(contact.name),
    last_name: extractLastName(contact.name),
    name: contact.name || '',
    email: contact.email || '',
    phone_number: contact.phone_number || '',
    company: contact.company || '',
    city: contact.city || '',
    country: contact.country || '',
    business_context: contact.business_context || '',
  };

  // Replace {token|fallback} or {token}
  return text.replace(/\{([a-z_]+)(?:\|([^}]+))?\}/g, (match, token, fallback) => {
    const value = tokenMap[token];
    if (value && value.trim()) {
      return value;
    }
    
    // If no value and no fallback, highlight in red with tooltip
    if (!fallback) {
      const tokenDisplay = `{${token}}`;
      return `<span class="inline-block px-1 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-mono text-xs cursor-help" title="Missing data for '${token}' - Add fallback like {${token}|default value} to avoid this">${tokenDisplay}</span>`;
    }
    
    // Use fallback value
    return fallback;
  });
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  subject,
  body,
  selectedContactIds,
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  // Fetch contacts
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['contacts-for-preview', selectedContactIds],
    queryFn: async () => {
      if (!selectedContactIds || selectedContactIds.length === 0) {
        return [];
      }

      const response = await authenticatedFetch(
        `${API_ENDPOINTS.CONTACTS.LIST}?ids=${selectedContactIds.join(',')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data; // Direct array response
      }
      if (data.data?.contacts && Array.isArray(data.data.contacts)) {
        return data.data.contacts; // Nested structure
      }
      if (data.data && Array.isArray(data.data)) {
        return data.data; // data property is array
      }
      
      return [];
    },
    enabled: selectedContactIds && selectedContactIds.length > 0,
  });

  // Auto-select first contact
  React.useEffect(() => {
    if (contacts && contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  // Get selected contact
  const selectedContact = useMemo(() => {
    return contacts?.find((c) => c.id === selectedContactId);
  }, [contacts, selectedContactId]);

  // Generate preview
  const preview = useMemo(() => {
    if (!selectedContact) {
      return { subject: '', body: '' };
    }

    return {
      subject: replaceTokensWithHighlight(subject, selectedContact),
      body: replaceTokensWithHighlight(body, selectedContact),
    };
  }, [subject, body, selectedContact]);

  // Extract tokens
  const tokensInSubject = useMemo(() => {
    const matches = subject.match(/\{([a-z_]+)(?:\|([^}]+))?\}/g);
    return matches || [];
  }, [subject]);

  const tokensInBody = useMemo(() => {
    const matches = body.match(/\{([a-z_]+)(?:\|([^}]+))?\}/g);
    return matches || [];
  }, [body]);

  const allTokens = useMemo(() => {
    return [...new Set([...tokensInSubject, ...tokensInBody])];
  }, [tokensInSubject, tokensInBody]);

  // Validate tokens for all selected contacts
  const validationWarnings = useMemo(() => {
    if (!contacts || contacts.length === 0 || allTokens.length === 0) {
      return [];
    }

    const warnings: Array<{ contactId: string; contactName: string; missingTokens: string[] }> = [];

    contacts.forEach(contact => {
      const missingTokens: string[] = [];
      
      allTokens.forEach(tokenStr => {
        // Parse token (remove braces and extract token name, ignore fallback)
        const match = tokenStr.match(/\{([a-z_]+)(?:\|[^}]+)?\}/);
        if (!match) return;
        
        const token = match[1];
        const hasData = replaceTokens(tokenStr, contact) !== tokenStr;
        
        if (!hasData) {
          missingTokens.push(token);
        }
      });

      if (missingTokens.length > 0) {
        warnings.push({
          contactId: contact.id,
          contactName: contact.name || contact.email,
          missingTokens
        });
      }
    });

    return warnings;
  }, [contacts, allTokens]);

  if (!contacts || contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Live Preview
          </CardTitle>
          <CardDescription>
            Select contacts to see how personalization will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No contacts selected. Choose recipients to preview personalized content.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          Live Preview
        </CardTitle>
        <CardDescription>
          See how the email will look for each recipient
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Preview as Contact:
          </label>
          <Select value={selectedContactId} onValueChange={setSelectedContactId}>
            <SelectTrigger>
              <SelectValue placeholder="Select contact" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name || contact.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tokens Used */}
        {allTokens.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium">Tokens Used:</label>
            <div className="flex flex-wrap gap-1">
              {allTokens.map((token) => (
                <Badge key={token} variant="secondary" className="font-mono text-xs">
                  {token}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Missing Data for Tokens:</p>
                <div className="space-y-1 text-xs">
                  {validationWarnings.map((warning) => (
                    <div key={warning.contactId}>
                      <strong>{warning.contactName}:</strong>{' '}
                      {warning.missingTokens.map(t => `{${t}}`).join(', ')}
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2">
                  These contacts are missing data for the tokens above. Add fallback text using{' '}
                  <code className="font-mono">{'{token|fallback}'}</code> syntax or ensure contacts have complete data.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Email Preview */}
        <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
          {/* Subject Line */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Subject:
            </label>
            <div 
              className="text-sm font-semibold"
              dangerouslySetInnerHTML={{ __html: preview.subject || '(Empty subject)' }}
            />
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Body */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Body:
            </label>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: preview.body || '(Empty body)' }}
            />
          </div>
        </div>

        {/* Contact Info */}
        {selectedContact && (
          <div className="text-xs text-muted-foreground">
            <p>
              <strong>Preview Data:</strong> {selectedContact.name} ({selectedContact.email})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailPreview;
