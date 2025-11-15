import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useCreateContact } from '../hooks/useContacts';

interface AddContactModalProps {
  visible: boolean;
  onClose: () => void;
  onContactCreated: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  visible,
  onClose,
  onContactCreated,
}) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  
  const createContact = useCreateContact();

  const resetForm = () => {
    setName('');
    setPhoneNumber('');
    setEmail('');
    setCompany('');
    setNotes('');
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    // Basic phone number validation (allows +, digits, spaces, dashes, parentheses)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await createContact.mutateAsync({
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Contact created successfully');
      resetForm();
      onContactCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      Alert.alert('Error', error.message || 'Failed to create contact. Please try again.');
    }
  };

  const handleClose = () => {
    if (name || phoneNumber || email || company || notes) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={createContact.isPending}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Contact</Text>
          <TouchableOpacity onPress={handleSave} disabled={createContact.isPending}>
            {createContact.isPending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={setName}
                editable={!createContact.isPending}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Phone Number Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="+1 234 567 8900"
                placeholderTextColor={COLORS.textLight}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!createContact.isPending}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                editable={!createContact.isPending}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Company Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Company</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Company name"
                placeholderTextColor={COLORS.textLight}
                value={company}
                onChangeText={setCompany}
                editable={!createContact.isPending}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Notes Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Notes</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional notes..."
                placeholderTextColor={COLORS.textLight}
                value={notes}
                onChangeText={setNotes}
                editable={!createContact.isPending}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              <Text style={styles.required}>* </Text>Required fields
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingLG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  form: {
    flex: 1,
    padding: SIZES.paddingLG,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
  },
  input: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: 8,
    padding: 0,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: SIZES.paddingMD,
  },
  textArea: {
    minHeight: 100,
    marginLeft: 0,
  },
  footer: {
    marginTop: 24,
    marginBottom: 64,
  },
  footerText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
