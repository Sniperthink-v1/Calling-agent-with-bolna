import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LeadsScreen from '../screens/leads/LeadsScreen';
import LeadDetailScreen from '../screens/leads/LeadDetailScreen';
import { COLORS } from '../constants/theme';
import type { LeadGroup } from '../services/leadIntelligenceService';

export type LeadsStackParamList = {
  LeadsList: undefined;
  LeadDetail: { lead: LeadGroup };
};

const Stack = createNativeStackNavigator<LeadsStackParamList>();

export default function LeadsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.card,
        },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="LeadsList"
        component={LeadsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
        options={{ title: 'Lead Details' }}
      />
    </Stack.Navigator>
  );
}
