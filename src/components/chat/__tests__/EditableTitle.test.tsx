import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EditableTitle } from '../EditableTitle';

describe('EditableTitle', () => {
  const mockOnSave = vi.fn();
  
  beforeEach(() => {
    mockOnSave.mockClear();
  });
  
  it('renders with initial title', () => {
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });
  
  it('shows edit button on hover', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    const titleContainer = screen.getByText('Test Chat').parentElement;
    expect(titleContainer).toBeInTheDocument();
    
    if (titleContainer) {
      await user.hover(titleContainer);
      expect(screen.getByLabelText('Edit title')).toBeInTheDocument();
    }
  });
  
  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    await user.click(screen.getByLabelText('Edit title'));
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Test Chat');
  });
  
  it('saves changes when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    await user.click(screen.getByLabelText('Edit title'));
    
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated Chat Title');
    
    await user.click(screen.getByLabelText('Save'));
    
    expect(mockOnSave).toHaveBeenCalledWith('Updated Chat Title');
  });
  
  it('cancels editing when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    await user.click(screen.getByLabelText('Edit title'));
    
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated Chat Title');
    
    await user.click(screen.getByLabelText('Cancel'));
    
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });
  
  it('saves changes when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    await user.click(screen.getByLabelText('Edit title'));
    
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated Chat Title{enter}');
    
    expect(mockOnSave).toHaveBeenCalledWith('Updated Chat Title');
  });
  
  it('cancels editing when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    await user.click(screen.getByLabelText('Edit title'));
    
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated Chat Title{escape}');
    
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });
  
  it('does not save empty titles', async () => {
    const user = userEvent.setup();
    render(<EditableTitle initialTitle="Test Chat" onSave={mockOnSave} />);
    
    await user.click(screen.getByLabelText('Edit title'));
    
    const input = screen.getByRole('textbox');
    await user.clear(input);
    
    await user.click(screen.getByLabelText('Save'));
    
    expect(mockOnSave).not.toHaveBeenCalled();
  });
  
  it('shows placeholder when no initial title is provided', () => {
    render(<EditableTitle initialTitle="" onSave={mockOnSave} placeholder="Enter a title" />);
    expect(screen.getByText('Enter a title')).toBeInTheDocument();
  });
});