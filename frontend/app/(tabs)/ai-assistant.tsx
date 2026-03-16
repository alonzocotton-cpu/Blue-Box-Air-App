import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Blue Box Air colors
const COLORS = {
  navy: '#0f2744',
  navyLight: '#1a365d',
  navyMid: '#1e3a5f',
  lime: '#c5d93d',
  white: '#ffffff',
  gray: '#94a3b8',
  grayDark: '#64748b',
  blue: '#3b82f6',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: 'construct-outline', label: 'Troubleshoot', prompt: 'I need help troubleshooting an equipment issue.' },
  { icon: 'analytics-outline', label: 'Reading Help', prompt: 'How do I interpret differential pressure readings?' },
  { icon: 'water-outline', label: 'Coil Cleaning', prompt: 'What are the best practices for coil cleaning?' },
  { icon: 'shield-checkmark-outline', label: 'Safety', prompt: 'What safety precautions should I follow on-site?' },
];

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Add welcome message on mount
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: "Welcome to Blue Box Air AI Assistant! I can help you with equipment troubleshooting, coil management best practices, reading interpretation, and more. How can I assist you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (data.session_id) {
        setSessionId(data.session_id);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the AI service. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([
      {
        id: 'welcome-new',
        role: 'system',
        content: "New conversation started! How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.aiAvatarSmall}>
            <Ionicons name="sparkles" size={16} color={COLORS.lime} />
          </View>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color={COLORS.lime} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderQuickPrompts = () => {
    if (messages.length > 1) return null;

    return (
      <View style={styles.quickPromptsContainer}>
        <Text style={styles.quickPromptsTitle}>Quick Actions</Text>
        <View style={styles.quickPromptsGrid}>
          {QUICK_PROMPTS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickPromptCard}
              onPress={() => sendMessage(item.prompt)}
              activeOpacity={0.7}
            >
              <View style={styles.quickPromptIcon}>
                <Ionicons name={item.icon as any} size={24} color={COLORS.lime} />
              </View>
              <Text style={styles.quickPromptLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={24} color={COLORS.lime} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSubtitle}>Powered by Claude AI</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newChatBtn} onPress={startNewSession}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.lime} />
          <Text style={styles.newChatText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderQuickPrompts}
          onContentSizeChange={() => {
            if (messages.length > 1) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={18} color={COLORS.lime} />
            </View>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={COLORS.lime} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask about equipment, readings, procedures..."
              placeholderTextColor={COLORS.grayDark}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isLoading ? COLORS.navy : COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.poweredBy}>Blue Box Air, Inc. • Coil Management Solutions</Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.navyLight,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a6f',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginTop: 1,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lime + '40',
  },
  newChatText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.lime,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  // Quick prompts
  quickPromptsContainer: {
    paddingVertical: 20,
  },
  quickPromptsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickPromptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  quickPromptCard: {
    width: '47%',
    backgroundColor: COLORS.navyLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  quickPromptIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickPromptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  // Messages
  systemMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    gap: 8,
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  systemBubble: {
    flex: 1,
    backgroundColor: COLORS.navyMid,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.lime + '20',
  },
  systemText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 14,
  },
  userBubble: {
    backgroundColor: COLORS.lime,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.navyLight,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  messageText: {
    fontSize: 15,
    color: COLORS.white,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.navy,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.grayDark,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: COLORS.navy + '80',
  },
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.navyLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  // Input
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.navyLight,
    borderTopWidth: 1,
    borderTopColor: '#2d4a6f',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d4a6f',
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.white,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.navyMid,
  },
  poweredBy: {
    fontSize: 10,
    color: COLORS.grayDark,
    textAlign: 'center',
    marginTop: 8,
  },
});
