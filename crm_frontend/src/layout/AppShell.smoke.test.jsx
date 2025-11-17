import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AuthContext } from '../auth/AuthContext';

/**
 * Smoke test for AppShell layout responsive behavior
 * Tests sidebar class toggles at different viewport widths
 */

// Mock auth context
const mockAuthContext = {
  user: { name: 'Test User', id: '1' },
  logout: jest.fn(),
  theme: 'light',
  setTheme: jest.fn(),
  dummyAuth: false,
};

describe('AppShell Layout Smoke Test', () => {
  const renderAppShell = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AppShell>
            <div data-testid="main-content">Main Content</div>
          </AppShell>
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders without crashing', () => {
    renderAppShell();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders sidebar with navigation items', () => {
    renderAppShell();
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Service Requests')).toBeInTheDocument();
  });

  it('renders topbar with toggle button', () => {
    renderAppShell();
    const toggleButton = screen.getByLabelText(/sidebar/i);
    expect(toggleButton).toBeInTheDocument();
  });

  it('renders main content area', () => {
    renderAppShell();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  describe('Desktop layout (>=1024px)', () => {
    beforeEach(() => {
      global.innerWidth = 1280;
      global.dispatchEvent(new Event('resize'));
    });

    it('applies correct class for open sidebar', () => {
      const { container } = renderAppShell();
      const shell = container.querySelector('.shell');
      // Initially should be open on desktop
      expect(shell).toHaveClass('sidebar-open');
    });
  });

  describe('Tablet layout (640-1023px)', () => {
    beforeEach(() => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
    });

    it('renders sidebar as collapsible', () => {
      const { container } = renderAppShell();
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('Mobile layout (<640px)', () => {
    beforeEach(() => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
    });

    it('renders backdrop element', () => {
      const { container } = renderAppShell();
      const backdrop = container.querySelector('.backdrop');
      expect(backdrop).toBeInTheDocument();
    });

    it('sidebar should be closed initially on mobile', () => {
      const { container } = renderAppShell();
      const shell = container.querySelector('.shell');
      // Should default to closed on mobile
      expect(shell).toHaveClass('sidebar-closed');
    });
  });

  it('applies aria attributes correctly', () => {
    renderAppShell();
    const sidebar = screen.getByLabelText('Primary navigation');
    expect(sidebar).toHaveAttribute('id', 'primary-sidebar');
    
    const toggleButton = screen.getByLabelText(/sidebar/i);
    expect(toggleButton).toHaveAttribute('aria-controls', 'primary-sidebar');
    expect(toggleButton).toHaveAttribute('aria-expanded');
  });

  it('navigation links have proper accessibility attributes', () => {
    renderAppShell();
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-label', 'Dashboard');
  });
});
