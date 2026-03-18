import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  navy: '#0f2744',
  navyLight: '#1a365d',
  navyMid: '#1e3a5f',
  lime: '#c5d93d',
  white: '#ffffff',
  gray: '#94a3b8',
  grayDark: '#64748b',
  green: '#22c55e',
  blue: '#3b82f6',
  amber: '#f59e0b',
  red: '#ef4444',
};

export default function TechProfileScreen() {
  const { id } = useLocalSearchParams();
  const [tech, setTech] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchTech = async () => {
    try {
      const response = await fetch(`${API_URL}/api/team/tech/${id}`);
      const data = await response.json();
      if (data.success) {
        setTech(data.technician);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTech();
  }, [id]);

  const openAssignModal = async () => {
    try {
      const res = await fetch(`${API_URL}/api/team/all-projects`);
      const data = await res.json();
      setAllProjects(data.projects || []);
    } catch (error) {
      console.error(error);
    }
    setShowAssignModal(true);
  };

  const toggleAssignment = async (projectId: string, isAssigned: boolean) => {
    setAssignLoading(true);
    try {
      const endpoint = isAssigned ? '/api/team/unassign-project' : '/api/team/assign-project';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, tech_id: id }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTech();
        const res = await fetch(`${API_URL}/api/team/all-projects`);
        const pData = await res.json();
        setAllProjects(pData.projects || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update assignment');
    } finally {
      setAssignLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: COLORS.green, label: 'Active', icon: 'checkmark-circle' };
      case 'on_leave': return { color: COLORS.amber, label: 'On Leave', icon: 'time' };
      default: return { color: COLORS.gray, label: status, icon: 'ellipse' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
        </View>
      </SafeAreaView>
    );
  }

  if (!tech) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: COLORS.white }}>Technician not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(tech.status);
  const initials = tech.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Technician Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={openAssignModal}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.bigAvatar, { backgroundColor: tech.avatar_color + '30' }]}>
            <Text style={[styles.bigAvatarText, { color: tech.avatar_color }]}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{tech.full_name}</Text>
          <Text style={styles.profileTitle}>{tech.title}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.statusPillText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${tech.email}`)}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={18} color={COLORS.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{tech.email}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={COLORS.grayDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`tel:${tech.phone}`)}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call-outline" size={18} color={COLORS.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{tech.phone}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={COLORS.grayDark} />
          </TouchableOpacity>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills & Certifications</Text>
          <View style={styles.skillsGrid}>
            {tech.skills?.map((skill: string, i: number) => (
              <View key={i} style={styles.skillBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.lime} />
                <Text style={styles.skillBadgeText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assigned Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assigned Projects</Text>
            <TouchableOpacity onPress={openAssignModal}>
              <Ionicons name="add-circle" size={24} color={COLORS.lime} />
            </TouchableOpacity>
          </View>
          {tech.assigned_projects?.length > 0 ? (
            tech.assigned_projects.map((project: any) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => router.push(`/project/${project.id}`)}
              >
                <View style={styles.projectCardHeader}>
                  <View style={styles.projectIcon}>
                    <Ionicons name="folder" size={18} color={COLORS.lime} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.projectCardName}>{project.name}</Text>
                    <Text style={styles.projectCardClient}>{project.client_name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.grayDark} />
                </View>
                <View style={styles.projectCardFooter}>
                  <View style={[styles.projectBadge, { backgroundColor: COLORS.lime + '20' }]}>
                    <Text style={[styles.projectBadgeText, { color: COLORS.lime }]}>{project.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyProjects}>
              <Ionicons name="folder-open-outline" size={32} color={COLORS.grayDark} />
              <Text style={styles.emptyProjectsText}>No projects assigned</Text>
              <TouchableOpacity style={styles.assignBtn} onPress={openAssignModal}>
                <Ionicons name="add" size={18} color={COLORS.navy} />
                <Text style={styles.assignBtnText}>Assign Project</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Assign Project Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Projects</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {allProjects.map((project) => {
                const isAssigned = project.assigned_techs?.includes(id as string);
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[styles.modalProjectRow, isAssigned && styles.modalProjectRowActive]}
                    onPress={() => toggleAssignment(project.id, isAssigned)}
                    disabled={assignLoading}
                  >
                    {isAssigned ? (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color={COLORS.grayDark} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalProjectName}>{project.name}</Text>
                      <Text style={styles.modalProjectClient}>{project.client_name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowAssignModal(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.navyLight,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.white, textAlign: 'center' },
  editBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bigAvatarText: { fontSize: 30, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  profileTitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  statusPillText: { fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.white, marginBottom: 12 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f20',
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: { fontSize: 11, color: COLORS.grayDark, fontWeight: '500' },
  contactValue: { fontSize: 14, color: COLORS.white, marginTop: 2 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lime + '20',
  },
  skillBadgeText: { fontSize: 12, color: COLORS.lime, fontWeight: '500' },
  projectCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCardName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  projectCardClient: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  projectCardFooter: { flexDirection: 'row', marginTop: 10, gap: 8 },
  projectBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  projectBadgeText: { fontSize: 11, fontWeight: '500' },
  emptyProjects: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyProjectsText: { fontSize: 14, color: COLORS.grayDark },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.lime,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  assignBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.navyLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.white },
  modalProjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  modalProjectRowActive: { borderColor: COLORS.lime + '40', backgroundColor: COLORS.lime + '08' },
  modalProjectName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  modalProjectClient: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  doneBtn: {
    backgroundColor: COLORS.lime,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
});
