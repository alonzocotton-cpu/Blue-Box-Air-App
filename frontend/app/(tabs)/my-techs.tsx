import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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

interface Tech {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  title: string;
  skills: string[];
  status: string;
  avatar_color: string;
  projects_count: number;
  assigned_projects: any[];
  last_active: string;
}

export default function MyTechsScreen() {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchTeam = async () => {
    try {
      const response = await fetch(`${API_URL}/api/team/my-techs`);
      const data = await response.json();
      if (data.success) {
        setTechs(data.team || []);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeam();
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: COLORS.green, label: 'Active', icon: 'checkmark-circle' };
      case 'on_leave': return { color: COLORS.amber, label: 'On Leave', icon: 'time' };
      case 'inactive': return { color: COLORS.red, label: 'Inactive', icon: 'close-circle' };
      default: return { color: COLORS.gray, label: status, icon: 'ellipse' };
    }
  };

  const getTimeAgo = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const openAssignProject = async (tech: Tech) => {
    setSelectedTech(tech);
    try {
      const response = await fetch(`${API_URL}/api/team/all-projects`);
      const data = await response.json();
      setAllProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
    setShowAssignModal(true);
  };

  const toggleProjectAssignment = async (projectId: string, isAssigned: boolean) => {
    if (!selectedTech) return;
    setAssignLoading(true);
    try {
      const endpoint = isAssigned ? '/api/team/unassign-project' : '/api/team/assign-project';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, tech_id: selectedTech.id }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTeam();
        // Update allProjects state
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

  const renderTechCard = ({ item }: { item: Tech }) => {
    const statusConfig = getStatusConfig(item.status);
    const initials = item.full_name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
      <TouchableOpacity
        style={styles.techCard}
        onPress={() => router.push(`/team/tech-profile?id=${item.id}`)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.full_name}, ${item.title}, ${statusConfig.label}`}
        accessibilityRole="button"
      >
        <View style={styles.techCardHeader}>
          <View style={[styles.avatar, { backgroundColor: item.avatar_color + '30' }]}>
            <Text style={[styles.avatarText, { color: item.avatar_color }]}>{initials}</Text>
          </View>
          <View style={styles.techInfo}>
            <Text style={styles.techName}>{item.full_name}</Text>
            <Text style={styles.techTitle}>{item.title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Skills */}
        <View style={styles.skillsRow}>
          {item.skills.slice(0, 3).map((skill, i) => (
            <View key={i} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{skill}</Text>
            </View>
          ))}
          {item.skills.length > 3 && (
            <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="folder-outline" size={14} color={COLORS.lime} />
            <Text style={styles.statText}>{item.projects_count} Projects</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.gray} />
            <Text style={styles.statText}>Active {getTimeAgo(item.last_active)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/team/tech-profile?id=${item.id}`)}
          >
            <Ionicons name="person-outline" size={16} color={COLORS.lime} />
            <Text style={styles.actionButtonText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openAssignProject(item)}
          >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.blue} />
            <Text style={[styles.actionButtonText, { color: COLORS.blue }]}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/team/org-chart')}
          >
            <Ionicons name="git-network-outline" size={16} color={COLORS.amber} />
            <Text style={[styles.actionButtonText, { color: COLORS.amber }]}>Org</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <Ionicons name="people" size={24} color={COLORS.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Techs</Text>
            <Text style={styles.headerSubtitle}>{techs.length} team members</Text>
          </View>
          <TouchableOpacity
            style={styles.orgChartBtn}
            onPress={() => router.push('/team/org-chart')}
          >
            <Ionicons name="git-network-outline" size={20} color={COLORS.lime} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Team List */}
      <FlatList
        data={techs}
        renderItem={renderTechCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.lime}
            colors={[COLORS.lime]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.grayDark} />
            <Text style={styles.emptyText}>No technicians assigned</Text>
          </View>
        }
      />

      {/* Assign Project Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign Projects to {selectedTech?.full_name}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.projectsList} showsVerticalScrollIndicator={false}>
              {allProjects.map((project) => {
                const isAssigned = project.assigned_techs?.includes(selectedTech?.id);
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[styles.projectRow, isAssigned && styles.projectRowAssigned]}
                    onPress={() => toggleProjectAssignment(project.id, isAssigned)}
                    disabled={assignLoading}
                  >
                    <View style={styles.projectCheckbox}>
                      {isAssigned ? (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={COLORS.grayDark} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.projectRowName}>{project.name}</Text>
                      <Text style={styles.projectRowClient}>{project.client_name}</Text>
                    </View>
                    <View style={[styles.projectStatusBadge, { backgroundColor: COLORS.lime + '20' }]}>
                      <Text style={[styles.projectStatusText, { color: COLORS.lime }]}>{project.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowAssignModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.navyLight,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  orgChartBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lime + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  techCard: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  techCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  techTitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  skillChip: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  skillChipText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 11,
    color: COLORS.lime,
    fontWeight: '500',
    alignSelf: 'center',
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d4a6f20',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.lime,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.grayDark,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.navyLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  projectsList: {
    maxHeight: 400,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  projectRowAssigned: {
    borderColor: COLORS.lime + '40',
    backgroundColor: COLORS.lime + '08',
  },
  projectCheckbox: {
    width: 28,
  },
  projectRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  projectRowClient: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  projectStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  projectStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: COLORS.lime,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
});
