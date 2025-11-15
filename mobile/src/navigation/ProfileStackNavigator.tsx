import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import NotificationSettingsScreen from '../screens/profile/NotificationSettingsScreen';
import BillingScreen from '../screens/profile/BillingScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  Billing: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile & Settings' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
        options={{ title: 'Billing & Credits' }}
      />
    </Stack.Navigator>
  );
}
