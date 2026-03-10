import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Blue Box Air colors
const COLORS = {
  navy: '#0f2744',
  navyLight: '#1a365d',
  lime: '#c5d93d',
  white: '#ffffff',
  gray: '#94a3b8',
  grayDark: '#64748b',
  green: '#22c55e',
  blue: '#3b82f6',
  orange: '#f59e0b',
  red: '#ef4444',
};

interface EquipmentDetails {
  equipment: any;
  readings: any[];
  photos: any[];
  service_logs: any[];
}

const READING_TYPES = [
  { type: 'Differential Pressure', unit: 'inWC', icon: 'speedometer' },
  { type: 'Airflow', unit: 'CFM', icon: 'swap-horizontal' },
  { type: 'Temperature', unit: '°F', icon: 'thermometer' },
  { type: 'Humidity', unit: '%', icon: 'water' },
];

export default function EquipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [details, setDetails] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [activePhaseFilter, setActivePhaseFilter] = useState<'All' | 'Pre' | 'Post'>('All');
  
  // Reading form state
  const [readingForm, setReadingForm] = useState({
    reading_type: 'Differential Pressure',
    reading_phase: 'Pre' as 'Pre' | 'Post',
    value: '',
    unit: 'inWC',
    notes: '',
  });
  
  // Date/Time picker state
  const [captureDate, setCaptureDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fetchDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/equipment/detail/${id}`);
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const openReadingModal = (readingType: string, unit: string) => {
    setReadingForm({
      ...readingForm,
      reading_type: readingType,
      unit: unit,
      value: '',
      notes: '',
    });
    setCaptureDate(new Date());
    setShowReadingModal(true);
  };

  const submitReading = async () => {
    if (!readingForm.value) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    try {
      await fetch(`${API_URL}/api/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: id,
          project_id: details?.equipment?.project_id,
          reading_type: readingForm.reading_type,
          reading_phase: readingForm.reading_phase,
          value: parseFloat(readingForm.value),
          unit: readingForm.unit,
          captured_at: captureDate.toISOString(),
          notes: readingForm.notes || undefined,
        }),
      });
      setShowReadingModal(false);
      setReadingForm({ 
        reading_type: 'Differential Pressure', 
        reading_phase: 'Pre',
        value: '', 
        unit: 'inWC', 
        notes: '' 
      });
      fetchDetails();
      Alert.alert('Success', `${readingForm.reading_phase} reading recorded successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save reading');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        await fetch(`${API_URL}/api/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: details?.equipment?.project_id,
            equipment_id: id,
            image_data: `data:image/jpeg;base64,${result.assets[0].base64}`,
            photo_type: 'Equipment',
          }),
        });
        fetchDetails();
        Alert.alert('Success', 'Photo uploaded successfully');
      } catch (error) {
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(captureDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setCaptureDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(captureDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setCaptureDate(newDate);
    }
  };

  // Filter readings by phase
  const filteredReadings = details?.readings?.filter(r => {
    if (activePhaseFilter === 'All') return true;
    return r.reading_phase === activePhaseFilter;
  }) || [];

  // Group readings by phase for display
  const preReadings = details?.readings?.filter(r => r.reading_phase === 'Pre') || [];
  const postReadings = details?.readings?.filter(r => r.reading_phase === 'Post') || [];

  if (loading || !details) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
        </View>
      </SafeAreaView>
    );
  }

  const { equipment, readings, photos, service_logs } = details;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Equipment</Text>
        </View>
        <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Equipment Info */}
        <View style={styles.equipmentHeader}>
          <View style={styles.equipmentIcon}>
            <Ionicons name="cube" size={40} color={COLORS.lime} />
          </View>
          <Text style={styles.equipmentName}>{equipment.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{equipment.equipment_type}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {equipment.model && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Model</Text>
              <Text style={styles.detailValue}>{equipment.model}</Text>
            </View>
          )}
          {equipment.serial_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Serial Number</Text>
              <Text style={styles.detailValue}>{equipment.serial_number}</Text>
            </View>
          )}
          {equipment.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{equipment.location}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: COLORS.green + '20' }]}>
              <Text style={[styles.statusText, { color: COLORS.green }]}>{equipment.status}</Text>
            </View>
          </View>
        </View>

        {/* Quick Reading Buttons - Pre/Post Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record Reading</Text>
          <Text style={styles.sectionSubtitle}>Select reading type to capture Pre or Post measurements</Text>
          <View style={styles.readingGrid}>
            {READING_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.type}
                style={styles.readingBtn}
                onPress={() => openReadingModal(rt.type, rt.unit)}
              >
                <Ionicons name={rt.icon as any} size={28} color={COLORS.lime} />
                <Text style={styles.readingBtnText}>{rt.type}</Text>
                <Text style={styles.readingBtnUnit}>{rt.unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Readings Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Readings</Text>
            <View style={styles.readingsSummary}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryLabel}>Pre:</Text>
                <Text style={styles.summaryValue}>{preReadings.length}</Text>
              </View>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryLabel}>Post:</Text>
                <Text style={styles.summaryValue}>{postReadings.length}</Text>
              </View>
            </View>
          </View>

          {/* Phase Filter Tabs */}
          <View style={styles.phaseFilter}>
            {(['All', 'Pre', 'Post'] as const).map((phase) => (
              <TouchableOpacity
                key={phase}
                style={[
                  styles.phaseTab,
                  activePhaseFilter === phase && styles.phaseTabActive,
                  phase === 'Pre' && activePhaseFilter === phase && { backgroundColor: COLORS.blue },
                  phase === 'Post' && activePhaseFilter === phase && { backgroundColor: COLORS.green },
                ]}
                onPress={() => setActivePhaseFilter(phase)}
              >
                <Text style={[
                  styles.phaseTabText,
                  activePhaseFilter === phase && styles.phaseTabTextActive
                ]}>
                  {phase}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Readings List */}
          {filteredReadings.length > 0 ? (
            filteredReadings.slice(0, 10).map((reading: any, index: number) => (
              <View key={reading.id || index} style={styles.readingCard}>
                <View style={styles.readingHeader}>
                  <View style={styles.readingInfo}>
                    <View style={[
                      styles.phaseBadge,
                      { backgroundColor: reading.reading_phase === 'Pre' ? COLORS.blue + '20' : COLORS.green + '20' }
                    ]}>
                      <Text style={[
                        styles.phaseText,
                        { color: reading.reading_phase === 'Pre' ? COLORS.blue : COLORS.green }
                      ]}>
                        {reading.reading_phase}
                      </Text>
                    </View>
                    <Text style={styles.readingType}>{reading.reading_type}</Text>
                  </View>
                  <View style={styles.readingValueContainer}>
                    <Text style={styles.readingValue}>{reading.value}</Text>
                    <Text style={styles.readingUnit}>{reading.unit}</Text>
                  </View>
                </View>
                <Text style={styles.readingTime}>
                  Captured: {reading.captured_at ? format(new Date(reading.captured_at), 'MMM d, yyyy h:mm a') : 
                            reading.timestamp ? format(new Date(reading.timestamp), 'MMM d, yyyy h:mm a') : ''}
                </Text>
                {reading.notes && (
                  <Text style={styles.readingNotes}>{reading.notes}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={32} color={COLORS.grayDark} />
              <Text style={styles.emptyText}>No {activePhaseFilter !== 'All' ? activePhaseFilter.toLowerCase() : ''} readings recorded yet</Text>
            </View>
          )}
        </View>

        {/* Service History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service History</Text>
          {service_logs && service_logs.length > 0 ? (
            service_logs.slice(0, 3).map((log: any, index: number) => (
              <View key={log.id || index} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceTypeBadge}>
                    <Text style={styles.serviceTypeText}>{log.service_type}</Text>
                  </View>
                  <Text style={styles.serviceDate}>
                    {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy') : ''}
                  </Text>
                </View>
                <Text style={styles.serviceDescription}>{log.description}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={32} color={COLORS.grayDark} />
              <Text style={styles.emptyText}>No service history</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reading Modal with Pre/Post and Date/Time */}
      <Modal visible={showReadingModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record {readingForm.reading_type}</Text>
              <TouchableOpacity onPress={() => setShowReadingModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* Pre/Post Phase Selection */}
            <View style={styles.phaseSelection}>
              <Text style={styles.fieldLabel}>Reading Phase</Text>
              <View style={styles.phaseButtons}>
                <TouchableOpacity
                  style={[
                    styles.phaseButton,
                    readingForm.reading_phase === 'Pre' && styles.phaseButtonActivePre
                  ]}
                  onPress={() => setReadingForm({ ...readingForm, reading_phase: 'Pre' })}
                >
                  <Ionicons 
                    name="arrow-down-circle" 
                    size={22} 
                    color={readingForm.reading_phase === 'Pre' ? COLORS.white : COLORS.blue} 
                  />
                  <Text style={[
                    styles.phaseButtonText,
                    readingForm.reading_phase === 'Pre' && styles.phaseButtonTextActive
                  ]}>Pre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.phaseButton,
                    readingForm.reading_phase === 'Post' && styles.phaseButtonActivePost
                  ]}
                  onPress={() => setReadingForm({ ...readingForm, reading_phase: 'Post' })}
                >
                  <Ionicons 
                    name="arrow-up-circle" 
                    size={22} 
                    color={readingForm.reading_phase === 'Post' ? COLORS.white : COLORS.green} 
                  />
                  <Text style={[
                    styles.phaseButtonText,
                    readingForm.reading_phase === 'Post' && styles.phaseButtonTextActive
                  ]}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date/Time Selection */}
            <View style={styles.dateTimeSection}>
              <Text style={styles.fieldLabel}>Capture Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={COLORS.lime} />
                  <Text style={styles.dateTimeText}>
                    {format(captureDate, 'MMM d, yyyy')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color={COLORS.lime} />
                  <Text style={styles.dateTimeText}>
                    {format(captureDate, 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Value Input */}
            <Text style={styles.fieldLabel}>Value</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.modalInput, styles.valueInput]}
                placeholder="Enter value"
                placeholderTextColor={COLORS.grayDark}
                keyboardType="decimal-pad"
                value={readingForm.value}
                onChangeText={(text) => setReadingForm({ ...readingForm, value: text })}
              />
              <View style={styles.unitDisplay}>
                <Text style={styles.unitText}>{readingForm.unit}</Text>
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.notesInput]}
              placeholder="Add any notes about this reading"
              placeholderTextColor={COLORS.grayDark}
              value={readingForm.notes}
              onChangeText={(text) => setReadingForm({ ...readingForm, notes: text })}
              multiline
            />

            <TouchableOpacity style={styles.submitButton} onPress={submitReading}>
              <Text style={styles.submitButtonText}>
                Save {readingForm.reading_phase} Reading
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={captureDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={captureDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.navyLight,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  cameraButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  equipmentHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  equipmentIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  equipmentName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  typeBadge: {
    backgroundColor: COLORS.lime + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.lime,
  },
  detailsCard: {
    backgroundColor: COLORS.navyLight,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.grayDark,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.grayDark,
    marginBottom: 14,
  },
  readingsSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.grayDark,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.lime,
  },
  readingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  readingBtn: {
    width: '48%',
    backgroundColor: COLORS.navyLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  readingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 10,
    textAlign: 'center',
  },
  readingBtnUnit: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginTop: 2,
  },
  phaseFilter: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  phaseTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  phaseTabActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  phaseTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  phaseTabTextActive: {
    color: COLORS.navy,
  },
  readingCard: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  readingType: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  readingTime: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginBottom: 4,
  },
  readingNotes: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  readingValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  readingValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.lime,
  },
  readingUnit: {
    fontSize: 13,
    color: COLORS.gray,
  },
  serviceCard: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTypeBadge: {
    backgroundColor: COLORS.lime + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.lime,
  },
  serviceDate: {
    fontSize: 12,
    color: COLORS.grayDark,
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.gray,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.navyLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.grayDark,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.navyLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  phaseSelection: {
    marginBottom: 16,
  },
  phaseButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  phaseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d4a6f',
  },
  phaseButtonActivePre: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  phaseButtonActivePost: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  phaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
  },
  phaseButtonTextActive: {
    color: COLORS.white,
  },
  dateTimeSection: {
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  valueInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
  },
  unitDisplay: {
    backgroundColor: COLORS.lime + '20',
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.lime,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: COLORS.lime,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
});
