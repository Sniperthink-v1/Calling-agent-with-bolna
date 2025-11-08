import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Phone,
  MessageSquare,
  Mail,
  Search,
  Filter,
  Plus,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import LazyLoader from '@/components/ui/LazyLoader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useContacts } from '@/hooks/useContacts';
import { useToast } from '@/components/ui/use-toast';
import { useSmartInfiniteScroll } from '@/hooks/useSmartInfiniteScroll';
import { InfiniteScrollLoader } from '@/components/ui/InfiniteScrollLoader';
import DeleteContactDialog from './DeleteContactDialog';
import BulkContactUpload from './BulkContactUpload';
import { CallAgentModal } from './CallAgentModal';
import CreateCampaignModal from '@/components/campaigns/CreateCampaignModal';
import type { Contact, ContactsListOptions, ContactUploadResult } from '@/types';

interface ContactListProps {
  onContactSelect?: (contact: Contact) => void;
  onContactEdit?: (contact: Contact) => void;
  onContactCreate?: () => void;
  useLazyLoading?: boolean;
  initialPageSize?: number;
  enableInfiniteScroll?: boolean;
}

export const ContactList: React.FC<ContactListProps> = ({
  onContactSelect,
  onContactEdit,
  onContactCreate,
  useLazyLoading = false,
  initialPageSize = 20, // Changed to 20 for better UX
  enableInfiniteScroll = true,
}) => {
  const ITEMS_PER_PAGE = initialPageSize;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'phone_number' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [allLoadedContacts, setAllLoadedContacts] = useState<Contact[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'auto_created' | 'linked_to_calls'>('all');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Bulk call state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignPreselectedContacts, setCampaignPreselectedContacts] = useState<string[]>([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
      if (enableInfiniteScroll) {
        setAllLoadedContacts([]); // Clear loaded contacts when searching
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, enableInfiniteScroll]);

  // Prepare options for the hook with server-side pagination
  const contactsOptions: ContactsListOptions = {
    search: debouncedSearchTerm,
    sortBy,
    sortOrder,
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  };

  const {
    contacts,
    pagination,
    loading,
    error,
    deleting,
    refreshContacts,
    deleteContact,
    clearError,
  } = useContacts(contactsOptions);

  // Handle infinite scroll vs traditional pagination and apply filters
  let baseContacts = enableInfiniteScroll ? allLoadedContacts : contacts;
  
  // Apply filter based on selected filter type
  const displayContacts = baseContacts.filter(contact => {
    switch (filterType) {
      case 'auto_created':
        return contact.isAutoCreated;
      case 'linked_to_calls':
        return contact.callLinkType === 'auto_created' || contact.callLinkType === 'manually_linked';
      case 'all':
      default:
        return true;
    }
  });

  // Calculate pagination info from server response
  const totalContacts = pagination?.total || contacts.length;
  const totalPages = Math.ceil(totalContacts / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + contacts.length;
  const hasMore = pagination?.hasMore || false;

  // Debug logging for infinite scroll
  useEffect(() => {
    if (enableInfiniteScroll) {
      console.log('📊 Infinite Scroll State:', {
        currentPage,
        hasMore,
        loading,
        totalLoadedContacts: allLoadedContacts.length,
        displayContacts: displayContacts.length,
        paginationTotal: pagination?.total,
        paginationHasMore: pagination?.hasMore,
        contactsLength: contacts.length,
      });
    }
  }, [currentPage, hasMore, loading, allLoadedContacts.length, displayContacts.length, enableInfiniteScroll]);

  // Smart infinite scroll hook - use allLoadedContacts.length for accurate trigger
  const { triggerRef, isLoadingMore, isTriggerItem } = useSmartInfiniteScroll({
    enabled: enableInfiniteScroll,
    hasMore,
    isLoading: loading,
    onLoadMore: () => {
      console.log('🔄 IntersectionObserver trigger - loading more from page', currentPage, 'to', currentPage + 1);
      setCurrentPage(prev => prev + 1);
    },
    triggerThreshold: 0.8, // Trigger at 80% - more likely to be in viewport
    rootMargin: '500px', // Large margin to trigger very early
    intersectionThreshold: 0,
  });

  // Update accumulated contacts for infinite scroll
  useEffect(() => {
    if (enableInfiniteScroll) {
      if (currentPage === 1) {
        // Reset for new search or first load
        setAllLoadedContacts(contacts);
      } else {
        // Append new contacts
        setAllLoadedContacts(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newContacts = contacts.filter(c => !existingIds.has(c.id));
          return [...prev, ...newContacts];
        });
      }
    }
  }, [contacts, currentPage, enableInfiniteScroll]);

  // Auto-load if page isn't tall enough to scroll
  useEffect(() => {
    if (!enableInfiniteScroll || !hasMore || loading || isLoadingMore) return;

    const checkIfPageTooShort = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const canScroll = scrollHeight > clientHeight;

      if (!canScroll && displayContacts.length > 0) {
        console.log('📏 Page too short to scroll - auto-loading more content', {
          scrollHeight,
          clientHeight,
          itemsLoaded: displayContacts.length,
        });
        setCurrentPage(prev => prev + 1);
      }
    };

    // Check after a short delay to ensure DOM is updated
    const timer = setTimeout(checkIfPageTooShort, 300);
    return () => clearTimeout(timer);
  }, [enableInfiniteScroll, hasMore, loading, isLoadingMore, displayContacts.length]);

  // Backup scroll listener for fast scrolling - catches what IntersectionObserver might miss
  const lastLoadTrigger = useRef<number>(0);
  const lastScrollTop = useRef<number>(0);
  const scrollVelocity = useRef<number>(0);
  
  useEffect(() => {
    if (!enableInfiniteScroll) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // Calculate scroll velocity to detect fast scrolling
      const scrollDelta = scrollTop - lastScrollTop.current;
      scrollVelocity.current = Math.abs(scrollDelta);
      lastScrollTop.current = scrollTop;

      const now = Date.now();
      const timeSinceLastTrigger = now - lastLoadTrigger.current;
      
      // Fast scroll: velocity > 100px, trigger at 1200px
      // Normal scroll: trigger at 600px
      const triggerDistance = scrollVelocity.current > 100 ? 1200 : 600;

      // Trigger earlier for fast scrolling
      if (distanceFromBottom < triggerDistance && hasMore && !loading && !isLoadingMore && timeSinceLastTrigger > 300) {
        const isFastScroll = scrollVelocity.current > 100;
        console.log(isFastScroll ? '🚀 FAST scroll detected' : '📜 Normal scroll', {
          velocity: Math.round(scrollVelocity.current),
          distanceFromBottom: Math.round(distanceFromBottom),
          triggerDistance,
        });
        
        lastLoadTrigger.current = now;
        
        // Load 2 pages ahead if scrolling very fast
        if (isFastScroll && scrollVelocity.current > 200) {
          console.log('⚡ SUPER FAST - Loading 2 pages ahead!');
          setCurrentPage(prev => prev + 2);
        } else {
          setCurrentPage(prev => prev + 1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enableInfiniteScroll, hasMore, loading, isLoadingMore]);

  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    try {
      const success = await deleteContact(contactToDelete.id);
      if (success) {
        toast({
          title: 'Contact deleted',
          description: `${contactToDelete.name} has been deleted successfully.`,
        });
      } else {
        toast({
          title: 'Delete failed',
          description: 'Failed to delete contact. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'An error occurred while deleting the contact.',
        variant: 'destructive',
      });
    }

    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // The useContacts hook will automatically refresh when contactsOptions change
  };

  const handleLoadMore = () => {
    if (useLazyLoading && hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleBulkUploadComplete = async (result: ContactUploadResult) => {
    console.log('📋 ContactList: Upload completed callback triggered', result);
    
    if (result.success && result.summary.successful > 0) {
      toast({
        title: 'Bulk upload completed',
        description: `Successfully uploaded ${result.summary.successful} contacts.`,
      });
      
      console.log('🔄 ContactList: Resetting state (mutation already triggered refetch)...');
      
      // Reset to first page and clear accumulated contacts for fresh data
      setCurrentPage(1);
      setAllLoadedContacts([]);
      
      // The upload mutation's onSuccess already triggered refetchQueries
      // So the data should already be refetching, we just need to wait for it
      console.log('✅ ContactList: State reset complete, fresh data should be loading');
    }
  };

  const handleCallContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsAgentModalOpen(true);
  };

  // Handle individual contact call via campaign
  const handleCallViaCampaign = (contact: Contact) => {
    setCampaignPreselectedContacts([contact.id]);
    setIsCampaignModalOpen(true);
  };

  // Handle bulk call via campaign
  const handleBulkCallViaCampaign = () => {
    if (selectedContactIds.size === 0) {
      toast({
        title: 'No contacts selected',
        description: 'Please select at least one contact to create a campaign.',
        variant: 'destructive',
      });
      return;
    }
    
    setCampaignPreselectedContacts(Array.from(selectedContactIds));
    setIsCampaignModalOpen(true);
  };

  // Handle checkbox selection
  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContactIds);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContactIds(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(displayContacts.map(c => c.id));
      setSelectedContactIds(allIds);
    } else {
      setSelectedContactIds(new Set());
    }
  };

  // Check if all visible contacts are selected
  const allSelected = displayContacts.length > 0 && displayContacts.every(c => selectedContactIds.has(c.id));
  const someSelected = displayContacts.some(c => selectedContactIds.has(c.id)) && !allSelected;

  const handleConfirmCall = async (agentId: string) => {
    if (!selectedContact) return;

    const phone = (selectedContact as any).phoneNumber || (selectedContact as any).phone_number;
    if (!phone) {
      toast({
        title: 'Phone missing',
        description: 'This contact does not have a phone number.',
        variant: 'destructive',
      });
      return;
    }

    // Bolna.ai call initiation payload
    const payload = {
      agent_id: agentId,
      recipient_phone_number: phone,
      user_data: {
        contact_name: selectedContact.name,
        contact_id: selectedContact.id
      }
    };

    // Debug toast/log to verify click and payload
    toast({ title: 'Submitting call...', description: `${selectedContact.name} via agent ${agentId}` });
    console.log('Bolna.ai submit payload:', payload);

    try {
      // Call backend API instead of directly calling external service
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let body: any;
      try { body = JSON.parse(text); } catch { body = text; }

      if (response.ok) {
        toast({
          title: 'Call Initiated',
          description: `Call to ${selectedContact.name} is being initiated.`,
        });
        console.log('Call submission response:', body);
      } else {
        console.error('Call submission error:', body);
        throw new Error((body && (body.detail || body.message)) || `Failed with ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Error Initiating Call',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
      console.error('Error initiating call:', error);
    }

    setIsAgentModalOpen(false);
    setSelectedContact(null);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    // Handle null/undefined phone numbers
    if (!phone || typeof phone !== 'string') {
      return 'N/A';
    }
    
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); refreshContacts(); }}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pl-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contacts</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button onClick={onContactCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search contacts by name, phone, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="auto_created">Auto-created</SelectItem>
                  <SelectItem value="linked_to_calls">Linked to Calls</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="phone_number">Sort by Phone</SelectItem>
                  <SelectItem value="created_at">Sort by Date Added</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {loading ? 'Loading contacts...' : (
                <>
                  {displayContacts.length} 
                  {filterType === 'all' ? ' contacts' : 
                   filterType === 'auto_created' ? ' auto-created contacts' :
                   ' contacts linked to calls'}
                  {filterType !== 'all' && totalContacts !== displayContacts.length && (
                    <span className="text-sm text-gray-500 ml-1">
                      (of {totalContacts} total)
                    </span>
                  )}
                </>
              )}
            </span>
            <div className="flex items-center gap-2">
              {selectedContactIds.size > 0 && (
                <Button
                  onClick={handleBulkCallViaCampaign}
                  style={{ backgroundColor: '#1A6262' }}
                  className="text-white flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  Bulk Call ({selectedContactIds.size})
                </Button>
              )}
              {!loading && contacts.length > 0 && (
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && displayContacts.length === 0 ? (
            // Only show skeleton on initial load when no contacts are loaded yet
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 grid grid-cols-6 gap-4">
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayContacts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Phone className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No contacts found
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? `No contacts match "${searchTerm}"`
                    : 'Get started by adding your first contact'}
                </p>
              </div>
              {!searchTerm && (
                <Button onClick={onContactCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Contact
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all contacts"
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange('name')}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange('phone_number')}
                    >
                      Phone {sortBy === 'phone_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange('created_at')}
                    >
                      Added {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayContacts.map((contact, index) => {
                    // Calculate trigger based on ALL loaded contacts, not just displayed
                    // This ensures the trigger is positioned correctly even with filters
                    const actualIndex = allLoadedContacts.findIndex(c => c.id === contact.id);
                    const shouldBeTrigger = isTriggerItem(actualIndex, allLoadedContacts.length);
                    
                    return (
                      <TableRow
                        key={contact.id}
                        ref={shouldBeTrigger ? (triggerRef as any) : null}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedContactIds.has(contact.id) ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => onContactSelect?.(contact)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedContactIds.has(contact.id)}
                            onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{contact.name}</div>
                            {contact.isAutoCreated && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Auto created and linked to call
                              </div>
                            )}
                            {contact.callLinkType === 'manually_linked' && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Manually linked to call
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatPhoneNumber((contact as any).phoneNumber || (contact as any).phone_number)}
                        </TableCell>
                        <TableCell>
                          {(contact as any).email || (
                            <span className="text-gray-400">No email</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(contact as any).company || (
                            <span className="text-gray-400">No company</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {formatDate((contact as any).createdAt || (contact as any).created_at)}
                        </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onContactEdit?.(contact);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallContact(contact);
                              }}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Call (Direct)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallViaCampaign(contact);
                              }}
                            >
                              <PhoneCall className="w-4 h-4 mr-2" />
                              Call via Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement message functionality
                                toast({
                                  title: 'Message feature',
                                  description: 'Message functionality will be implemented soon.',
                                });
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((contact as any).email) {
                                  window.open(`mailto:${(contact as any).email}`);
                                } else {
                                  toast({
                                    title: 'No email',
                                    description: 'This contact does not have an email address.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(contact);
                              }}
                              disabled={deleting}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Smart Infinite Scroll - Bottom Loader Only */}
              {enableInfiniteScroll ? (
                <InfiniteScrollLoader
                  isLoading={isLoadingMore}
                  hasMore={hasMore}
                  itemCount={displayContacts.length}
                  itemType="contacts"
                  isInitialLoad={loading && currentPage === 1}
                />
              ) : useLazyLoading ? (
                <LazyLoader
                  hasMore={hasMore}
                  loading={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  threshold={200}
                />
              ) : (
                totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalContacts}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={handlePageChange}
                    loading={loading}
                  />
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteContactDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={handleDeleteCancel}
        contact={contactToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
      />

      {/* Bulk Contact Upload Dialog */}
      <BulkContactUpload
        isOpen={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onUploadComplete={handleBulkUploadComplete}
      />

      {/* Call Agent Modal for Direct Calls */}
      <CallAgentModal
        open={isAgentModalOpen}
        contact={selectedContact}
        onClose={() => {
          setIsAgentModalOpen(false);
          setSelectedContact(null);
        }}
        onCallInitiated={(callId) => {
          console.log('Call initiated:', callId);
          toast({
            title: 'Call in progress',
            description: `Calling ${selectedContact?.name}...`,
          });
        }}
      />

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => {
          setIsCampaignModalOpen(false);
          setSelectedContactIds(new Set());
          setCampaignPreselectedContacts([]);
        }}
        preSelectedContacts={campaignPreselectedContacts}
      />
    </div>
  );
};

export default ContactList;