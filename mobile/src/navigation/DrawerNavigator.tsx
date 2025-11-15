import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import MainTabNavigator from './MainTabNavigator';
import CustomDrawerContent from '../components/CustomDrawerContent';
import CampaignsScreen from '../screens/campaigns/CampaignsScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import AgentAnalyticsScreen from '../screens/analytics/AgentAnalyticsScreen';
import IntegrationsScreen from '../screens/integrations/IntegrationsScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textSecondary,
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Campaigns"
        component={CampaignsScreen}
        options={{
          headerShown: true,
          title: 'Campaigns',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AgentAnalytics"
        component={AgentAnalyticsScreen}
        options={{
          headerShown: true,
          title: 'Agent Analytics',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Integrations"
        component={IntegrationsScreen}
        options={{
          headerShown: true,
          title: 'Integrations',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="git-network-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile & Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
