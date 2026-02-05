import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, AlertCircle, Loader2, Settings2, User, X, FileJson } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/services/apiService';
import { authenticatedFetch } from '@/utils/auth';
import { useToast } from '@/hooks/use-toast';
import type { 
  FieldDefinition, 
  UserFieldConfiguration, 
  AdminUserListItem
} from '@/types/admin';

interface CustomFieldsConfigurationProps {
  selectedUserId: string | null;
  onUserSelect?: (userId: string) => void;
}

export function CustomFieldsConfiguration({ selectedUserId, onUserSelect }: CustomFieldsConfigurationProps) {
  const [fieldLibrary, setFieldLibrary] = useState<FieldDefinition[]>([]);
  const [userConfiguration, setUserConfiguration] = useState<UserFieldConfiguration | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [generatedJSON, setGeneratedJSON] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [internalSelectedUserId, setInternalSelectedUserId] = useState<string | null>(selectedUserId);
  const [showJSONModal, setShowJSONModal] = useState(false);
  const { toast } = useToast();

  // Sync internal state with prop
  useEffect(() => {
    setInternalSelectedUserId(selectedUserId);
  }, [selectedUserId]);

  // Load field library and users on component mount
  useEffect(() => {
    loadFieldLibrary();
    loadUsers();
  }, []);

  // Load user configuration when user is selected
  useEffect(() => {
    if (internalSelectedUserId) {
      if (fieldLibrary.length === 0) {
        loadFieldLibrary();
      }
      loadUserConfiguration();
    } else {
      setUserConfiguration(null);
      setSelectedFields([]);
      setGeneratedJSON('');
    }
  }, [internalSelectedUserId, fieldLibrary.length]);

  const loadFieldLibrary = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getFieldLibrary();

      const payload = (response as any)?.data ?? response;
      let fields = payload?.allFields || payload?.fields || [];

      if (!Array.isArray(fields) || fields.length === 0) {
        const cacheBuster = Date.now();
        const fallbackResponse = await authenticatedFetch(`/api/admin/field-library?_=${cacheBuster}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          fields = fallbackData?.allFields || fallbackData?.fields || [];
        }
      }

      setFieldLibrary(Array.isArray(fields) ? fields : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load field library',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await apiService.getAdminUsers({ limit: 1000 });
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUserSelectChange = (userId: string) => {
    setInternalSelectedUserId(userId);
    if (onUserSelect) {
      onUserSelect(userId);
    }
  };

  const loadUserConfiguration = async () => {
    if (!internalSelectedUserId) return;

    try {
      setIsLoading(true);
      const response = await apiService.getUserFieldConfiguration(internalSelectedUserId);
      
      const payload = (response as any)?.data ?? response;
      const config = payload?.fieldConfiguration || payload?.configuration || null;
      setUserConfiguration(config);
      setSelectedFields(config?.enabled_fields || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user field configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldKey)) {
        return prev.filter(k => k !== fieldKey);
      } else {
        return [...prev, fieldKey];
      }
    });
  };

  const handleSaveConfiguration = async () => {
    if (!internalSelectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiService.updateUserFieldConfiguration(
        internalSelectedUserId,
        selectedFields
      );

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Custom fields configuration saved successfully',
        });
        loadUserConfiguration();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateJSON = async () => {
    if (!internalSelectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user first',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFields.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one field',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGenerating(true);
      const response = await apiService.generateExtractionJSON(internalSelectedUserId);

      const payload = (response as any)?.data ?? response;
      const extractionJson = payload?.extractionJSON || payload?.extractionJson || payload;
      
      if (extractionJson) {
        const formattedJSON = JSON.stringify(extractionJson, null, 2);
        setGeneratedJSON(formattedJSON);
        setShowJSONModal(true);
        toast({
          title: 'Success',
          description: 'Extraction JSON generated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate extraction JSON',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyJSON = async () => {
    if (!generatedJSON) return;

    try {
      await navigator.clipboard.writeText(generatedJSON);
      setCopiedJSON(true);
      toast({
        title: 'Copied!',
        description: 'JSON copied to clipboard',
      });
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Group fields by category
  const fieldsByCategory = fieldLibrary.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);

  const categories = Object.keys(fieldsByCategory);

  const selectedUserData = users.find(u => u.id === internalSelectedUserId);

  return (
    <div className="space-y-6">
      {/* Header with User Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2 text-teal-600" />
            Custom Fields Configuration
          </CardTitle>
          <CardDescription>
            Select custom fields to extract from call transcripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="user-select" className="text-sm font-medium mb-2 block">
                Select User
              </Label>
              <Select
                value={internalSelectedUserId || ''}
                onValueChange={handleUserSelectChange}
                disabled={isLoadingUsers}
              >
                <SelectTrigger id="user-select" className="w-full">
                  <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Choose a user to configure"}>
                    {selectedUserData && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{selectedUserData.email}</span>
                        {selectedUserData.name && (
                          <span className="text-gray-500">({selectedUserData.name})</span>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{user.email}</span>
                        {user.name && (
                          <span className="text-gray-500 text-sm">({user.name})</span>
                        )}
                        <Badge variant={user.isActive ? "default" : "secondary"} className="ml-2">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!internalSelectedUserId ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Settings2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a user from the dropdown above to configure custom fields</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {internalSelectedUserId && (
        <>
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select 4-5 fields that are relevant for this user's business. After saving, generate the JSON and paste it into the OpenAI platform.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Field Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Fields ({fieldLibrary.length})</CardTitle>
                  <CardDescription>
                    {selectedFields.length} of {fieldLibrary.length} fields selected
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {categories.map((category) => (
                    <div key={category}>
                      <div className="flex items-center mb-3">
                        <Badge variant="outline" className="mr-2">
                          {category}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {fieldsByCategory[category].length} fields
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fieldsByCategory[category].map((field) => (
                          <div
                            key={field.key}
                            className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                          >
                            <Checkbox
                              id={field.key}
                              checked={selectedFields.includes(field.key)}
                              onCheckedChange={() => handleFieldToggle(field.key)}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={field.key}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {field.label}
                              </Label>
                              <p className="text-xs text-gray-500 mt-1">
                                {field.extraction_hint}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {category !== categories[categories.length - 1] && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveConfiguration}
                  disabled={isSaving || selectedFields.length === 0}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
                <Button
                  onClick={handleGenerateJSON}
                  disabled={isGenerating || selectedFields.length === 0}
                  variant="outline"
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileJson className="mr-2 h-4 w-4" />
                      Generate Extraction JSON
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* JSON Modal */}
      <Dialog open={showJSONModal} onOpenChange={setShowJSONModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-teal-600" />
              OpenAI Extraction JSON
            </DialogTitle>
            <DialogDescription>
              Copy this JSON and paste it into Bolna.ai / OpenAI platform system prompt for transcript analysis
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-0">
            <div className="relative">
              <Button
                onClick={handleCopyJSON}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 z-10"
              >
                {copiedJSON ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy JSON
                  </>
                )}
              </Button>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[60vh] text-sm font-mono whitespace-pre">
                {generatedJSON}
              </pre>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Instructions:</strong> Copy this JSON → Open Bolna.ai or OpenAI Platform → 
                Paste in the system prompt extraction section → Save the prompt
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomFieldsConfiguration;
