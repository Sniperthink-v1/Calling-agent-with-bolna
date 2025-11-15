import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          
          <ScrollView style={styles.errorDetails}>
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <Text style={styles.detailsText}>
              {this.state.error?.toString()}
            </Text>
            
            {this.state.errorInfo && (
              <>
                <Text style={styles.detailsTitle}>Component Stack:</Text>
                <Text style={styles.detailsText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </>
            )}
            
            {this.state.error?.stack && (
              <>
                <Text style={styles.detailsTitle}>Stack Trace:</Text>
                <Text style={styles.detailsText}>
                  {this.state.error.stack}
                </Text>
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.paddingLG,
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SIZES.paddingMD,
    textAlign: 'center',
  },
  message: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginBottom: SIZES.paddingLG,
    textAlign: 'center',
  },
  errorDetails: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  detailsTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
  },
  detailsText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
