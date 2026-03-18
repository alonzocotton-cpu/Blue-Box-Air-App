import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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

interface OrgNode {
  id: string;
  name: string;
  title: string;
  role: string;
  avatar_color: string;
  is_current_user?: boolean;
  status?: string;
  children: OrgNode[];
}

const ROLE_ICONS: Record<string, string> = {
  admin: 'shield',
  supervisor: 'star',
  technician: 'construct',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Director',
  supervisor: 'Supervisor',
  technician: 'Technician',
};

export default function OrgChartScreen() {
  const [orgData, setOrgData] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    try {
      const response = await fetch(`${API_URL}/api/team/org-chart`);
      const data = await response.json();
      if (data.success) {
        setOrgData(data.org_chart);
        // Expand all nodes by default
        const allIds = new Set<string>();
        const collectIds = (node: OrgNode) => {
          allIds.add(node.id);
          node.children?.forEach(collectIds);
        };
        collectIds(data.org_chart);
        setExpandedNodes(allIds);
      }
    } catch (error) {
      console.error('Error fetching org chart:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return COLORS.green;
      case 'on_leave': return COLORS.amber;
      case 'inactive': return COLORS.red;
      default: return COLORS.gray;
    }
  };

  const renderNode = (node: OrgNode, depth: number = 0, isLast: boolean = true) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const initials = node.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const roleIcon = ROLE_ICONS[node.role] || 'person';
    const roleLabel = ROLE_LABELS[node.role] || node.role;

    return (
      <View key={node.id} style={styles.nodeContainer}>
        {/* Connector line from parent */}
        {depth > 0 && (
          <View style={styles.connectorContainer}>
            <View style={[styles.verticalLine, { height: 24, left: 24 }]} />
          </View>
        )}

        {/* Node Card */}
        <TouchableOpacity
          style={[
            styles.nodeCard,
            node.is_current_user && styles.nodeCardCurrent,
            { marginLeft: depth * 32 },
          ]}
          onPress={() => {
            if (hasChildren) toggleNode(node.id);
            if (node.role === 'technician') {
              router.push(`/team/tech-profile?id=${node.id}`);
            }
          }}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View style={[styles.nodeAvatar, { backgroundColor: node.avatar_color + '30' }]}>
            <Text style={[styles.nodeAvatarText, { color: node.avatar_color }]}>{initials}</Text>
            {node.status && (
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(node.status) }
              ]} />
            )}
          </View>

          {/* Info */}
          <View style={styles.nodeInfo}>
            <View style={styles.nodeNameRow}>
              <Text style={styles.nodeName}>
                {node.name}
                {node.is_current_user ? ' (You)' : ''}
              </Text>
            </View>
            <Text style={styles.nodeTitle}>{node.title}</Text>
            <View style={[styles.roleBadge, { backgroundColor: node.avatar_color + '20' }]}>
              <Ionicons name={roleIcon as any} size={10} color={node.avatar_color} />
              <Text style={[styles.roleBadgeText, { color: node.avatar_color }]}>{roleLabel}</Text>
            </View>
          </View>

          {/* Expand toggle */}
          {hasChildren && (
            <View style={styles.expandToggle}>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.gray}
              />
              <Text style={styles.childCount}>{node.children.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Children */}
        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {/* Connecting line to children */}
            <View style={[
              styles.branchLine,
              { left: (depth + 1) * 32 + 24, height: node.children.length * 110 - 40 }
            ]} />
            {node.children.map((child, index) =>
              renderNode(child, depth + 1, index === node.children.length - 1)
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Loading org chart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Organization Chart</Text>
          <Text style={styles.headerSubtitle}>Blue Box Air, Inc.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="git-network" size={22} color={COLORS.lime} />
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Ionicons name="shield" size={14} color={COLORS.lime} />
          <Text style={styles.legendText}>Director</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="star" size={14} color={COLORS.blue} />
          <Text style={styles.legendText}>Supervisor</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="construct" size={14} color={COLORS.amber} />
          <Text style={styles.legendText}>Technician</Text>
        </View>
      </View>

      {/* Chart */}
      <ScrollView
        contentContainerStyle={styles.chartContainer}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartInner}>
            {orgData && renderNode(orgData)}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.navyLight,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
    gap: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.navyMid,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  chartContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  chartInner: {
    minWidth: 350,
    paddingRight: 32,
  },
  nodeContainer: {
    marginBottom: 4,
  },
  connectorContainer: {
    position: 'relative',
    height: 8,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#2d4a6f',
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.navyLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2d4a6f',
    minWidth: 280,
  },
  nodeCardCurrent: {
    borderColor: COLORS.lime + '60',
    backgroundColor: COLORS.lime + '08',
  },
  nodeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodeAvatarText: { fontSize: 16, fontWeight: '700' },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.navyLight,
  },
  nodeInfo: { flex: 1 },
  nodeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nodeName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  nodeTitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '600' },
  expandToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  childCount: { fontSize: 10, color: COLORS.grayDark, marginTop: 1 },
  childrenContainer: {
    position: 'relative',
  },
  branchLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#2d4a6f',
    top: 0,
  },
});
