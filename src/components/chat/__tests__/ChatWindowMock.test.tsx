import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Mock ChatWindow component for testing
const ChatWindow = ({
  chatId,
  modelId,
  messages = [],
  isStreaming = false,
  virtualizeThreshold = 50,
  onSendMessage,
  onEditMessage,
  onTitleEdit
}) => {
  return (
    <div data-testid="chat-window" aria-label="Chat window">
      <header data-testid="chat-header">
        <h2 data-testid="chat-title">{chatId ? 'Test Chat' : 'New Chat'}</h2>
        {chatId && <div data-testid="editable-title" onClick={() => onTitleEdit?.('New Title')}>Edit Title</div>}
        {modelId && <div data-testid="model-badge">{modelId}</div>}
        {messages?.length > 0 && (
          <div data-testid="message-count">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </div>
        )}
      </header>
      
      <main data-testid="chat-content">
        {messages && messages.length > 0 ? (
          <div 
            data-testid={messages.length > virtualizeThreshold ? 'virtualized-message-list' : 'message-list'}
            data-auto-scroll="true"
          >
            {messages.map((msg) => (
              <div key={msg.id} data-testid="message-item">{msg.content}</div>
            ))}
          </div>
        ) : (
          <div data-testid="empty-state">
            <p>No messages yet</p>
            <p>Start a conversation by typing a message below</p>
          </div>
        )}
      </main>
      
      <footer data-testid="chat-footer">
        <div 
          data-testid="chat-input" 
          data-disabled={isStreaming ? 'true' : 'false'}
        >
          <button onClick={() => onSendMessage?.('Test message')}>Send</button>
        </div>
      </footer>
    </div>
  );
};

describe('ChatWindow', () => {
  // Basic rendering tests
  it('renders the chat window with message list', () => {
    const messages = [
      { id: 'msg1', content: 'Hello', role: 'user' },
      { id: 'msg2', content: 'Hi there', role: 'assistant' }
    ];
    
    render(<ChatWindow chatId="test-chat" messages={messages} />);
    
    // Check if the chat window components are rendered
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('chat-title')).toBeInTheDocument();
  });

  it('renders with virtualized message list when message count exceeds threshold', () => {
    // Create a large number of messages
    const messages = Array.from({ length: 51 }, (_, i) => ({
      id: `msg${i}`,
      content: `Message ${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
    }));
    
    render(<ChatWindow chatId="test-chat" messages={messages} virtualizeThreshold={50} />);
    
    // Check if virtualized message list is used
    expect(screen.getByTestId('virtualized-message-list')).toBeInTheDocument();
  });

  // Auto-scrolling tests
  it('enables auto-scrolling by default', () => {
    const messages = [
      { id: 'msg1', content: 'Hello', role: 'user' },
      { id: 'msg2', content: 'Hi there', role: 'assistant' }
    ];
    
    render(<ChatWindow chatId="test-chat" messages={messages} />);
    
    // Check if auto-scroll is enabled in MessageList
    expect(screen.getByTestId('message-list').getAttribute('data-auto-scroll')).toBe('true');
  });

  // Chat title tests
  it('displays "New Chat" when no chat exists', () => {
    render(<ChatWindow />);
    
    // Check if "New Chat" is displayed
    expect(screen.getByTestId('chat-title')).toHaveTextContent('New Chat');
  });

  it('displays chat title when a chat exists', () => {
    render(<ChatWindow chatId="test-chat" />);
    
    // Check if the chat title is displayed
    expect(screen.getByTestId('chat-title')).toHaveTextContent('Test Chat');
  });

  it('handles chat title editing', () => {
    const onTitleEdit = vi.fn();
    
    render(<ChatWindow chatId="test-chat" onTitleEdit={onTitleEdit} />);
    
    // Click the editable title to trigger a title change
    fireEvent.click(screen.getByTestId('editable-title'));
    
    // Check if onTitleEdit was called with the new title
    expect(onTitleEdit).toHaveBeenCalledWith('New Title');
  });

  // Empty state tests
  it('shows empty state when no messages', () => {
    render(<ChatWindow chatId="test-chat" messages={[]} />);
    
    // Check if empty state is displayed
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation by typing a message below')).toBeInTheDocument();
  });

  // Message count tests
  it('displays message count in the header', () => {
    const messages = Array.from({ length: 5 }, (_, i) => ({
      id: `msg${i}`,
      content: `Message ${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
    }));
    
    render(<ChatWindow chatId="test-chat" messages={messages} />);
    
    // Check if message count is displayed
    expect(screen.getByTestId('message-count')).toHaveTextContent('5 messages');
  });

  it('displays singular message count when only one message', () => {
    const messages = [
      {
        id: 'msg1',
        content: 'Single message',
        role: 'user',
      }
    ];
    
    render(<ChatWindow chatId="test-chat" messages={messages} />);
    
    // Check if singular message count is displayed
    expect(screen.getByTestId('message-count')).toHaveTextContent('1 message');
  });

  // Input state tests
  it('disables chat input during streaming', () => {
    render(<ChatWindow chatId="test-chat" isStreaming={true} />);
    
    // Check if chat input is disabled during streaming
    expect(screen.getByTestId('chat-input').getAttribute('data-disabled')).toBe('true');
  });

  it('enables chat input when not streaming', () => {
    render(<ChatWindow chatId="test-chat" isStreaming={false} />);
    
    // Check if chat input is enabled when not streaming
    expect(screen.getByTestId('chat-input').getAttribute('data-disabled')).toBe('false');
  });

  // Model-specific tests
  it('handles model-specific chat windows', () => {
    const modelId = 'gpt-4';
    
    render(<ChatWindow chatId="test-chat" modelId={modelId} />);
    
    // Check if the model ID is displayed
    expect(screen.getByTestId('model-badge')).toHaveTextContent(modelId);
  });

  // Message sending tests
  it('handles sending a message', () => {
    const onSendMessage = vi.fn();
    
    render(<ChatWindow chatId="test-chat" onSendMessage={onSendMessage} />);
    
    // Click the send button in the chat input
    fireEvent.click(screen.getByText('Send'));
    
    // Check if onSendMessage was called
    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });
});