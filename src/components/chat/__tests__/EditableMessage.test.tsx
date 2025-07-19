import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EditableMessage } from '../EditableMessage';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('EditableMessage', () => {
  const defaultProps = {
    initialContent: 'Initial message content',
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial content', () => {
    render(<EditableMessage {...defaultProps} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    expect(textarea).toBeInTheDocument();
  });

  it('focuses textarea on mount', async () => {
    render(<EditableMessage {...defaultProps} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    await waitFor(() => {
      expect(textarea).toHaveFocus();
    });
  });

  it('shows character count', () => {
    render(<EditableMessage {...defaultProps} />);

    expect(screen.getByText('23/4000')).toBeInTheDocument();
  });

  it('updates character count when content changes', () => {
    render(<EditableMessage {...defaultProps} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    fireEvent.change(textarea, { target: { value: 'New content' } });

    expect(screen.getByText('11/4000')).toBeInTheDocument();
  });

  it('shows warning color when near character limit', () => {
    const longContent = 'a'.repeat(3300); // 82.5% of 4000
    render(<EditableMessage {...defaultProps} initialContent={longContent} />);

    const characterCount = screen.getByText(`${longContent.length}/4000`);
    expect(characterCount).toHaveClass('text-warning');
  });

  it('shows error color when over character limit', () => {
    const tooLongContent = 'a'.repeat(4100);
    render(<EditableMessage {...defaultProps} initialContent={tooLongContent} />);

    const characterCount = screen.getByText(`${tooLongContent.length}/4000`);
    expect(characterCount).toHaveClass('text-destructive');
  });

  it('disables save button when content is empty', () => {
    render(<EditableMessage {...defaultProps} initialContent="" />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables save button when content exceeds limit', () => {
    const tooLongContent = 'a'.repeat(4100);
    render(<EditableMessage {...defaultProps} initialContent={tooLongContent} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when content is valid', () => {
    render(<EditableMessage {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onSave with trimmed content when save button is clicked', () => {
    const onSave = vi.fn();
    render(<EditableMessage {...defaultProps} onSave={onSave} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    fireEvent.change(textarea, { target: { value: '  Updated content  ' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('Updated content');
  });

  it('calls onCancel when content is unchanged', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<EditableMessage {...defaultProps} onSave={onSave} onCancel={onCancel} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<EditableMessage {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('saves content when Ctrl+Enter is pressed', () => {
    const onSave = vi.fn();
    render(<EditableMessage {...defaultProps} onSave={onSave} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSave).toHaveBeenCalledWith('Updated content');
  });

  it('saves content when Cmd+Enter is pressed (Mac)', () => {
    const onSave = vi.fn();
    render(<EditableMessage {...defaultProps} onSave={onSave} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(onSave).toHaveBeenCalledWith('Updated content');
  });

  it('cancels editing when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<EditableMessage {...defaultProps} onCancel={onCancel} />);

    const textarea = screen.getByDisplayValue('Initial message content');
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
  });

  it('does not save when Ctrl+Enter is pressed and content is invalid', () => {
    const onSave = vi.fn();
    render(<EditableMessage {...defaultProps} onSave={onSave} initialContent="" />);

    const textarea = screen.getByDisplayValue('');
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows keyboard shortcuts hint', () => {
    render(<EditableMessage {...defaultProps} />);

    expect(screen.getByText(/Ctrl\+Enter/)).toBeInTheDocument();
    expect(screen.getByText(/Esc/)).toBeInTheDocument();
  });

  it('uses custom placeholder when provided', () => {
    render(<EditableMessage {...defaultProps} placeholder="Custom placeholder" initialContent="" />);

    const textarea = screen.getByPlaceholderText('Custom placeholder');
    expect(textarea).toBeInTheDocument();
  });

  it('uses custom max length when provided', () => {
    render(<EditableMessage {...defaultProps} maxLength={100} />);

    expect(screen.getByText('23/100')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EditableMessage {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty content gracefully', () => {
    render(<EditableMessage {...defaultProps} initialContent="" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('');
    expect(screen.getByText('0/4000')).toBeInTheDocument();
  });

  it('trims whitespace from content before validation', () => {
    render(<EditableMessage {...defaultProps} initialContent="   " />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('places cursor at end of text on focus', async () => {
    render(<EditableMessage {...defaultProps} />);

    const textarea = screen.getByDisplayValue('Initial message content') as HTMLTextAreaElement;
    
    await waitFor(() => {
      expect(textarea.selectionStart).toBe(textarea.value.length);
      expect(textarea.selectionEnd).toBe(textarea.value.length);
    });
  });
});