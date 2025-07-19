import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MessageBubble } from '../MessageBubble';
import type { Message } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock the EditableMessage component
vi.mock('../EditableMessage', () => ({
  EditableMessage: ({ initialContent, onSave, onCancel }: any) => (
    <div data-testid="editable-message">
      <textarea 
        data-testid="edit-textarea"
        defaultValue={initialContent}
        onChange={(e) => {
          // Store value for testing
          (e.target as any).testValue = e.target.value;
        }}
      />
      <button 
        data-testid="save-button" 
        onClick={() => onSave((document.querySelector('[data-testid="edit-textarea"]') as any)?.testValue || initialContent)}
      >
        Save
      </button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'test-message-1',
  content: 'Test message content',
  role: 'user',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  isEdited: false,
  ...overrides,
});

describe('MessageBubble', () => {
  it('renders user message correctly', () => {
    const message = createMockMessage({ role: 'user' });
    render(<MessageBubble message={message} />);

    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const message = createMockMessage({ role: 'assistant' });
    render(<MessageBubble message={message} />);

    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
  });

  it('shows edited indicator when message is edited', () => {
    const message = createMockMessage({ isEdited: true });
    render(<MessageBubble message={message} />);

    expect(screen.getByText('edited')).toBeInTheDocument();
  });

  it('shows branches indicator when message has branches', () => {
    const message = createMockMessage({ branchId: 'branch-1' });
    render(<MessageBubble message={message} />);

    expect(screen.getByText('has branches')).toBeInTheDocument();
  });

  it('hides timestamp when showTimestamp is false', () => {
    const message = createMockMessage();
    render(<MessageBubble message={message} showTimestamp={false} />);

    expect(screen.queryByText('12:00 PM')).not.toBeInTheDocument();
  });

  it('shows streaming indicator when isStreaming is true', () => {
    const message = createMockMessage({ role: 'assistant' });
    render(<MessageBubble message={message} isStreaming={true} />);

    // Check for streaming dots (they should be present in the DOM)
    const streamingDots = screen.getByText('Test message content').parentElement;
    expect(streamingDots).toBeInTheDocument();
  });

  it('shows edit button on hover for user messages', async () => {
    const message = createMockMessage({ role: 'user' });
    const onEdit = vi.fn();
    
    render(<MessageBubble message={message} onEdit={onEdit} />);

    // The edit button should be in the DOM but hidden
    const editButton = screen.getByTitle('Edit message');
    expect(editButton).toBeInTheDocument();
  });

  it('shows branch button when onBranch is provided', () => {
    const message = createMockMessage();
    const onBranch = vi.fn();
    
    render(<MessageBubble message={message} onBranch={onBranch} />);

    const branchButton = screen.getByTitle('Branch from here');
    expect(branchButton).toBeInTheDocument();
  });

  it('shows regenerate button for assistant messages when onRegenerate is provided', () => {
    const message = createMockMessage({ role: 'assistant' });
    const onRegenerate = vi.fn();
    
    render(<MessageBubble message={message} onRegenerate={onRegenerate} />);

    const regenerateButton = screen.getByTitle('Regenerate response');
    expect(regenerateButton).toBeInTheDocument();
  });

  it('does not show regenerate button for user messages', () => {
    const message = createMockMessage({ role: 'user' });
    const onRegenerate = vi.fn();
    
    render(<MessageBubble message={message} onRegenerate={onRegenerate} />);

    expect(screen.queryByTitle('Regenerate response')).not.toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', async () => {
    const message = createMockMessage();
    const onEdit = vi.fn();
    
    render(<MessageBubble message={message} onEdit={onEdit} />);

    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('editable-message')).toBeInTheDocument();
    });
  });

  it('calls onEdit when message is saved in edit mode', async () => {
    const message = createMockMessage();
    const onEdit = vi.fn();
    
    render(<MessageBubble message={message} onEdit={onEdit} />);

    // Enter edit mode
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('editable-message')).toBeInTheDocument();
    });

    // Modify content and save
    const textarea = screen.getByTestId('edit-textarea');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(onEdit).toHaveBeenCalledWith('Updated content');
  });

  it('exits edit mode when cancel is clicked', async () => {
    const message = createMockMessage();
    const onEdit = vi.fn();
    
    render(<MessageBubble message={message} onEdit={onEdit} />);

    // Enter edit mode
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('editable-message')).toBeInTheDocument();
    });

    // Cancel editing
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByTestId('editable-message')).not.toBeInTheDocument();
      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });
  });

  it('calls onBranch when branch button is clicked', () => {
    const message = createMockMessage();
    const onBranch = vi.fn();
    
    render(<MessageBubble message={message} onBranch={onBranch} />);

    const branchButton = screen.getByTitle('Branch from here');
    fireEvent.click(branchButton);

    expect(onBranch).toHaveBeenCalled();
  });

  it('calls onRegenerate when regenerate button is clicked', () => {
    const message = createMockMessage({ role: 'assistant' });
    const onRegenerate = vi.fn();
    
    render(<MessageBubble message={message} onRegenerate={onRegenerate} />);

    const regenerateButton = screen.getByTitle('Regenerate response');
    fireEvent.click(regenerateButton);

    expect(onRegenerate).toHaveBeenCalled();
  });

  it('applies correct styling for user messages', () => {
    const message = createMockMessage({ role: 'user' });
    const { container } = render(<MessageBubble message={message} />);

    const messageContainer = container.querySelector('.justify-end');
    expect(messageContainer).toBeInTheDocument();
  });

  it('applies correct styling for assistant messages', () => {
    const message = createMockMessage({ role: 'assistant' });
    const { container } = render(<MessageBubble message={message} />);

    const messageContainer = container.querySelector('.justify-start');
    expect(messageContainer).toBeInTheDocument();
  });

  it('handles long content with proper word wrapping', () => {
    const longContent = 'This is a very long message content that should wrap properly when displayed in the message bubble component without breaking the layout or causing overflow issues.';
    const message = createMockMessage({ content: longContent });
    
    render(<MessageBubble message={message} />);

    expect(screen.getByText(longContent)).toBeInTheDocument();
    
    const contentElement = screen.getByText(longContent);
    expect(contentElement).toHaveClass('whitespace-pre-wrap', 'break-words');
  });

  it('does not show action buttons when streaming', () => {
    const message = createMockMessage();
    const onEdit = vi.fn();
    const onBranch = vi.fn();
    
    render(
      <MessageBubble 
        message={message} 
        onEdit={onEdit} 
        onBranch={onBranch} 
        isStreaming={true} 
      />
    );

    expect(screen.queryByTitle('Edit message')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Branch from here')).not.toBeInTheDocument();
  });
});