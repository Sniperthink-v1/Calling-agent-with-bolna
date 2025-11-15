import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';

// Ignore specific warnings (optional)
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Enable all console logs
if (__DEV__) {
  console.log('🚀 App running in DEV mode');
}

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('❌ Query Error:', error);
      },
    },
    mutations: {
      onError: (error) => {
        console.error('❌ Mutation Error:', error);
      },
    },
  },
});

export default function App() {
  useEffect(() => {
    console.log('✅ App mounted successfully');
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <RootNavigator />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
