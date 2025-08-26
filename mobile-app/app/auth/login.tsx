// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ScrollView,
//   ActivityIndicator,
//   Image, // Add Image import
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import { useAuth } from '../../contexts/AuthContext';
// import { router } from 'expo-router';
// import {
//   GoogleOneTapSignIn,
//   GoogleLogoButton,
// } from '@react-native-google-signin/google-signin';

// export default function LoginScreen() {
//   const [emailOrPhone, setEmailOrPhone] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();

//   const startSignInFlow = async () => {
//     try {
//       GoogleOneTapSignIn.configure(); // move this to after your app starts
//       await GoogleOneTapSignIn.checkPlayServices();
//       const signInResponse = await GoogleOneTapSignIn.signIn();
//       if (signInResponse.type === 'success') {
//         // use signInResponse.data
//       } else if (signInResponse.type === 'noSavedCredentialFound') {
//         // the user wasn't previously signed into this app
//         const createResponse = await GoogleOneTapSignIn.createAccount();
//         if (createResponse.type === 'success') {
//           // use createResponse.data
//         } else if (createResponse.type === 'noSavedCredentialFound') {
//           // no Google user account was present on the device yet (unlikely but possible)
//           const explicitResponse =
//             await GoogleOneTapSignIn.presentExplicitSignIn();
  
//           if (explicitResponse.type === 'success') {
//             // use explicitResponse.data
//           }
//         }
//       }
//       // the else branches correspond to the user canceling the sign in
//     } catch (error) {
//       // handle error
//     }
//   };
//   const handleLogin = async () => {
//     if (!emailOrPhone || !password) {
//       Alert.alert('Error', 'Please fill in all fields');
//       return;
//     }

//     setLoading(true);
//     try {
//       const result = await login(emailOrPhone, password);
      
//       if (result.success) {
//         router.replace('/(tabs)');
//       } else {
//         Alert.alert('Login Failed', result.error || 'Network error. Please check your connection and try again.');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Network error. Please check your connection and try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRegister = () => {
//     router.push('/auth/register');
//   };

//   const handleForgotPassword = () => {
//     router.push('/auth/forgot-password');
//   };

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
//     >
//       <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
//         <View style={styles.content}>
//           <Image
//             source={require('../../assets/icon.png')}
//             style={styles.logo}
//             resizeMode="contain"
//           />
//           <Text style={styles.title}>Welcome Back</Text>
//           <Text style={styles.subtitle}>Sign in to your account</Text>

//           <View style={styles.form}>
//             <TextInput
//               style={styles.input}
//               placeholder="Email or Phone"
//               value={emailOrPhone}
//               onChangeText={setEmailOrPhone}
//               keyboardType="email-address"
//               autoCapitalize="none"
//               returnKeyType="next"
//             />
            
//             <TextInput
//               style={styles.input}
//               placeholder="Password"
//               value={password}
//               onChangeText={setPassword}
//               secureTextEntry
//               returnKeyType="done"
//             />

//             <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
//               <Text style={styles.linkText}>Forgot Password?</Text>
//             </TouchableOpacity>
            
//             <TouchableOpacity
//               style={[styles.button, loading && styles.buttonDisabled]}
//               onPress={handleLogin}
//               disabled={loading}
//             >
//               {loading ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.buttonText}>Sign In</Text>
//               )}
//             </TouchableOpacity>
//           </View>

//           <View style={styles.footer}>
//             <Text style={styles.footerText}>Don't have an account? </Text>
//             <TouchableOpacity onPress={handleRegister}>
//               <Text style={styles.linkText}>Sign Up</Text>
//             </TouchableOpacity>
//           </View>

//           <GoogleLogoButton onPress={startSignInFlow} label="Sign in with Google" />;
        
//         </View>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   content: {
//     flex: 1,
//     padding: 20,
//     justifyContent: 'center',
//     alignItems: 'center', // Center content horizontally
//   },
//   logo: {
//     width: 100,
//     height: 100,
//     marginBottom: 20,
//     alignSelf: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 10,
//     color: '#333',
//   },
//   subtitle: {
//     fontSize: 16,
//     textAlign: 'center',
//     marginBottom: 30,
//     color: '#666',
//   },
//   form: {
//     marginBottom: 30,
//     width: '100%', // Make form take full width
//   },
//   input: {
//     backgroundColor: '#fff',
//     padding: 15,
//     borderRadius: 8,
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     fontSize: 16,
//     width: '100%', // Stretch input to full width
//   },
//   button: {
//     backgroundColor: '#007AFF',
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   buttonDisabled: {
//     backgroundColor: '#ccc',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginBottom: 30,
//   },
//   footerText: {
//     color: '#666',
//     fontSize: 16,
//   },
//   linkText: {
//     color: '#007AFF',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   forgotPassword: {
//     alignSelf: 'flex-end',
//     marginBottom: 15,
//   },
//   testCredentials: {
//     backgroundColor: '#f0f0f0',
//     padding: 15,
//     borderRadius: 8,
//     borderLeftWidth: 4,
//     borderLeftColor: '#007AFF',
//   },
//   testTitle: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     marginBottom: 5,
//     color: '#333',
//   },
//   testText: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 2,
//   },
// });


import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
// Correct import for React Native Google Sign-In
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();

  // Configure Google Sign-In (this should ideally be done in your app initialization)
  React.useEffect(() => {
    GoogleSignin.configure({
      // webClientId: '1029983278193-mtp0p9h5njv6fodimh0glnedincv9rq9.apps.googleusercontent.com', // From Google Cloud Console
      iosClientId: '1029983278193-mgl5t7mtqajk2a3vocs6qchbir317o9q.apps.googleusercontent.com', // Add this line - from Google Cloud Console
      // offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      const tokens = await GoogleSignin.getTokens();

      const result = await googleLogin(tokens.accessToken,userInfo);

      if (result.success){
        router.replace('/(tabs)');
      }else{
        Alert.alert('Google Login Failed', result.error || 'Unable to Signing with google')
      }
      
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress already');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services not available or outdated');
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        console.log('Some other error happened:', error);
        Alert.alert('Error', 'Google Sign-In failed');
      }
    }
  };

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(emailOrPhone, password);
      
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', result.error || 'Network error. Please check your connection and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/auth/register');
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email or Phone"
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
            />

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <GoogleSigninButton
              style={styles.googleButton}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={signInWithGoogle}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  form: {
    marginBottom: 30,
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    width: '100%',
    height: 48,
  },
});