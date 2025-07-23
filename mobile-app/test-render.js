/**
 * Test Render Script
 * 
 * This script tests if the app can render a basic screen without the EnhancedApiDebugger component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TestRender = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Render</Text>
      <Text style={styles.subtitle}>If you can see this, basic rendering is working</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default TestRender;