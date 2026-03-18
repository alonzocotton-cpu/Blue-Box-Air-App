import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Google OAuth config
const GOOGLE_CLIENT_ID_WEB = ''; // Will work in demo mode without real client ID

// Blue Box Air colors
const COLORS = {
  navy: '#0f2744',
  navyLight: '#1a365d',
  lime: '#c5d93d',
  white: '#ffffff',
  gray: '#94a3b8',
  grayDark: '#64748b',
  google: '#4285F4',
  red: '#ef4444',
};

// Blue Box Air Logo Component
const LOGO_URI = 'https://customer-assets.emergentagent.com/job_ff19b27f-9c44-4d68-b174-1452a3057557/artifacts/2vycib7s_IMG_2827.jpeg';
const BlueBoxLogo = ({ size = 100 }: { size?: number }) => (
  <Image
    source={{ uri: LOGO_URI }}
    style={{ width: size, height: size, borderRadius: size * 0.18 }}
    resizeMode="contain"
    defaultSource={require('../assets/logo.jpeg')}
    accessible={true}
    accessibilityLabel="Blue Box Air company logo"
  />
);

// Secure credential storage helpers
const SECURE_KEYS = {
  username: 'bba_saved_username',
  password: 'bba_saved_password',
  biometric: 'bba_biometric_enabled',
};

const saveCredentialsSecurely = async (username: string, password: string) => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(SECURE_KEYS.username, username);
      await AsyncStorage.setItem(SECURE_KEYS.password, password);
    } else {
      await SecureStore.setItemAsync(SECURE_KEYS.username, username);
      await SecureStore.setItemAsync(SECURE_KEYS.password, password);
    }
  } catch (e) {
    console.error('Failed to save credentials:', e);
  }
};

const getSecureCredentials = async (): Promise<{ username: string; password: string } | null> => {
  try {
    let username: string | null;
    let password: string | null;
    if (Platform.OS === 'web') {
      username = await AsyncStorage.getItem(SECURE_KEYS.username);
      password = await AsyncStorage.getItem(SECURE_KEYS.password);
    } else {
      username = await SecureStore.getItemAsync(SECURE_KEYS.username);
      password = await SecureStore.getItemAsync(SECURE_KEYS.password);
    }
    if (username && password) return { username, password };
    return null;
  } catch (e) {
    console.error('Failed to get credentials:', e);
    return null;
  }
};

const setBiometricEnabled = async (enabled: boolean) => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(SECURE_KEYS.biometric, enabled ? 'true' : 'false');
    } else {
      await SecureStore.setItemAsync(SECURE_KEYS.biometric, enabled ? 'true' : 'false');
    }
  } catch (e) {
    console.error('Failed to set biometric:', e);
  }
};

const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    let val: string | null;
    if (Platform.OS === 'web') {
      val = await AsyncStorage.getItem(SECURE_KEYS.biometric);
    } else {
      val = await SecureStore.getItemAsync(SECURE_KEYS.biometric);
    }
    return val === 'true';
  } catch (e) {
    return false;
  }
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    await checkBiometricSupport();
    await loadSavedCredentials();
  };

  const checkBiometricSupport = async () => {
    try {
      if (Platform.OS === 'web') {
        setBiometricAvailable(false);
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        } else {
          setBiometricType('Biometric');
        }
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem('savedUsername');
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');

      if (savedUsername && savedRememberMe === 'true') {
        setUsername(savedUsername);
        setRememberMe(true);
      }

      const creds = await getSecureCredentials();
      const bioEnabled = await isBiometricEnabled();
      if (creds) {
        setHasSavedCredentials(true);
        setBiometricEnabledState(bioEnabled);
      }
    } catch (error) {
      console.error('Load credentials error:', error);
    }
  };

  // ============ Biometric Login ============
  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login with ${biometricType}`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Get saved credentials and perform actual login
        const creds = await getSecureCredentials();
        if (creds) {
          setLoading(true);
          try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: creds.username, password: creds.password }),
            });
            const data = await response.json();
            if (data.success) {
              await AsyncStorage.setItem('authToken', data.token);
              await AsyncStorage.setItem('technician', JSON.stringify(data.technician));
              router.replace('/(tabs)/projects');
            } else {
              Alert.alert('Session Expired', 'Please login with your credentials again.');
            }
          } catch (error) {
            // Fallback: use saved token if available
            const savedToken = await AsyncStorage.getItem('authToken');
            const savedTechnician = await AsyncStorage.getItem('technician');
            if (savedToken && savedTechnician) {
              router.replace('/(tabs)/projects');
            } else {
              Alert.alert('Error', 'Unable to connect. Please login manually.');
            }
          } finally {
            setLoading(false);
          }
        } else {
          Alert.alert('No Saved Login', 'Please login with your credentials first to enable biometric login.');
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
    }
  };

  // ============ Google Login ============
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Use expo-auth-session for Google OAuth
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
      };

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'blueboxair',
      });

      // If no Google Client ID configured, use demo mode
      if (!GOOGLE_CLIENT_ID_WEB) {
        // Demo mode: simulate Google login
        Alert.alert(
          'Google Login (Demo)',
          'Google OAuth requires a Google Cloud Client ID for production. In demo mode, we\'ll create a sample Google account.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue Demo',
              onPress: async () => {
                try {
                  // Register or login with a demo Google account
                  const response = await fetch(`${API_URL}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: 'demo.user@gmail.com',
                      name: 'Google Demo User',
                      google_id: 'google-demo-123',
                    }),
                  });
                  const data = await response.json();
                  if (data.success) {
                    await AsyncStorage.setItem('authToken', data.token);
                    await AsyncStorage.setItem('technician', JSON.stringify(data.technician));
                    router.replace('/(tabs)/projects');
                  } else {
                    Alert.alert('Error', data.detail || 'Google login failed');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Unable to connect to server');
                }
              },
            },
          ]
        );
        setGoogleLoading(false);
        return;
      }

      // Real Google OAuth flow
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID_WEB,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.authentication) {
        // Get user info from Google
        const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
          headers: { Authorization: `Bearer ${result.authentication.accessToken}` },
        });
        const userInfo = await userInfoResponse.json();

        // Send to our backend
        const response = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userInfo.email,
            name: userInfo.name,
            google_id: userInfo.sub,
            picture: userInfo.picture,
          }),
        });
        const data = await response.json();
        if (data.success) {
          await AsyncStorage.setItem('authToken', data.token);
          await AsyncStorage.setItem('technician', JSON.stringify(data.technician));
          router.replace('/(tabs)/projects');
        } else {
          Alert.alert('Error', 'Google login failed');
        }
      } else if (result.type === 'error') {
        Alert.alert('Error', result.error?.message || 'Google login failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ============ Standard Login ============
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('technician', JSON.stringify(data.technician));

        // Save credentials if Remember Me is checked
        if (rememberMe) {
          await AsyncStorage.setItem('savedUsername', username);
          await AsyncStorage.setItem('rememberMe', 'true');
        } else {
          await AsyncStorage.removeItem('savedUsername');
          await AsyncStorage.setItem('rememberMe', 'false');
        }

        // Save credentials securely for biometric login
        await saveCredentialsSecurely(username, password);

        // Prompt to enable biometric if available and not yet enabled
        if (biometricAvailable && !biometricEnabled) {
          const bioEnabled = await isBiometricEnabled();
          if (!bioEnabled) {
            Alert.alert(
              `Enable ${biometricType}?`,
              `Would you like to use ${biometricType} for faster login next time?`,
              [
                { text: 'Not Now', style: 'cancel', onPress: () => router.replace('/(tabs)/projects') },
                {
                  text: 'Enable',
                  onPress: async () => {
                    await setBiometricEnabled(true);
                    setBiometricEnabledState(true);
                    setHasSavedCredentials(true);
                    router.replace('/(tabs)/projects');
                  },
                },
              ]
            );
            return;
          }
        }

        router.replace('/(tabs)/projects');
      } else {
        Alert.alert('Login Failed', data.detail || data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const showBiometric = biometricAvailable && hasSavedCredentials && biometricEnabled;

  return (
    <SafeAreaView style={styles.container} accessible={true} accessibilityLabel="Login screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Header */}
          <View style={styles.header} accessible={true} accessibilityRole="header">
            <View style={styles.logoContainer}>
              <BlueBoxLogo size={110} />
            </View>
            <Text style={styles.title} accessibilityRole="header">Blue Box Air, Inc.</Text>
            <Text style={styles.tagline}>Coil Management Solutions</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form} accessible={true} accessibilityLabel="Login form">
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email or Username"
                placeholderTextColor={COLORS.grayDark}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="Email or Username input"
                accessibilityHint="Enter your email address or username"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.grayDark}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
            </View>

            {/* Remember Me */}
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              accessibilityLabel={`Remember me ${rememberMe ? 'enabled' : 'disabled'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.navy} />}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            {/* Salesforce Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityLabel="Sign in with Salesforce"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.navy} />
              ) : (
                <>
                  <Ionicons name="cloud-outline" size={22} color={COLORS.navy} />
                  <Text style={styles.loginButtonText}>Sign in with Salesforce</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} accessibilityLabel="Or sign in with alternative methods">
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Alternative Login Options */}
            <View style={styles.alternativeLogins}>
              {/* Google Login */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                accessibilityLabel="Sign in with Google"
                accessibilityRole="button"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={COLORS.google} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={22} color={COLORS.google} />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Face ID / Touch ID */}
              {showBiometric && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.biometricButton]}
                  onPress={handleBiometricLogin}
                  accessibilityLabel={`Sign in with ${biometricType}`}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={biometricType === 'Face ID' ? "scan-outline" : "finger-print-outline"}
                    size={22}
                    color={COLORS.lime}
                  />
                  <Text style={[styles.socialButtonText, { color: COLORS.lime }]}>
                    {biometricType}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <View style={styles.mockBadge}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.lime} />
              <Text style={styles.mockText}>Demo Mode - Any credentials work</Text>
            </View>

            {/* Create Account Link */}
            <View style={styles.createAccountContainer}>
              <Text style={styles.createAccountText}>New to Blue Box Air? </Text>
              <TouchableOpacity
                onPress={() => router.push('/register')}
                accessibilityLabel="Create a new account"
                accessibilityRole="link"
              >
                <Text style={styles.createAccountLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.lime,
    fontWeight: '500',
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '400',
    marginTop: 6,
    letterSpacing: 1.5,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: COLORS.white,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  rememberMeText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.navy,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2d4a6f',
  },
  dividerText: {
    color: COLORS.grayDark,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  alternativeLogins: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2d4a6f',
    minHeight: 48,
  },
  biometricButton: {
    borderColor: COLORS.lime + '40',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
  },
  footer: {
    alignItems: 'center',
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 217, 61, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  mockText: {
    fontSize: 13,
    color: COLORS.lime,
    fontWeight: '500',
  },
  createAccountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  createAccountText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.lime,
  },
});
