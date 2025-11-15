import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { callService } from '../services/callService';
import apiClient from '../api/client';
import type { Contact } from '../types';

interface Agent {
  id: string;
  name: string;
  status?: string;
  isActive?: boolean;
}

interface PhoneNumber {
  id: string;
  name: string;
  phoneNumber: string;
  assignedToAgentId?: string | null;
  isActive: boolean;
}

interface InitiateCallModalProps {
  visible: boolean;
  contact: Contact | null;
  onClose: () => void;
  onCallInitiated?: (callId: string) => void;
}

export function InitiateCallModal({
  visible,
  contact,
  onClose,
  onCallInitiated,
}: InitiateCallModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAgents, setIsFetchingAgents] = useState(false);
  const [isFetchingPhoneNumbers, setIsFetchingPhoneNumbers] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showPhonePicker, setShowPhonePicker] = useState(false);

  // Fetch agents and phone numbers when modal opens
  useEffect(() => {
    if (visible) {
      fetchAgents();
      fetchPhoneNumbers();
    } else {
      // Reset on close
      setSelectedAgentId('');
      setSelectedPhoneNumberId('');
    }
  }, [visible]);

  // Update selected phone number when agent changes
  useEffect(() => {
    if (selectedAgentId && phoneNumbers.length > 0) {
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      const agentPhone = phoneNumbers.find(p => p.assignedToAgentId === selectedAgentId);
      
      if (agentPhone) {
        setSelectedPhoneNumberId(agentPhone.id);
      } else if (!selectedPhoneNumberId && phoneNumbers.length > 0) {
        setSelectedPhoneNumberId(phoneNumbers[0].id);
      }
    }
  }, [selectedAgentId, phoneNumbers, agents]);

  const fetchAgents = async () => {
    setIsFetchingAgents(true);
    try {
      const response = await apiClient.get('/agents');
      
      let agentsList: Agent[] = [];
      if (response.data.success && Array.isArray(response.data.data)) {
        agentsList = response.data.data;
      } else if (Array.isArray(response.data)) {
        agentsList = response.data;
      }
      
      const activeAgents = agentsList.filter((agent: Agent) => 
        agent.status === 'active' || agent.isActive
      );
      setAgents(activeAgents);

      if (activeAgents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(activeAgents[0].id);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      Alert.alert('Error', 'Failed to load agents. Please try again.');
    } finally {
      setIsFetchingAgents(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    setIsFetchingPhoneNumbers(true);
    try {
      const response = await apiClient.get('/phone-numbers');

      let phoneNumbersList: PhoneNumber[] = [];
      if (response.data.success && Array.isArray(response.data.data)) {
        phoneNumbersList = response.data.data.map((pn: any) => ({
          id: pn.id,
          name: pn.name,
          phoneNumber: pn.phone_number || pn.phoneNumber,
          assignedToAgentId: pn.assigned_to_agent_id || pn.assignedToAgentId,
          isActive: pn.is_active !== false,
        }));
      } else if (Array.isArray(response.data)) {
        phoneNumbersList = response.data.map((pn: any) => ({
          id: pn.id,
          name: pn.name,
          phoneNumber: pn.phone_number || pn.phoneNumber,
          assignedToAgentId: pn.assigned_to_agent_id || pn.assignedToAgentId,
          isActive: pn.is_active !== false,
        }));
      }

      const activePhoneNumbers = phoneNumbersList.filter(pn => pn.isActive);
      setPhoneNumbers(activePhoneNumbers);

      if (activePhoneNumbers.length > 0 && !selectedPhoneNumberId) {
        setSelectedPhoneNumberId(activePhoneNumbers[0].id);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      Alert.alert('Error', 'Failed to load phone numbers. Please try again.');
    } finally {
      setIsFetchingPhoneNumbers(false);
    }
  };

  const handleInitiateCall = async () => {
    if (!contact || !selectedAgentId || !selectedPhoneNumberId) {
      Alert.alert('Missing Information', 'Please select an agent and phone number to initiate the call.');
      return;
    }

    const recipientPhoneNumber = contact.phone_number;
    if (!recipientPhoneNumber) {
      Alert.alert('Missing Phone Number', 'Contact does not have a phone number.');
      return;
    }

    const selectedPhone = phoneNumbers.find(p => p.id === selectedPhoneNumberId);
    if (!selectedPhone) {
      Alert.alert('Invalid Phone Number', 'Selected phone number not found.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/calls/initiate', {
        contactId: contact.id,
        agentId: selectedAgentId,
        phoneNumber: recipientPhoneNumber,
        callerPhoneNumberId: selectedPhoneNumberId,
      });

      const callData = response.data.call || response.data.data;
      
      Alert.alert(
        'Call Initiated',
        `Calling ${contact.name} (${recipientPhoneNumber}) from ${selectedPhone.phoneNumber}...`
      );

      if (onCallInitiated && callData?.id) {
        onCallInitiated(callData.id);
      }

      onClose();
    } catch (error: any) {
      console.error('Error initiating call:', error);
      
      let errorMessage = 'Failed to initiate call. Please try again.';
      
      if (error.response?.status === 402 || error.message?.includes('credit')) {
        errorMessage = 'Insufficient credits. Please purchase more credits to make calls.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Call Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="call" size={24} color={COLORS.primary} />
              <Text style={styles.headerTitle}>Initiate Call</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.label}>Contact</Text>
              <View style={styles.contactCard}>
                <Text style={styles.contactName}>{contact?.name}</Text>
                <Text style={styles.contactPhone}>{contact?.phone_number}</Text>
                {contact?.email && (
                  <Text style={styles.contactEmail}>{contact.email}</Text>
                )}
              </View>
            </View>

            {/* Agent Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Select Agent</Text>
              {isFetchingAgents ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : agents.length === 0 ? (
                <Text style={styles.emptyText}>No active agents available</Text>
              ) : (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowAgentPicker(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {agents.find(a => a.id === selectedAgentId)?.name || 'Select Agent'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Phone Number Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Caller Phone Number</Text>
              {isFetchingPhoneNumbers ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : phoneNumbers.length === 0 ? (
                <Text style={styles.emptyText}>No phone numbers available</Text>
              ) : (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowPhonePicker(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {(() => {
                      const phone = phoneNumbers.find(p => p.id === selectedPhoneNumberId);
                      return phone ? `${phone.name} (${phone.phoneNumber})` : 'Select Phone Number';
                    })()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleInitiateCall}
              disabled={isLoading || !selectedAgentId || !selectedPhoneNumberId}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.buttonPrimaryText}>Initiate Call</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Agent Picker Modal */}
      <Modal
        visible={showAgentPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAgentPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Agent</Text>
              <TouchableOpacity onPress={() => setShowAgentPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {agents.map(agent => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.pickerItem,
                    selectedAgentId === agent.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAgentId(agent.id);
                    setShowAgentPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedAgentId === agent.id && styles.pickerItemTextSelected,
                    ]}
                  >
                    {agent.name}
                  </Text>
                  {selectedAgentId === agent.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Phone Picker Modal */}
      <Modal
        visible={showPhonePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhonePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Phone Number</Text>
              <TouchableOpacity onPress={() => setShowPhonePicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {phoneNumbers.map(phone => (
                <TouchableOpacity
                  key={phone.id}
                  style={[
                    styles.pickerItem,
                    selectedPhoneNumberId === phone.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedPhoneNumberId(phone.id);
                    setShowPhonePicker(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedPhoneNumberId === phone.id && styles.pickerItemTextSelected,
                      ]}
                    >
                      {phone.name}
                    </Text>
                    <Text style={styles.pickerItemSubtext}>{phone.phoneNumber}</Text>
                  </View>
                  {selectedPhoneNumberId === phone.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingLG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.paddingSM,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    padding: SIZES.paddingLG,
  },
  section: {
    marginBottom: SIZES.paddingLG,
  },
  label: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.paddingSM,
  },
  contactCard: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  contactEmail: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectButtonText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingLG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  pickerItemText: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  pickerItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  pickerItemSubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    padding: SIZES.paddingMD,
  },
  footer: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    padding: SIZES.paddingLG,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    gap: SIZES.paddingSM,
  },
  buttonSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonSecondaryText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonPrimaryText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
});
