import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '../services/contactService';
import type { ContactsListParams } from '../types';

/**
 * Hook to fetch contacts with pagination
 */
export const useContacts = (params?: ContactsListParams) => {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => contactService.getContacts(params),
    staleTime: 60000, // Fresh for 1 minute
  });
};

/**
 * Hook to fetch single contact
 */
export const useContact = (contactId: string) => {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactService.getContact(contactId),
    enabled: !!contactId,
  });
};

/**
 * Hook to create contact
 */
export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

/**
 * Hook to update contact
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: any }) =>
      contactService.updateContact(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

/**
 * Hook to delete contact
 */
export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

/**
 * Hook to fetch contact stats
 */
export const useContactStats = () => {
  return useQuery({
    queryKey: ['contact-stats'],
    queryFn: contactService.getContactStats,
    staleTime: 60000,
  });
};
