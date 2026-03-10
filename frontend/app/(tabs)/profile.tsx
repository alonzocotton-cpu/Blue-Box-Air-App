import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Blue Box Air colors
const COLORS = {
  navy: '#0f2744',
  navyLight: '#1a365d',
  lime: '#c5d93d',
  white: '#ffffff',
  gray: '#94a3b8',
  grayDark: '#64748b',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
};

interface Technician {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  title?: string;
  company?: string;
  skills: string[];
  profile_photo?: string;
}

export default function ProfileScreen() {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    title: '',
    company: 'Blue Box Air, Inc.',
    skills: [] as string[],
  });
  const [newSkill, setNewSkill] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try API first
      const response = await fetch(`${API_URL}/api/auth/profile`);
      const data = await response.json();
      setTechnician(data);
      setEditForm({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        title: data.title || 'Technician',
        company: data.company || 'Blue Box Air, Inc.',
        skills: data.skills || [],
      });
      if (data.profile_photo) {
        setProfilePhoto(data.profile_photo);
      }
    } catch (error) {
      // Fallback to AsyncStorage
      const stored = await AsyncStorage.getItem('technician');
      if (stored) {
        const data = JSON.parse(stored);
        setTechnician(data);
        setEditForm({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          title: data.title || 'Technician',
          company: data.company || 'Blue Box Air, Inc.',
          skills: data.skills || [],
        });
      }
    }
  };

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    
    if (!result.canceled && result.assets[0]) {
      const base64 = result.assets[0].base64 
        ? `data:image/jpeg;base64,${result.assets[0].base64}` 
        : result.assets[0].uri;
      setProfilePhoto(base64);
    }
  };

  const takeProfilePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed for profile photo');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    
    if (!result.canceled && result.assets[0]) {
      const base64 = result.assets[0].base64 
        ? `data:image/jpeg;base64,${result.assets[0].base64}` 
        : result.assets[0].uri;
      setProfilePhoto(base64);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takeProfilePhoto },
      { text: 'Choose from Gallery', onPress: pickProfilePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const addSkill = () => {
    if (newSkill.trim() && !editForm.skills.includes(newSkill.trim())) {
      setEditForm({ ...editForm, skills: [...editForm.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setEditForm({ ...editForm, skills: editForm.skills.filter(s => s !== skill) });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          profile_photo: profilePhoto,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setTechnician(data.profile);
        await AsyncStorage.setItem('technician', JSON.stringify(data.profile));
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('technician');
            router.replace('/');
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightElement,
    color = COLORS.white,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
    color?: string;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuItemIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, { color: color }]}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement ? rightElement : showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.grayDark} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>BLUE BOX</Text>
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={24} color={COLORS.lime} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer} 
              onPress={editing ? showPhotoOptions : undefined}
              activeOpacity={editing ? 0.7 : 1}
            >
              <View style={styles.avatar}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={40} color={COLORS.lime} />
                )}
              </View>
              {editing && (
                <View style={styles.cameraOverlay}>
                  <Ionicons name="camera" size={16} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>

            {editing ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.editNameInput}
                  value={editForm.full_name}
                  onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.grayDark}
                />
                <TextInput
                  style={styles.editTitleInput}
                  value={editForm.title}
                  onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                  placeholder="Title (e.g., Lead Technician)"
                  placeholderTextColor={COLORS.grayDark}
                />
              </View>
            ) : (
              <>
                <Text style={styles.name}>{technician?.full_name || 'Technician'}</Text>
                <Text style={styles.title}>{technician?.title || 'Technician'}</Text>
                <Text style={styles.company}>{technician?.company || 'Blue Box Air, Inc.'}</Text>
              </>
            )}

            {!editing && technician?.skills && technician.skills.length > 0 && (
              <View style={styles.skillsContainer}>
                {technician.skills.map((skill, index) => (
                  <View key={index} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {editing ? (
            /* Edit Mode */
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>CONTACT INFO</Text>
              <View style={styles.sectionContent}>
                <View style={styles.editField}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.lime} style={styles.editFieldIcon} />
                  <TextInput
                    style={styles.editFieldInput}
                    value={editForm.email}
                    onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                    placeholder="Email"
                    placeholderTextColor={COLORS.grayDark}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.editField}>
                  <Ionicons name="call-outline" size={20} color={COLORS.lime} style={styles.editFieldIcon} />
                  <TextInput
                    style={styles.editFieldInput}
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                    placeholder="Phone Number"
                    placeholderTextColor={COLORS.grayDark}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.editField}>
                  <Ionicons name="business-outline" size={20} color={COLORS.lime} style={styles.editFieldIcon} />
                  <TextInput
                    style={styles.editFieldInput}
                    value={editForm.company}
                    onChangeText={(text) => setEditForm({ ...editForm, company: text })}
                    placeholder="Company"
                    placeholderTextColor={COLORS.grayDark}
                  />
                </View>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>SKILLS</Text>
              <View style={styles.sectionContent}>
                <View style={styles.skillsEditContainer}>
                  {editForm.skills.map((skill, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.skillBadgeEdit}
                      onPress={() => removeSkill(skill)}
                    >
                      <Text style={styles.skillText}>{skill}</Text>
                      <Ionicons name="close-circle" size={16} color={COLORS.lime} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.addSkillRow}>
                  <TextInput
                    style={styles.addSkillInput}
                    value={newSkill}
                    onChangeText={setNewSkill}
                    placeholder="Add a skill..."
                    placeholderTextColor={COLORS.grayDark}
                    onSubmitEditing={addSkill}
                  />
                  <TouchableOpacity style={styles.addSkillBtn} onPress={addSkill}>
                    <Ionicons name="add" size={22} color={COLORS.navy} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Save / Cancel Buttons */}
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.navy} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={22} color={COLORS.navy} />
                      <Text style={styles.saveButtonText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setEditing(false);
                    // Reset form
                    if (technician) {
                      setEditForm({
                        full_name: technician.full_name || '',
                        email: technician.email || '',
                        phone: technician.phone || '',
                        title: technician.title || 'Technician',
                        company: technician.company || 'Blue Box Air, Inc.',
                        skills: technician.skills || [],
                      });
                    }
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* View Mode */
            <>
              {/* Account Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <View style={styles.sectionContent}>
                  <MenuItem
                    icon="person-outline"
                    title="Edit Profile"
                    subtitle="Update your personal information"
                    onPress={() => setEditing(true)}
                    color={COLORS.lime}
                  />
                  <MenuItem
                    icon="mail-outline"
                    title="Email"
                    subtitle={technician?.email || 'Not set'}
                    showArrow={false}
                    color={COLORS.white}
                  />
                  <MenuItem
                    icon="call-outline"
                    title="Phone"
                    subtitle={technician?.phone || 'Not set'}
                    showArrow={false}
                    color={COLORS.white}
                  />
                  <MenuItem
                    icon="cloud-outline"
                    title="Salesforce Connection"
                    subtitle="Connected (Mock)"
                    onPress={() => {}}
                    color={COLORS.lime}
                  />
                </View>
              </View>

              {/* Settings Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SETTINGS</Text>
                <View style={styles.sectionContent}>
                  <MenuItem
                    icon="notifications-outline"
                    title="Push Notifications"
                    subtitle="Receive project updates"
                    showArrow={false}
                    color={COLORS.white}
                    rightElement={
                      <Switch
                        value={notifications}
                        onValueChange={setNotifications}
                        trackColor={{ false: '#2d4a6f', true: COLORS.lime }}
                        thumbColor={COLORS.white}
                      />
                    }
                  />
                  <MenuItem
                    icon="camera-outline"
                    title="Camera & Video"
                    subtitle="Capture photos and videos"
                    showArrow={false}
                    color={COLORS.white}
                  />
                </View>
              </View>

              {/* Support Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SUPPORT</Text>
                <View style={styles.sectionContent}>
                  <MenuItem
                    icon="help-circle-outline"
                    title="Help Center"
                    onPress={() => {}}
                    color={COLORS.white}
                  />
                  <MenuItem
                    icon="information-circle-outline"
                    title="About"
                    subtitle="Blue Box Air v1.0.0"
                    showArrow={false}
                    color={COLORS.white}
                  />
                </View>
              </View>

              {/* Logout */}
              <View style={styles.logoutSection}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Blue Box Air, Inc.</Text>
                <Text style={styles.footerSubtext}>Coil Management Solutions</Text>
              </View>
            </>
          )}
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
  header: {
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 3,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.lime,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.navy,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: COLORS.lime,
    fontWeight: '500',
    marginBottom: 2,
  },
  company: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
  },
  editNameContainer: {
    alignItems: 'center',
    width: '80%',
  },
  editNameInput: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.lime,
    paddingBottom: 6,
    marginBottom: 8,
    width: '100%',
  },
  editTitleInput: {
    fontSize: 14,
    color: COLORS.lime,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
    paddingBottom: 4,
    width: '100%',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: COLORS.lime + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillBadgeEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.lime + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.lime,
  },
  skillsEditContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  addSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  addSkillInput: {
    flex: 1,
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
  },
  addSkillBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  editSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayDark,
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  editFieldIcon: {
    marginRight: 14,
  },
  editFieldInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.white,
  },
  editActions: {
    marginTop: 24,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.lime,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 15,
    color: COLORS.gray,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginTop: 2,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red + '20',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.red,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginTop: 4,
  },
});
