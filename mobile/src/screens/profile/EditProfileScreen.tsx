import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { COLORS, SIZES } from '../../constants/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

interface EditProfileScreenProps {
  navigation: EditProfileScreenNavigationProp;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    try {
      setIsSaving(true);
      // TODO: Call API to update profile
      // await userService.updateProfile({ name, email, phone, company });
      
      // Update local user state
      updateUser({ name, email });
      
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.textLight}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={company}
                onChangeText={setCompany}
                placeholder="Enter your company name"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.paddingLG,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SIZES.paddingXL,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changePhotoText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  form: {
    gap: SIZES.paddingLG,
  },
  inputGroup: {
    gap: SIZES.paddingSM,
  },
  label: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.paddingMD,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SIZES.paddingXL,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: '#fff',
  },
});
