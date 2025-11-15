import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Import screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CallsStackNavigator from './CallsStackNavigator';
import ContactsScreen from '../screens/contacts/ContactsScreen';
import LeadsStackNavigator from './LeadsStackNavigator';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Calls':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'Contacts':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Leads':
              iconName = focused ? 'bulb' : 'bulb-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="menu" size={28} color={COLORS.text} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: true,
        tabBarStyle: {
          paddingBottom: SIZES.paddingSM,
          paddingTop: SIZES.paddingSM,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: SIZES.xs,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Overview' }}
      />
      <Tab.Screen 
        name="Calls" 
        component={CallsStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Leads" 
        component={LeadsStackNavigator} 
        options={{ 
          title: 'Lead Intelligence',
          headerShown: false 
        }} 
      />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
    </Tab.Navigator>
  );
}
