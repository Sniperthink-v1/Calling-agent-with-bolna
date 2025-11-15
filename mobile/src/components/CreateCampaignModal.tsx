import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SIZES } from '../constants/theme';
import { useAgents } from '../hooks/useAgents';
import { useCreateCampaign } from '../hooks/useCampaigns';

interface CreateCampaignModalProps {
  visible: boolean;
  contactIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Agent {
  id: string;
  name: string;
}

// Custom Date Picker Component
const DatePickerComponent: React.FC<{
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
  colors: any;
}> = ({ value, onChange, onClose, colors }) => {
  const currentDate = value ? new Date(value) : new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [day, setDay] = useState(currentDate.getDate());

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = () => new Date(year, month, 0).getDate();
  const days = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1);

  const handleConfirm = () => {
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formattedDate);
  };

  return (
    <View style={{ backgroundColor: colors.backgroundSecondary, padding: SIZES.md, borderRadius: 8, marginTop: SIZES.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: SIZES.md }}>
        <View style={{ flex: 1, marginRight: SIZES.sm }}>
          <Text style={{ color: colors.text, marginBottom: SIZES.sm }}>Year</Text>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {years.map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => setYear(y)}
                style={{ padding: SIZES.sm, backgroundColor: year === y ? colors.primary : 'transparent', borderRadius: 4, marginBottom: 4 }}
              >
                <Text style={{ color: year === y ? '#FFFFFF' : colors.text, textAlign: 'center' }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flex: 1, marginRight: SIZES.sm }}>
          <Text style={{ color: colors.text, marginBottom: SIZES.sm }}>Month</Text>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {months.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMonth(m)}
                style={{ padding: SIZES.sm, backgroundColor: month === m ? colors.primary : 'transparent', borderRadius: 4, marginBottom: 4 }}
              >
                <Text style={{ color: month === m ? '#FFFFFF' : colors.text, textAlign: 'center' }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, marginBottom: SIZES.sm }}>Day</Text>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {days.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDay(d)}
                style={{ padding: SIZES.sm, backgroundColor: day === d ? colors.primary : 'transparent', borderRadius: 4, marginBottom: 4 }}
              >
                <Text style={{ color: day === d ? '#FFFFFF' : colors.text, textAlign: 'center' }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: SIZES.sm }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ flex: 1, padding: SIZES.md, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: colors.text }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          style={{ flex: 1, padding: SIZES.md, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF' }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Custom Time Picker Component
const TimePickerComponent: React.FC<{
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
  colors: any;
}> = ({ value, onChange, onClose, colors }) => {
  const [hour, minute] = value.split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState(hour || 9);
  const [selectedMinute, setSelectedMinute] = useState(minute || 0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const formattedTime = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(formattedTime);
  };

  return (
    <View style={{ backgroundColor: colors.backgroundSecondary, padding: SIZES.md, borderRadius: 8, marginTop: SIZES.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: SIZES.md }}>
        <View style={{ flex: 1, marginRight: SIZES.sm }}>
          <Text style={{ color: colors.text, marginBottom: SIZES.sm, textAlign: 'center' }}>Hour</Text>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setSelectedHour(h)}
                style={{ padding: SIZES.sm, backgroundColor: selectedHour === h ? colors.primary : 'transparent', borderRadius: 4, marginBottom: 4 }}
              >
                <Text style={{ color: selectedHour === h ? '#FFFFFF' : colors.text, textAlign: 'center' }}>{String(h).padStart(2, '0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, marginBottom: SIZES.sm, textAlign: 'center' }}>Minute</Text>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {minutes.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedMinute(m)}
                style={{ padding: SIZES.sm, backgroundColor: selectedMinute === m ? colors.primary : 'transparent', borderRadius: 4, marginBottom: 4 }}
              >
                <Text style={{ color: selectedMinute === m ? '#FFFFFF' : colors.text, textAlign: 'center' }}>{String(m).padStart(2, '0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: SIZES.sm }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ flex: 1, padding: SIZES.md, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: colors.text }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          style={{ flex: 1, padding: SIZES.md, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF' }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  visible,
  contactIds,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const createCampaignMutation = useCreateCampaign();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [firstCallTime, setFirstCallTime] = useState('09:00');
  const [lastCallTime, setLastCallTime] = useState('18:00');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'first' | 'last' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Set default start date to tomorrow
  React.useEffect(() => {
    if (!startDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
    }
  }, []);

  const agents: Agent[] = agentsData || [];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedAgentId('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);
    setFirstCallTime('09:00');
    setLastCallTime('18:00');
    setShowAgentDropdown(false);
    setShowTimePicker(null);
    setShowDatePicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter campaign name');
      return;
    }
    if (!selectedAgentId) {
      Alert.alert('Error', 'Please select an agent');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Error', 'Please select start date');
      return;
    }

    try {
      await createCampaignMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        agent_id: selectedAgentId,
        contact_ids: contactIds,
        start_date: startDate,
        first_call_time: firstCallTime,
        last_call_time: lastCallTime,
        next_action: 'start',
      });

      Alert.alert('Success', 'Campaign created successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create campaign');
    }
  };

  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Campaign</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {contactIds.length} contact{contactIds.length !== 1 ? 's' : ''} selected
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Campaign Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter campaign name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter campaign description (optional)"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Select Agent *</Text>
              {agentsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading agents...</Text>
                </View>
              ) : (
                <View>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowAgentDropdown(!showAgentDropdown)}
                  >
                    <Text style={selectedAgent ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {selectedAgent ? selectedAgent.name : 'Select an agent'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{showAgentDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {showAgentDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                        {agents.length === 0 ? (
                          <Text style={styles.noAgentsText}>No agents available</Text>
                        ) : (
                          agents.map((agent) => (
                            <TouchableOpacity
                              key={agent.id}
                              style={[
                                styles.dropdownItem,
                                selectedAgentId === agent.id && styles.dropdownItemSelected,
                              ]}
                              onPress={() => {
                                setSelectedAgentId(agent.id);
                                setShowAgentDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  selectedAgentId === agent.id && styles.dropdownItemTextSelected,
                                ]}
                              >
                                {agent.name}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={styles.dateTimeText}>
                  {startDate || 'Select date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DatePickerComponent
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                  colors={colors}
                />
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>First Call Time *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTimePicker('first')}
                >
                  <Text style={styles.dateTimeText}>{firstCallTime}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Last Call Time *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTimePicker('last')}
                >
                  <Text style={styles.dateTimeText}>{lastCallTime}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showTimePicker && (
              <TimePickerComponent
                value={showTimePicker === 'first' ? firstCallTime : lastCallTime}
                onChange={(time) => {
                  if (showTimePicker === 'first') {
                    setFirstCallTime(time);
                  } else {
                    setLastCallTime(time);
                  }
                  setShowTimePicker(null);
                }}
                onClose={() => setShowTimePicker(null)}
                colors={colors}
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={createCampaignMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreate}
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SIZES.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: SIZES.xl,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: SIZES.sm,
    },
    closeText: {
      fontSize: 24,
      color: colors.textSecondary,
    },
    content: {
      padding: SIZES.md,
    },
    infoBox: {
      backgroundColor: colors.backgroundSecondary,
      padding: SIZES.md,
      borderRadius: 8,
      marginBottom: SIZES.md,
    },
    infoText: {
      fontSize: SIZES.md,
      color: colors.primary,
      fontWeight: '600',
    },
    field: {
      marginBottom: SIZES.md,
    },
    label: {
      fontSize: SIZES.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: SIZES.sm,
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: SIZES.md,
      fontSize: SIZES.md,
      color: colors.text,
    },
    dateTimeText: {
      fontSize: SIZES.md,
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    helpText: {
      fontSize: SIZES.sm,
      color: colors.textSecondary,
      marginTop: 4,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SIZES.md,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
    },
    loadingText: {
      marginLeft: SIZES.sm,
      fontSize: SIZES.md,
      color: colors.textSecondary,
    },
    dropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: SIZES.md,
    },
    dropdownText: {
      fontSize: SIZES.md,
      color: colors.text,
    },
    dropdownPlaceholder: {
      fontSize: SIZES.md,
      color: colors.textSecondary,
    },
    dropdownArrow: {
      fontSize: SIZES.sm,
      color: colors.textSecondary,
    },
    dropdownList: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginTop: SIZES.sm,
      maxHeight: 200,
    },
    dropdownScroll: {
      maxHeight: 200,
    },
    dropdownItem: {
      padding: SIZES.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemSelected: {
      backgroundColor: colors.primary + '20',
    },
    dropdownItemText: {
      fontSize: SIZES.md,
      color: colors.text,
    },
    dropdownItemTextSelected: {
      fontWeight: '600',
      color: colors.primary,
    },
    noAgentsText: {
      padding: SIZES.md,
      fontSize: SIZES.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SIZES.md,
    },
    halfField: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      padding: SIZES.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: SIZES.md,
    },
    button: {
      flex: 1,
      padding: SIZES.md,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    cancelButton: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: SIZES.md,
      fontWeight: '600',
      color: colors.text,
    },
    createButton: {
      backgroundColor: colors.primary,
    },
    createButtonText: {
      fontSize: SIZES.md,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
