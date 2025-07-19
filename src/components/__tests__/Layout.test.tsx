import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Layout } from '../Layout';

// Mock the NavigationSidebar component
vi.mock('../NavigationSidebar', () => ({
  NavigationSidebar: ({ collapsed, onToggle, isMobile }: any) => (
    <div data-testid="navigation-sidebar">
      <button onClick={onToggle} data-testid="toggle-button">
        {collapsed ? 'Expand' : 'Collapse'}
      </button>
      <span data-testid="mobile-status">{isMobile ? 'Mobile' : 'Desktop'}</span>
    </div>
  ),
}));

describe('Layout', () => {
  it('renders children correctly', () => {
    render(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-sidebar')).toBeInTheDocument();
  });

  it('toggles sidebar collapse state', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const toggleButton = screen.getByTestId('toggle-button');
    
    // Initially not collapsed
    expect(toggleButton).toHaveTextContent('Collapse');
    
    // Click to collapse
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('Expand');
    
    // Click to expand
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('Collapse');
  });

  it('applies correct responsive classes', () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('flex-1', 'flex', 'flex-col', 'transition-all', 'duration-300');
  });
});