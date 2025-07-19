import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatInput } from '../ChatInput';
import { useChatStore } from '@/stores/useChatStore';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the Zustand store
vi.mock('@/stores/useChatStore', () => ({
  useChatStore: vi.fn()
}));

describe('ChatInput', () => {
  // Setup default mock values for the store
  beforeEach(() => {
    (useChatStore as any).mockImplementation((selector) => 
      selector({
        isStreaming: false,
        currentChatId: 'test-chat-id'
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByTitle('Send message')).toBeInTheDocument();
    expect(screen.getByTitle('Attach file')).toBeInTheDocument();
    expect(screen.getByText(/press/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl/i)).toBeInTheDocument();
    expect(screen.getByText(/enter/i)).toBeInTheDocument();
  });

  it('disables input when isDisabled prop is true', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} isDisabled={true} />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByTitle('Send message')).toBeDisabled();
    expect(screen.getByTitle('Attach file')).toBeDisabled();
  });

  it('disables input when isLoading prop is true', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} isLoading={true} />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByTitle('Send message')).toBeDisabled();
    expect(screen.getByTitle('Attach file')).toBeDisabled();
  });

  it('disables input when store isStreaming is true', () => {
    // Mock the store to return isStreaming as true
    (useChatStore as any).mockImplementation((selector) => 
      selector({
        isStreaming: true,
        currentChatId: 'test-chat-id'
      })
    );
    
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByTitle('Send message')).toBeDisabled();
    expect(screen.getByTitle('Attach file')).toBeDisabled();
  });

  it('disables input when no chatId is provided and no currentChatId in store', () => {
    // Mock the store to return no currentChatId
    (useChatStore as any).mockImplementation((selector) => 
      selector({
        isStreaming: false,
        currentChatId: null
      })
    );
    
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByTitle('Send message')).toBeDisabled();
    expect(screen.getByTitle('Attach file')).toBeDisabled();
  });

  it('enables input when chatId prop is provided even if no currentChatId in store', () => {
    // Mock the store to return no currentChatId
    (useChatStore as any).mockImplementation((selector) => 
      selector({
        isStreaming: false,
        currentChatId: null
      })
    );
    
    const onSendMessage = vi.fn();
    render(<ChatInput chatId="explicit-chat-id" onSendMessage={onSendMessage} />);
    
    expect(screen.getByRole('textbox')).not.toBeDisabled();
    expect(screen.getByTitle('Attach file')).not.toBeDisabled();
    // Send button is still disabled because there's no text input
    expect(screen.getByTitle('Send message')).toBeDisabled();
  });

  it('calls onSendMessage when send button is clicked', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello, world!' } });
    
    const sendButton = screen.getByTitle('Send message');
    expect(sendButton).not.toBeDisabled();
    
    fireEvent.click(sendButton);
    
    expect(onSendMessage).toHaveBeenCalledWith('Hello, world!');
    expect(input).toHaveValue(''); // Input should be cleared after sending
  });

  it('calls onSendMessage when Ctrl+Enter is pressed', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello, world!' } });
    
    // Simulate Ctrl+Enter
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    
    expect(onSendMessage).toHaveBeenCalledWith('Hello, world!');
    expect(input).toHaveValue(''); // Input should be cleared after sending
  });

  it('calls onSendMessage when Cmd+Enter is pressed', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello, world!' } });
    
    // Simulate Cmd+Enter (metaKey is for Mac)
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    
    expect(onSendMessage).toHaveBeenCalledWith('Hello, world!');
    expect(input).toHaveValue(''); // Input should be cleared after sending
  });

  it('does not call onSendMessage when input is empty', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    const sendButton = screen.getByTitle('Send message');
    expect(sendButton).toBeDisabled();
    
    fireEvent.click(sendButton);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('does not call onSendMessage when input contains only whitespace', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    
    const sendButton = screen.getByTitle('Send message');
    expect(sendButton).toBeDisabled();
    
    fireEvent.click(sendButton);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('renders prompt library button when onOpenPromptLibrary is provided', () => {
    const onSendMessage = vi.fn();
    const onOpenPromptLibrary = vi.fn();
    render(
      <ChatInput 
        onSendMessage={onSendMessage} 
        onOpenPromptLibrary={onOpenPromptLibrary} 
      />
    );
    
    expect(screen.getByTitle('Open prompt library')).toBeInTheDocument();
  });

  it('calls onOpenPromptLibrary when prompt library button is clicked', () => {
    const onSendMessage = vi.fn();
    const onOpenPromptLibrary = vi.fn();
    render(
      <ChatInput 
        onSendMessage={onSendMessage} 
        onOpenPromptLibrary={onOpenPromptLibrary} 
      />
    );
    
    const promptLibraryButton = screen.getByTitle('Open prompt library');
    fireEvent.click(promptLibraryButton);
    
    expect(onOpenPromptLibrary).toHaveBeenCalled();
  });

  it('shows loading spinner when isLoading is true', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} isLoading={true} />);
    
    // Check for the SVG that represents the loading spinner
    const loadingSpinner = screen.getByTitle('Send message').querySelector('svg circle');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('autofocuses the textarea when autoFocus is true', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} autoFocus={true} />);
    
    // In a real browser, this would focus the element
    // In tests, we can check if the focus event was triggered
    const textarea = screen.getByRole('textbox');
    expect(document.activeElement).toBe(textarea);
  });
});