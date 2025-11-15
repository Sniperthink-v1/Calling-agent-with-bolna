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
import { COLORS, SIZES } from '../../constants/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';

type ChangePasswordScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ChangePassword'>;

interface ChangePasswordScreenProps {
  navigation: ChangePasswordScreenNavigationProp;
}

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setIsChanging(true);
      // TODO: Call API to change password
      // await authService.changePassword({ currentPassword, newPassword });
      
      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Change password error:', error);
      Alert.alert('Error', error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  const PasswordInput = ({
    label,
    value,
    onChangeText,
    show,
    toggleShow,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    show: boolean;
    toggleShow: () => void;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={toggleShow}>
          <Ionicons
            name={show ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.info} />
          <Text style={styles.infoText}>
            Your new password must be at least 8 characters long and different from your current password.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            show={showCurrentPassword}
            toggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            show={showNewPassword}
            toggleShow={() => setShowNewPassword(!showNewPassword)}
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            show={showConfirmPassword}
            toggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirement}>
            <Ionicons
              name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={newPassword.length >= 8 ? COLORS.success : COLORS.textLight}
            />
            <Text style={styles.requirementText}>At least 8 characters</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={/[A-Z]/.test(newPassword) ? COLORS.success : COLORS.textLight}
            />
            <Text style={styles.requirementText}>One uppercase letter</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={/[0-9]/.test(newPassword) ? COLORS.success : COLORS.textLight}
            />
            <Text style={styles.requirementText}>One number</Text>
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity
          style={[styles.changeButton, isChanging && styles.changeButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isChanging}
          activeOpacity={0.8}
        >
          {isChanging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.changeButtonText}>Change Password</Text>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.info}15`,
    padding: SIZES.paddingMD,
    borderRadius: 12,
    gap: 12,
    marginBottom: SIZES.paddingXL,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.info,
    lineHeight: 20,
  },
  form: {
    gap: SIZES.paddingLG,
    marginBottom: SIZES.paddingXL,
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
  requirementsCard: {
    backgroundColor: '#fff',
    padding: SIZES.paddingMD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.paddingSM,
    marginBottom: SIZES.paddingXL,
  },
  requirementsTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  changeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.paddingMD,
    borderRadius: 12,
    alignItems: 'center',
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: '#fff',
  },
});
