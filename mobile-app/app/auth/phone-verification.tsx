import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function PhoneVerificationScreen() {
  const { user, verifyPhone, sendVerificationCode } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  
  const codeInputRefs = useRef<(TextInput | null)[]>([]);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // If user already has a verified phone, redirect
  useEffect(() => {
    if (user?.phone && user?.phoneVerified) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const formatPhoneNumber = (number: string) => {
    // Remove all non-digits
    const cleaned = number.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    return cleaned.length > 0 ? `+${cleaned}` : '';
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone.length !== 13) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      console.log('📱 Sending verification code to:', formattedPhone);
      
      const result = await sendVerificationCode(formattedPhone);
      
      if (result.success) {
        console.log('✅ Verification code sent successfully');
        setStep('code');
        setCountdown(60);
        setCanResend(false);
        Alert.alert('Success', `Verification code sent to ${formattedPhone}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('❌ Send verification code error:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeDigitChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    const newCodeDigits = [...codeDigits];
    newCodeDigits[index] = digit;
    setCodeDigits(newCodeDigits);
    
    // Auto-move to next input
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
    
    // Update verification code
    const fullCode = newCodeDigits.join('');
    setVerificationCode(fullCode);
    
    // Auto-submit when all digits are entered
    if (fullCode.length === 6 && !loading) {
      handleVerifyCode(fullCode);
    }
  };

  const handleVerifyCode = async (code?: string) => {
    const codeToVerify = code || verificationCode;
    
    if (codeToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Verifying code:', codeToVerify);
      
      const result = await verifyPhone(formatPhoneNumber(phoneNumber), codeToVerify);
      
      if (result.success) {
        console.log('✅ Phone verification successful');
        Alert.alert('Success', 'Phone number verified successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Invalid verification code');
        // Clear the code inputs on error
        setCodeDigits(['', '', '', '', '', '']);
        setVerificationCode('');
        codeInputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('❌ Verify code error:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    setLoading(true);
    try {
      const result = await sendVerificationCode(formatPhoneNumber(phoneNumber));
      
      if (result.success) {
        Alert.alert('Success', 'Verification code sent again');
        setCountdown(60);
        setCanResend(false);
        // Clear previous code
        setCodeDigits(['', '', '', '', '', '']);
        setVerificationCode('');
        codeInputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="phone-portrait-outline" size={64} color="#007AFF" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Verify Your Phone Number</Text>
      <Text style={styles.stepSubtitle}>
        We'll send you a verification code to confirm your phone number
      </Text>

      <View style={styles.phoneInputContainer}>
        <Text style={styles.countryCode}>+91</Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={handlePhoneSubmit}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handlePhoneSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          Alert.alert(
            'Skip Verification',
            'You can verify your phone number later from the profile section.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Skip', onPress: () => router.replace('/(tabs)') }
            ]
          );
        }}
      >
        <Text style={styles.skipButtonText}>Skip for Now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCodeStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="mail-outline" size={64} color="#007AFF" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Enter Verification Code</Text>
      <Text style={styles.stepSubtitle}>
        We sent a 6-digit code to {formatPhoneNumber(phoneNumber)}
      </Text>

      <View style={styles.codeInputContainer}>
        {codeDigits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (codeInputRefs.current[index] = ref)}
            style={[
              styles.codeInput,
              digit ? styles.codeInputFilled : null,
              loading && styles.codeInputDisabled
            ]}
            value={digit}
            onChangeText={(value) => handleCodeDigitChange(index, value)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!loading}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={() => handleVerifyCode()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity
          onPress={handleResendCode}
          disabled={!canResend || loading}
        >
          <Text style={[styles.linkText, (!canResend || loading) && styles.linkTextDisabled]}>
            {canResend ? 'Resend' : `Resend in ${countdown}s`}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.changePhoneButton}
        onPress={() => {
          setStep('phone');
          setCodeDigits(['', '', '', '', '', '']);
          setVerificationCode('');
        }}
      >
        <Text style={styles.changePhoneText}>Change Phone Number</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Phone Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === 'phone' ? renderPhoneStep() : renderCodeStep()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  countryCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    marginRight: 15,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    width: '100%',
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#fff',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  codeInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linkTextDisabled: {
    color: '#ccc',
  },
  changePhoneButton: {
    paddingVertical: 10,
  },
  changePhoneText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});