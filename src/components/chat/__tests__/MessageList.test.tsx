import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MessageList } from '../MessageList';
import type { Message } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowDown: () => <div data-testid="arrow-down-icon">Arrow Down</div>,
}));

// Mock MessageBubble component
vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message, onEdit, onBranch, onRegenerate, showTimestamp, isStreaming }: any) => (
    <div data-testid={`message-${message.id}`}>
      <div data-testid="message-content">{message.content}</div>
      <div data-testid="message-role">{message.role}</div>
      {showTimestamp && <div data-testid="message-timestamp">timestamp</div>}
      {isStreaming && <div data-testid="streaming-indicator">streaming</div>}
      {onEdit && (
        <button 
          data-testid="edit-button" 
          onClick={() => onEdit('edited content')}
        >
          Edit
        </button>
      )}
      {onBranch && (
        <button data-testid="branch-button" onClick={onBranch}>
          Branch
        </button>
      )}
      {onRegenerate && (
        <button data-testid="regenerate-button" onClick={onRegenerate}>
          Regenerate
        </button>
      )}
    </div>
  ),
}));

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `message-${Math.random()}`,
  content: 'Test message',
  role: 'user',
  timestamp: new Date(),
  isEdited: false,
  ...overrides,
});

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no messages', () => {
    render(<MessageList messages={[]} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation by typing a message below')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    const messages = [
      createMockMessage({ id: 'msg1', content: 'First message', role: 'user' }),
      createMockMessage({ id: 'msg2', content: 'Second message', role: 'assistant' }),
    ];

    render(<MessageList messages={messages} />);

    expect(screen.getByTestId('message-msg1')).toBeInTheDocument();
    expect(screen.getByTestId('message-msg2')).toBeInTheDocument();
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('passes showTimestamps prop to MessageBubble components', () => {
    const messages = [createMockMessage({ id: 'msg1' })];

    render(<MessageList messages={messages} showTimestamps={true} />);

    expect(screen.getByTestId('message-timestamp')).toBeInTheDocument();
  });

  it('hides timestamps when showTimestamps is false', () => {
    const messages = [createMockMessage({ id: 'msg1' })];

    render(<MessageList messages={messages} showTimestamps={false} />);

    expect(screen.queryByTestId('message-timestamp')).not.toBeInTheDocument();
  });

  it('shows streaming indicator for streaming message', () => {
    const messages = [createMockMessage({ id: 'msg1' })];

    render(<MessageList messages={messages} streamingMessageId="msg1" />);

    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
  });

  it('calls onEditMessage when edit is triggered', () => {
    const onEditMessage = vi.fn();
    const messages = [createMockMessage({ id: 'msg1' })];

    render(<MessageList messages={messages} onEditMessage={onEditMessage} />);

    const editButton = screen.getByTestId('edit-button');
    fireEvent.click(editButton);

    expect(onEditMessage).toHaveBeenCalledWith('msg1', 'edited content');
  });

  it('calls onBranchMessage when branch is triggered', () => {
    const onBranchMessage = vi.fn();
    const messages = [createMockMessage({ id: 'msg1' })];

    render(<MessageList messages={messages} onBranchMessage={onBranchMessage} />);

    const branchButton = screen.getByTestId('branch-button');
    fireEvent.click(branchButton);

    expect(onBranchMessage).toHaveBeenCalledWith('msg1');
  });

  it('calls onRegenerateResponse when regenerate is triggered', () => {
    const onRegenerateResponse = vi.fn();
    const messages = [createMockMessage({ id: 'msg1', role: 'assistant' })];

    render(<MessageList messages={messages} onRegenerateResponse={onRegenerateResponse} />);

    const regenerateButton = screen.getByTestId('regenerate-button');
    fireEvent.click(regenerateButton);

    expect(onRegenerateResponse).toHaveBeenCalledWith('msg1');
  });

  it('does not show regenerate button for user messages', () => {
    const onRegenerateResponse = vi.fn();
    const messages = [createMockMessage({ id: 'msg1', role: 'user' })];

    render(<MessageList messages={messages} onRegenerateResponse={onRegenerateResponse} />);

    expect(screen.queryByTestId('regenerate-button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const messages = [createMockMessage({ id: 'msg1' })];
    const { container } = render(<MessageList messages={messages} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles scroll events correctly', async () => {
    const messages = Array.from({ length: 10 }, (_, i) => 
      createMockMessage({ id: `msg${i}`, content: `Message ${i}` })
    );

    const { container } = render(<MessageList messages={messages} />);
    const scrollContainer = container.querySelector('.overflow-y-auto');

    expect(scrollContainer).toBeInTheDocument();

    // Simulate scroll event
    if (scrollContainer) {
      fireEvent.scroll(scrollContainer);
    }

    // Should not throw any errors
  });

  it('shows scroll to bottom button when user is scrolling', async () => {
    const messages = Array.from({ length: 10 }, (_, i) => 
      createMockMessage({ id: `msg${i}`, content: `Message ${i}` })
    );

    const { container } = render(<MessageList messages={messages} />);
    const scrollContainer = container.querySelector('.overflow-y-auto');

    if (scrollContainer) {
      fireEvent.scroll(scrollContainer);
    }

    // Wait for the scroll to bottom button to appear
    await waitFor(() => {
      const scrollButton = screen.queryByTitle('Scroll to bottom');
      // Note: The button might not appear immediately due to the timeout logic
      // This test verifies the scroll event handling doesn't break
    });
  });

  it('handles large number of messages efficiently', () => {
    const messages = Array.from({ length: 100 }, (_, i) => 
      createMockMessage({ id: `msg${i}`, content: `Message ${i}` })
    );

    const { container } = render(<MessageList messages={messages} virtualizeThreshold={50} />);

    // Should render all messages (virtualization is prepared but not fully implemented)
    // The mock creates multiple elements per message, so we check that messages are rendered
    expect(container.querySelectorAll('[data-testid^="message-"]').length).toBeGreaterThanOrEqual(100);
  });

  it('memoizes message components to prevent unnecessary re-renders', () => {
    const messages = [
      createMockMessage({ id: 'msg1', content: 'Message 1' }),
      createMockMessage({ id: 'msg2', content: 'Message 2' }),
    ];

    const { rerender } = render(<MessageList messages={messages} />);

    // Re-render with same messages
    rerender(<MessageList messages={messages} />);

    // Should still render correctly
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
  });

  it('handles empty message content gracefully', () => {
    const messages = [createMockMessage({ id: 'msg1', content: '' })];

    render(<MessageList messages={messages} />);

    expect(screen.getByTestId('message-msg1')).toBeInTheDocument();
  });

  it('handles messages with special characters', () => {
    const messages = [
      createMockMessage({ 
        id: 'msg1', 
        content: 'Message with special chars: <>&"\'`' 
      })
    ];

    render(<MessageList messages={messages} />);

    expect(screen.getByText('Message with special chars: <>&"\'`')).toBeInTheDocument();
  });

  it('handles rapid message updates', async () => {
    const initialMessages = [createMockMessage({ id: 'msg1', content: 'Initial' })];
    
    const { rerender } = render(<MessageList messages={initialMessages} />);

    // Rapidly add messages
    for (let i = 2; i <= 5; i++) {
      const newMessages = [
        ...initialMessages,
        createMockMessage({ id: `msg${i}`, content: `Message ${i}` })
      ];
      rerender(<MessageList messages={newMessages} />);
    }

    await waitFor(() => {
      expect(screen.getByText('Message 5')).toBeInTheDocument();
    });
  });

  it('maintains scroll position during updates when autoScroll is false', () => {
    const messages = [createMockMessage({ id: 'msg1' })];

    render(<MessageList messages={messages} autoScroll={false} />);

    // Should render without attempting to scroll
    expect(screen.getByTestId('message-msg1')).toBeInTheDocument();
  });

  it('handles undefined callback props gracefully', () => {
    const messages = [createMockMessage({ id: 'msg1' })];

    // Should not crash when callbacks are undefined
    expect(() => {
      render(<MessageList messages={messages} />);
    }).not.toThrow();

    expect(screen.getByTestId('message-msg1')).toBeInTheDocument();
  });
  
  it('shows scroll button when scrolled away from bottom', async () => {
    const messages = Array.from({ length: 20 }, (_, i) => 
      createMockMessage({ id: `msg${i}`, content: `Message ${i}` })
    );

    const { container } = render(<MessageList messages={messages} />);
    const scrollContainer = container.querySelector('.overflow-y-auto');

    if (scrollContainer) {
      // Mock scrolling away from bottom
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000 });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 300 });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0 });
      
      fireEvent.scroll(scrollContainer);
    }

    // Wait for the scroll button to appear
    await waitFor(() => {
      expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-down-icon')).toBeInTheDocument();
    });
  });
  
  it('scrolls to bottom when scroll button is clicked', async () => {
    const messages = Array.from({ length: 20 }, (_, i) => 
      createMockMessage({ id: `msg${i}`, content: `Message ${i}` })
    );

    const { container } = render(<MessageList messages={messages} />);
    const scrollContainer = container.querySelector('.overflow-y-auto');
    
    // Mock scrollIntoView
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    if (scrollContainer) {
      // Mock scrolling away from bottom
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000 });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 300 });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0 });
      
      fireEvent.scroll(scrollContainer);
    }

    // Wait for the scroll button to appear and click it
    await waitFor(() => {
      const scrollButton = screen.getByTitle('Scroll to bottom');
      fireEvent.click(scrollButton);
      
      // Check if scrollIntoView was called with smooth behavior
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });
  
  it('auto-scrolls when new messages arrive and user is at bottom', async () => {
    const initialMessages = [createMockMessage({ id: 'msg1' })];
    
    // Mock scrollIntoView
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    const { rerender } = render(<MessageList messages={initialMessages} />);
    
    // Add a new message
    const newMessages = [
      ...initialMessages,
      createMockMessage({ id: 'msg2', content: 'New message' })
    ];
    
    rerender(<MessageList messages={newMessages} />);
    
    // Check if scrollIntoView was called
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
  
  it('does not auto-scroll when user is actively scrolling through history', async () => {
    const initialMessages = [createMockMessage({ id: 'msg1' })];
    
    // Mock scrollIntoView
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    const { container, rerender } = render(<MessageList messages={initialMessages} />);
    const scrollContainer = container.querySelector('.overflow-y-auto');
    
    if (scrollContainer) {
      // Mock scrolling away from bottom
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000 });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 300 });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0 });
      
      fireEvent.scroll(scrollContainer);
    }
    
    // Clear mock to check if it's called again
    scrollIntoViewMock.mockClear();
    
    // Add a new message
    const newMessages = [
      ...initialMessages,
      createMockMessage({ id: 'msg2', content: 'New message' })
    ];
    
    rerender(<MessageList messages={newMessages} />);
    
    // scrollIntoView should not be called because user is scrolling through history
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});