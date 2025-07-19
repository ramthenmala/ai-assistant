import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageHistoryModal } from '../MessageHistoryModal';
import type { Message, MessageVersion } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

describe('MessageHistoryModal', () => {
  let mockMessage: Message;
  let mockVersions: MessageVersion[];
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnRevertToVersion: ReturnType<typeof vi.fn>;
  let mockOnDeleteVersion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVersions = [
      {
        id: 'v1',
        content: 'This is version 1 of the message with some content',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        editReason: 'Initial edit'
      },
      {
        id: 'v2',
        content: 'This is version 2 of the message with different content',
        timestamp: new Date('2023-01-01T09:00:00Z'),
        editReason: 'Second edit'
      }
    ];

    mockMessage = {
      id: 'msg-1',
      content: 'This is the current version of the message',
      role: 'user',
      timestamp: new Date('2023-01-01T11:00:00Z'),
      isEdited: true,
      editedAt: new Date('2023-01-01T11:00:00Z'),
      versions: mockVersions
    };

    mockOnClose = vi.fn();
    mockOnRevertToVersion = vi.fn();
    mockOnDeleteVersion = vi.fn();
  });

  it('should render modal when open', () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    expect(screen.getByText('Message History')).toBeInTheDocument();
    expect(screen.getByText('3 versions')).toBeInTheDocument();
    expect(screen.getByText('• 2 edits')).toBeInTheDocument();
    expect(screen.getByText('• user message')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(
      <MessageHistoryModal
        open={false}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    expect(screen.queryByText('Message History')).not.toBeInTheDocument();
  });

  it('should display current version with correct badge', () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('This is the current version of the message')).toBeInTheDocument();
  });

  it('should display all versions with timestamps', () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Check that version content is displayed (in preview form)
    expect(screen.getByText(/This is version 1 of the message/)).toBeInTheDocument();
    expect(screen.getByText(/This is version 2 of the message/)).toBeInTheDocument();
  });

  it('should display edit reasons when available', () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    expect(screen.getByText('Initial edit')).toBeInTheDocument();
    expect(screen.getByText('Second edit')).toBeInTheDocument();
  });

  it('should display word count and character count', () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Check for word count and character count displays
    expect(screen.getAllByText(/words/)).toHaveLength(3); // 3 versions
    expect(screen.getAllByText(/chars/)).toHaveLength(3); // 3 versions
  });

  it('should expand version content when expand button is clicked', async () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Find and click the expand button for the first version
    const expandButtons = screen.getAllByRole('button');
    const firstExpandButton = expandButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('h-6 w-6 p-0')
    );
    
    if (firstExpandButton) {
      fireEvent.click(firstExpandButton);
    }

    await waitFor(() => {
      // The full content should be visible after expansion
      expect(screen.getByText('This is version 1 of the message with some content')).toBeInTheDocument();
    });
  });

  it('should call onRevertToVersion when revert button is clicked', async () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Find and click a revert button
    const revertButtons = screen.getAllByText('Revert');
    fireEvent.click(revertButtons[0]);

    await waitFor(() => {
      expect(mockOnRevertToVersion).toHaveBeenCalledWith('v1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should call onDeleteVersion when delete button is clicked', async () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Find and click a delete button (X button)
    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg') && button.textContent === ''
    );
    
    // Click the first delete button (should be for v1)
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
    }

    await waitFor(() => {
      expect(mockOnDeleteVersion).toHaveBeenCalledWith('v1');
    });
  });

  it('should not show revert and delete buttons for current version', () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // The current version should not have revert/delete buttons
    const currentVersionSection = screen.getByText('Current').closest('div');
    expect(currentVersionSection?.querySelector('button[title="Revert"]')).not.toBeInTheDocument();
  });

  it('should handle message with no versions', () => {
    const messageWithoutVersions = {
      ...mockMessage,
      versions: []
    };

    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={messageWithoutVersions}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    expect(screen.getByText('1 version')).toBeInTheDocument();
    expect(screen.getByText('• 0 edits')).toBeInTheDocument();
  });

  it('should handle message with no edit date', () => {
    const messageWithoutEditDate = {
      ...mockMessage,
      editedAt: undefined
    };

    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={messageWithoutEditDate}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Should still render without errors
    expect(screen.getByText('Message History')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle long content with show more/less functionality', async () => {
    const longContent = 'This is a very long version content that should be truncated and show a "Show more" button when the content exceeds 100 characters. This content is definitely longer than 100 characters.';
    
    const messageWithLongContent = {
      ...mockMessage,
      versions: [{
        id: 'v1',
        content: longContent,
        timestamp: new Date('2023-01-01T10:00:00Z'),
        editReason: 'Long content edit'
      }]
    };

    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={messageWithLongContent}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
      />
    );

    // Should show truncated content initially
    expect(screen.getByText(/This is a very long version content that should be truncated/)).toBeInTheDocument();
    
    // Should show "Show more" button
    const showMoreButton = screen.getByText('Show more');
    expect(showMoreButton).toBeInTheDocument();

    // Click show more
    fireEvent.click(showMoreButton);

    await waitFor(() => {
      // Should show full content
      expect(screen.getByText(longContent)).toBeInTheDocument();
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const customClass = 'custom-modal-class';
    
    render(
      <MessageHistoryModal
        open={true}
        onClose={mockOnClose}
        message={mockMessage}
        onRevertToVersion={mockOnRevertToVersion}
        onDeleteVersion={mockOnDeleteVersion}
        className={customClass}
      />
    );

    const modalContent = screen.getByText('Message History').closest('[role="dialog"]');
    expect(modalContent).toHaveClass(customClass);
  });
});