import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CallsScreen from '../screens/calls/CallsScreen';
import CallDetailScreen from '../screens/calls/CallDetailScreen';
import { COLORS } from '../constants/theme';
import type { Call } from '../types';

export type CallsStackParamList = {
  CallsList: undefined;
  CallDetail: { call: Call };
};

const Stack = createNativeStackNavigator<CallsStackParamList>();

export default function CallsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.card,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="CallsList" 
        component={CallsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CallDetail" 
        component={CallDetailScreen}
        options={{ 
          title: 'Call Details',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}
