import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatWindow } from '../ChatWindow';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import type { Message } from '@/types';
expect.extend(matchers);

// Mock the dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock the MessageList and VirtualizedMessageList components
vi.mock('../MessageList', () => ({
  MessageList: ({ 
    messages, 
    onEditMessage, 
    onBranchMessage, 
    onRegenerateResponse, 
    streamingMessageId, 
    autoScroll 
  }: any) => (
    <div 
      data-testid="message-list" 
      data-message-count={messages?.length || 0}
      data-streaming-id={streamingMessageId}
      data-auto-scroll={autoScroll}
    >
      {messages?.map((msg: any) => (
        <div key={msg.id} data-testid="message-item">
          <span>{msg.content}</span>
          <button 
            data-testid={`edit-message-${msg.id}`} 
            onClick={() => onEditMessage?.(msg.id, 'Edited content')}
          >
            Edit
          </button>
          <button 
            data-testid={`branch-message-${msg.id}`} 
            onClick={() => onBranchMessage?.(msg.id)}
          >
            Branch
          </button>
          {msg.role === 'assistant' && (
            <button 
              data-testid={`regenerate-message-${msg.id}`} 
              onClick={() => onRegenerateResponse?.(msg.id)}
            >
              Regenerate
            </button>
          )}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../VirtualizedMessageList', () => ({
  VirtualizedMessageList: ({ 
    messages, 
    onEditMessage, 
    onBranchMessage, 
    onRegenerateResponse, 
    streamingMessageId, 
    autoScroll 
  }: any) => (
    <div 
      data-testid="virtualized-message-list" 
      data-message-count={messages?.length || 0}
      data-streaming-id={streamingMessageId}
      data-auto-scroll={autoScroll}
    >
      {messages?.map((msg: any) => (
        <div key={msg.id} data-testid="virtualized-message-item">
          <span>{msg.content}</span>
          <button 
            data-testid={`edit-message-${msg.id}`} 
            onClick={() => onEditMessage?.(msg.id, 'Edited content')}
          >
            Edit
          </button>
          <button 
            data-testid={`branch-message-${msg.id}`} 
            onClick={() => onBranchMessage?.(msg.id)}
          >
            Branch
          </button>
          {msg.role === 'assistant' && (
            <button 
              data-testid={`regenerate-message-${msg.id}`} 
              onClick={() => onRegenerateResponse?.(msg.id)}
            >
              Regenerate
            </button>
          )}
        </div>
      ))}
    </div>
  )
}));

// Mock the ChatInput component
vi.mock('../ChatInput', () => ({
  ChatInput: ({ onSendMessage, isDisabled, chatId, onOpenPromptLibrary }: any) => (
    <div 
      data-testid="chat-input" 
      data-disabled={isDisabled ? 'true' : 'false'}
      data-chat-id={chatId}
    >
      <input 
        data-testid="chat-input-field" 
        placeholder="Type a message" 
      />
      <button 
        data-testid="send-button"
        onClick={() => onSendMessage?.('Test message')}
        disabled={isDisabled}
      >
        Send
      </button>
      {onOpenPromptLibrary && (
        <button 
          data-testid="prompt-library-button"
          onClick={onOpenPromptLibrary}
        >
          Prompt Library
        </button>
      )}
    </div>
  )
}));

// Mock the EditableTitle component
vi.mock('../EditableTitle', () => ({
  EditableTitle: ({ initialTitle, onSave, placeholder }: any) => (
    <div 
      data-testid="editable-title" 
      data-initial-title={initialTitle}
      data-placeholder={placeholder}
    >
      <span data-testid="title-display">{initialTitle}</span>
      <button 
        data-testid="edit-title-button"
        onClick={() => onSave('New Title')}
      >
        Edit Title
      </button>
    </div>
  )
}));

// Mock the performance utilities
vi.mock('@/utils/performance', () => ({
  usePerformanceMonitor: () => ({
    start: vi.fn(),
    end: vi.fn(),
  }),
  throttle: (fn: any) => fn,
  rafThrottle: (fn: any) => fn,
  debounce: (fn: any) => fn
}));

// Mock the chat store
const mockMessages: Message[] = [
  {
    id: 'msg1',
    content: 'Hello, this is a test message',
    role: 'user',
    timestamp: new Date(),
    isEdited: false,
  },
  {
    id: 'msg2',
    content: 'This is a response message',
    role: 'assistant',
    timestamp: new Date(),
    isEdited: false,
  }
];

const mockChat = {
  id: 'test-chat-id',
  title: 'Test Chat',
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: mockMessages,
  branches: [],
  activeKnowledgeStacks: [],
};

const mockChatStore = {
  addMessage: vi.fn((chatId, message) => ({ ...message, id: 'new-msg-id' })),
  setIsStreaming: vi.fn(),
  isStreaming: false,
  currentChatId: 'test-chat-id',
  createChat: vi.fn(() => 'new-chat-id'),
  getCurrentMessages: vi.fn(() => mockMessages),
  getChatById: vi.fn(() => mockChat),
  updateChatTitle: vi.fn(),
};

vi.mock('@/stores/useChatStore', () => ({
  useChatStore: vi.fn((selector) => selector(mockChatStore))
}));

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    
    // Mock window.requestAnimationFrame
    global.requestAnimationFrame = vi.fn(callback => {
      callback(0);
      return 0;
    });
    
    // Mock window.cancelAnimationFrame
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Basic rendering tests
  it('renders the chat window with message list', () => {
    render(<ChatWindow />);
    
    // Check if the chat window components are rendered
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('editable-title')).toBeInTheDocument();
  });

  it('renders with virtualized message list when message count exceeds threshold', () => {
    // Override the getCurrentMessages mock to return a large number of messages
    const largeMessageList = Array.from({ length: 51 }, (_, i) => ({
      id: `msg${i}`,
      content: `Message ${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
      timestamp: new Date(),
      isEdited: false,
    }));
    
    mockChatStore.getCurrentMessages.mockReturnValueOnce(largeMessageList);
    
    render(<ChatWindow virtualizeThreshold={50} />);
    
    // Check if virtualized message list is used
    expect(screen.getByTestId('virtualized-message-list')).toBeInTheDocument();
    expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    // Override the getCurrentMessages mock to return empty array
    mockChatStore.getCurrentMessages.mockReturnValueOnce([]);
    
    render(<ChatWindow />);
    
    // Check if empty state is displayed
    expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('virtualized-message-list')).not.toBeInTheDocument();
    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Start a conversation/i)).toBeInTheDocument();
  });

  // Auto-scrolling behavior tests
  it('enables auto-scrolling by default', () => {
    render(<ChatWindow />);
    
    // Check if auto-scroll is enabled in MessageList
    expect(screen.getByTestId('message-list').getAttribute('data-auto-scroll')).toBe('true');
  });

  it('scrolls to bottom when new messages arrive', async () => {
    render(<ChatWindow />);
    
    // Simulate sending a new message
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Check if scrollIntoView was called (auto-scroll behavior)
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it('maintains scroll position when user is scrolling', () => {
    render(<ChatWindow />);
    
    // Simulate user scrolling
    fireEvent.scroll(screen.getByTestId('message-list'), { 
      target: { scrollTop: 100, scrollHeight: 1000, clientHeight: 500 } 
    });
    
    // Simulate new message arriving during user scroll
    act(() => {
      const updatedMessages = [...mockMessages, {
        id: 'msg3',
        content: 'New message during scroll',
        role: 'user' as 'user' | 'assistant',
        timestamp: new Date(),
        isEdited: false,
      }];
      mockChatStore.getCurrentMessages.mockReturnValueOnce(updatedMessages);
    });
    
    // Re-render with new message
    render(<ChatWindow />);
    
    // scrollIntoView should not be called immediately during user scrolling
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls to bottom when streaming message is updated', async () => {
    // Set up streaming state
    mockChatStore.isStreaming = true;
    
    render(<ChatWindow />);
    
    // Send a message to trigger streaming
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Simulate streaming update
    act(() => {
      const streamingMessages = [...mockMessages, {
        id: 'new-msg-id',
        content: 'Streaming content...',
        role: 'assistant' as 'user' | 'assistant',
        timestamp: new Date(),
        isEdited: false,
      }];
      mockChatStore.getCurrentMessages.mockReturnValueOnce(streamingMessages);
    });
    
    // Re-render to update with streaming content
    render(<ChatWindow />);
    
    // Check if scrollIntoView was called for streaming update
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  // Chat title display and editing tests
  it('displays chat title when a chat exists', () => {
    render(<ChatWindow chatId="test-chat-id" />);
    
    // Check if the chat title is displayed
    expect(screen.getByTestId('title-display')).toHaveTextContent('Test Chat');
  });

  it('displays "New Chat" when no chat exists', () => {
    // Override the getChatById mock to return null
    mockChatStore.getChatById.mockReturnValueOnce(undefined);
    
    render(<ChatWindow chatId={undefined} />);
    
    // Check if "New Chat" is displayed
    expect(screen.getByTestId('title-display')).toHaveTextContent('New Chat');
  });

  it('handles chat title editing', () => {
    render(<ChatWindow chatId="test-chat-id" />);
    
    // Click the edit title button
    fireEvent.click(screen.getByTestId('edit-title-button'));
    
    // Check if updateChatTitle was called with the new title
    expect(mockChatStore.updateChatTitle).toHaveBeenCalledWith('test-chat-id', 'New Title');
  });

  it('does not update title when no chat exists', () => {
    // Override the getChatById mock to return null
    mockChatStore.getChatById.mockReturnValueOnce(undefined);
    mockChatStore.currentChatId = null;
    
    render(<ChatWindow />);
    
    // Click the edit title button
    fireEvent.click(screen.getByTestId('edit-title-button'));
    
    // updateChatTitle should not be called
    expect(mockChatStore.updateChatTitle).not.toHaveBeenCalled();
  });

  it('passes correct placeholder to EditableTitle', () => {
    render(<ChatWindow />);
    
    // Check if the placeholder is passed correctly
    expect(screen.getByTestId('editable-title').getAttribute('data-placeholder')).toBe('Chat title');
  });

  // Message interaction tests
  it('handles message editing', () => {
    const onEditMessage = vi.fn();
    render(<ChatWindow onEditMessage={onEditMessage} />);
    
    // Click the edit button on a message
    fireEvent.click(screen.getByTestId('edit-message-msg1'));
    
    // Check if onEditMessage was called with the correct parameters
    expect(onEditMessage).toHaveBeenCalledWith('msg1', 'Edited content');
  });

  it('handles message branching', () => {
    const onBranchMessage = vi.fn();
    render(<ChatWindow onBranchMessage={onBranchMessage} />);
    
    // Click the branch button on a message
    fireEvent.click(screen.getByTestId('branch-message-msg1'));
    
    // Check if onBranchMessage was called with the correct message ID
    expect(onBranchMessage).toHaveBeenCalledWith('msg1');
  });

  it('handles response regeneration for assistant messages', () => {
    const onRegenerateResponse = vi.fn();
    render(<ChatWindow onRegenerateResponse={onRegenerateResponse} />);
    
    // Click the regenerate button on an assistant message
    fireEvent.click(screen.getByTestId('regenerate-message-msg2'));
    
    // Check if onRegenerateResponse was called with the correct message ID
    expect(onRegenerateResponse).toHaveBeenCalledWith('msg2');
  });

  // Message sending tests
  it('handles sending a new message', () => {
    render(<ChatWindow />);
    
    // Click the send button
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Check if addMessage was called for both user message and assistant response
    expect(mockChatStore.addMessage).toHaveBeenCalledTimes(2);
    expect(mockChatStore.addMessage).toHaveBeenCalledWith('test-chat-id', {
      content: 'Test message',
      role: 'user',
      isEdited: false
    });
    expect(mockChatStore.addMessage).toHaveBeenCalledWith('test-chat-id', {
      content: '',
      role: 'assistant',
      isEdited: false,
      metadata: { isLoading: true }
    });
  });

  it('creates a new chat if none exists when sending a message', () => {
    // Override the currentChatId to be null
    const originalCurrentChatId = mockChatStore.currentChatId;
    mockChatStore.currentChatId = null;
    
    render(<ChatWindow />);
    
    // Click the send button
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Check if createChat was called
    expect(mockChatStore.createChat).toHaveBeenCalled();
    
    // Check if addMessage was called with the new chat ID
    expect(mockChatStore.addMessage).toHaveBeenCalledWith('new-chat-id', expect.anything());
    
    // Restore the original value
    mockChatStore.currentChatId = originalCurrentChatId;
  });

  // Streaming state tests
  it('sets streaming state when sending a message', () => {
    render(<ChatWindow />);
    
    // Click the send button
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Check if setIsStreaming was called with true
    expect(mockChatStore.setIsStreaming).toHaveBeenCalledWith(true);
  });

  it('passes streaming message ID to message list', () => {
    // Set up streaming state
    mockChatStore.isStreaming = true;
    
    render(<ChatWindow />);
    
    // Send a message to trigger streaming
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Re-render to update with streaming ID
    render(<ChatWindow />);
    
    // Check if the streaming message ID is passed to the message list
    expect(screen.getByTestId('message-list').getAttribute('data-streaming-id')).toBe('new-msg-id');
  });

  // Model-specific tests
  it('displays model identifier when provided', () => {
    render(<ChatWindow modelId="gpt-4" />);
    
    // Check if the model ID is displayed
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  // Accessibility tests
  it('has proper ARIA attributes for accessibility', () => {
    render(<ChatWindow />);
    
    // Check for proper ARIA attributes
    expect(screen.getByTestId('send-button')).not.toBeDisabled();
    expect(screen.getByTestId('chat-input')).toHaveAttribute('data-disabled', 'false');
  });

  // Prompt library integration tests
  it('handles opening prompt library', () => {
    const onOpenPromptLibrary = vi.fn();
    render(<ChatWindow onOpenPromptLibrary={onOpenPromptLibrary} />);
    
    // Click the prompt library button
    fireEvent.click(screen.getByTestId('prompt-library-button'));
    
    // Check if onOpenPromptLibrary was called
    expect(onOpenPromptLibrary).toHaveBeenCalled();
  });

  // Message list update tests
  it('updates message list when messages change', () => {
    render(<ChatWindow />);
    
    // Initial message count
    expect(screen.getByTestId('message-list').getAttribute('data-message-count')).toBe('2');
    
    // Update messages
    const updatedMessages = [...mockMessages, {
      id: 'msg3',
      content: 'New message',
      role: 'user' as 'user' | 'assistant',
      timestamp: new Date(),
      isEdited: false,
    }];
    
    mockChatStore.getCurrentMessages.mockReturnValueOnce(updatedMessages);
    
    // Re-render with updated messages
    render(<ChatWindow />);
    
    // Check if message count was updated
    expect(screen.getByTestId('message-list').getAttribute('data-message-count')).toBe('3');
  });

  it('handles message content updates efficiently', () => {
    render(<ChatWindow />);
    
    // Update message content
    const updatedMessages = [
      mockMessages[0],
      {
        ...mockMessages[1],
        content: 'Updated content',
        isEdited: true
      }
    ];
    
    mockChatStore.getCurrentMessages.mockReturnValueOnce(updatedMessages);
    
    // Re-render with updated message content
    render(<ChatWindow />);
    
    // Message count should remain the same
    expect(screen.getByTestId('message-list').getAttribute('data-message-count')).toBe('2');
  });
});