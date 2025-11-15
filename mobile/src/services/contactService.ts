import apiClient from '../api/client';
import type { Contact, ApiResponse, ContactsListParams, Pagination } from '../types';
import { normalizeContact } from '../utils/helpers';

export const contactService = {
  /**
   * Get list of contacts with pagination
   */
  async getContacts(
    params?: ContactsListParams
  ): Promise<{ data: Contact[]; pagination: Pagination }> {
    console.log('📇 Fetching contacts with params:', params);
    const response = await apiClient.get<ApiResponse<Contact[]>>('/contacts', { params });
    console.log('📇 Contacts API response:', response.data);
    
    // Backend returns { data: { contacts: [...], pagination: {...} } }
    const responseData: any = response.data.data || {};
    const contacts = responseData.contacts || response.data.data || [];
    const pagination = responseData.pagination || response.data.pagination;
    
    console.log('📇 Parsed contacts length:', contacts.length);
    
    return {
      data: contacts.map(normalizeContact),
      pagination: pagination || {
        total: 0,
        limit: params?.limit || 30,
        offset: params?.offset || 0,
        hasMore: false,
      },
    };
  },

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<Contact> {
    const response = await apiClient.get<ApiResponse<Contact>>(`/contacts/${contactId}`);
    return normalizeContact(response.data.data!);
  },

  /**
   * Create a new contact
   */
  async createContact(data: {
    name: string;
    phone_number: string;
    email?: string;
    company?: string;
    notes?: string;
  }): Promise<Contact> {
    const response = await apiClient.post<ApiResponse<Contact>>('/contacts', data);
    return normalizeContact(response.data.data!);
  },

  /**
   * Update contact
   */
  async updateContact(contactId: string, data: Partial<Contact>): Promise<Contact> {
    const response = await apiClient.put<ApiResponse<Contact>>(`/contacts/${contactId}`, data);
    return normalizeContact(response.data.data!);
  },

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<void> {
    await apiClient.delete(`/contacts/${contactId}`);
  },

  /**
   * Get contact statistics
   */
  async getContactStats(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/contacts/stats');
    return response.data.data;
  },

  /**
   * Upload contacts via CSV/Excel
   */
  async uploadContacts(file: FormData): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/contacts/upload', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Lookup contact by phone number
   */
  async lookupContact(phoneNumber: string): Promise<Contact | null> {
    try {
      const response = await apiClient.get<ApiResponse<Contact>>(
        `/contacts/lookup/${phoneNumber}`
      );
      return response.data.data ? normalizeContact(response.data.data) : null;
    } catch (error) {
      return null;
    }
  },
};
