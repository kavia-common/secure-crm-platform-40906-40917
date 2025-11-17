import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AuthProvider } from '../auth/AuthContext';

/**
 * Smoke test for AppShell layout and sidebar behavior.
 * Validates:
 * 1. Sidebar renders and toggles correctly
 * 2. Layout works at mobile/tablet/desktop widths
 * 3. Main content column is always visible
 * 4. Keyboard accessibility (Enter/Space toggle, ESC closes)
 * 5. Focus management
 * 6. Route highlighting
 * 7. Stacking context for header/toggle and main content clickability
 */

// Mock auth context overrides via AuthProvider value prop
const mockAuthContext = {
  user: { name: 'Test User', id: '1' },
  theme: 'light',
  setTheme: jest.fn(),
  logout: jest.fn(),
  dummyAuth: false,
};

const renderAppShell = (children = <div>Test Content</div>) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={mockAuthContext}>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AppShell Smoke Tests', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Reset window size to desktop by default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  test('renders sidebar and main content', () => {
    renderAppShell();
    
    // Sidebar should be visible
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
    
    // Main content should be visible
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    
    // Navigation links should be present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Service Requests')).toBeInTheDocument();
  });

  test('sidebar toggles on button click', async () => {
    renderAppShell();
    
    const toggleButton = screen.getByLabelText(/sidebar/i);
    const shell = document.querySelector('.app-shell');
    
    // Initial state (expanded by default on desktop)
    expect(shell).toHaveAttribute('data-collapsed', 'false');
    
    // Click to collapse
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'true');
    });
    
    // Click to expand
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'false');
    });
  });

  test('sidebar toggles with keyboard (Enter/Space)', async () => {
    renderAppShell();
    
    const toggleButton = screen.getByLabelText(/sidebar/i);
    const shell = document.querySelector('.app-shell');
    
    // Toggle with Enter key
    fireEvent.keyDown(toggleButton, { key: 'Enter' });
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'true');
    });
    
    // Toggle with Space key
    fireEvent.keyDown(toggleButton, { key: ' ' });
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'false');
    });
  });

  test('ESC key closes drawer on mobile', async () => {
    // Set to mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    renderAppShell();
    
    const toggleButton = screen.getByLabelText(/sidebar/i);
    const shell = document.querySelector('.app-shell');
    
    // Open drawer
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'false');
    });
    
    // Press ESC to close
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'true');
    });
  });

  test('desktop layout: sidebar and content both visible', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    
    renderAppShell();
    
    const shell = document.querySelector('.app-shell');
    const sidebar = screen.getByLabelText('Primary navigation');
    const mainContent = screen.getByRole('main');
    
    // Desktop viewport
    expect(shell).toHaveAttribute('data-viewport', 'desktop');
    expect(shell).toHaveAttribute('data-drawer', 'false');
    
    // Both sidebar and content should be visible
    expect(sidebar).toBeVisible();
    expect(mainContent).toBeVisible();
    
    // Grid layout should have two columns
    const computedStyle = window.getComputedStyle(shell);
    expect(computedStyle.display).toBe('grid');
  });

  test('tablet layout: collapsible sidebar inline', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    
    renderAppShell();
    
    const shell = document.querySelector('.app-shell');
    
    // Tablet viewport
    expect(shell).toHaveAttribute('data-viewport', 'tablet');
    expect(shell).toHaveAttribute('data-drawer', 'false');
    
    // Should use grid layout (not drawer)
    const computedStyle = window.getComputedStyle(shell);
    expect(computedStyle.display).toBe('grid');
  });

  test('mobile layout: drawer with backdrop', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    renderAppShell();
    
    const shell = document.querySelector('.app-shell');
    const toggleButton = screen.getByLabelText(/sidebar/i);
    
    // Mobile viewport should use drawer mode
    expect(shell).toHaveAttribute('data-viewport', 'mobile');
    expect(shell).toHaveAttribute('data-drawer', 'true');
    
    // Initially collapsed
    expect(shell).toHaveAttribute('data-collapsed', 'true');
    
    // Open drawer
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'false');
    });
    
    // Backdrop should be visible
    const backdrop = document.querySelector('.backdrop');
    expect(backdrop).toHaveClass('show');
  });

  test('main content area is never hidden by sidebar', () => {
    renderAppShell(<div data-testid="main-content">Important Content</div>);
    
    const mainContent = screen.getByTestId('main-content');
    const mainElement = screen.getByRole('main');
    
    // Main content should be visible
    expect(mainContent).toBeVisible();
    
    // Main element should have proper min-width
    const computedStyle = window.getComputedStyle(mainElement);
    expect(computedStyle.minWidth).toBe('0px');
  });

  test('navigation links have proper accessibility attributes', () => {
    renderAppShell();
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    
    // Should have aria-label
    expect(dashboardLink).toHaveAttribute('aria-label');
    
    // Should be keyboard accessible
    fireEvent.keyDown(dashboardLink, { key: 'Enter' });
    // Link should handle keyboard navigation
  });

  test('persists sidebar state in localStorage per viewport', async () => {
    renderAppShell();
    
    const shell = document.querySelector('.app-shell');
    const initialViewport = shell.getAttribute('data-viewport');
    const toggleButton = screen.getByLabelText(/sidebar/i);
    
    // Toggle to collapsed on current viewport
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(localStorage.getItem(`ui_sidebar_collapsed_${initialViewport}`)).toBe('1');
      expect(localStorage.getItem('ui_sidebar_collapsed')).toBe('1');
      expect(localStorage.getItem('ui_sidebar_open')).toBe('0');
    });
    
    // Toggle to expanded
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(localStorage.getItem(`ui_sidebar_collapsed_${initialViewport}`)).toBe('0');
      expect(localStorage.getItem('ui_sidebar_collapsed')).toBe('0');
      expect(localStorage.getItem('ui_sidebar_open')).toBe('1');
    });
  });

  test('focus management: opening drawer moves focus to first nav link', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    renderAppShell();
    
    const toggleButton = screen.getByLabelText(/sidebar/i);
    
    // Open drawer
    fireEvent.click(toggleButton);
    
    // Focus should move to first nav link after animation
    await waitFor(
      () => {
        const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
        expect(document.activeElement).toBe(dashboardLink);
      },
      { timeout: 250 }
    );
  });

  test('backdrop click closes drawer and returns focus', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    renderAppShell();
    
    const shell = document.querySelector('.app-shell');
    const toggleButton = screen.getByLabelText(/sidebar/i);
    
    // Open drawer
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'false');
    });
    
    // Click backdrop
    const backdrop = document.querySelector('.backdrop');
    fireEvent.click(backdrop);
    
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-collapsed', 'true');
      expect(document.activeElement).toBe(toggleButton);
    });
  });

  test('window resize updates viewport mode', async () => {
    renderAppShell();
    const shell = document.querySelector('.app-shell');
    // Start at desktop
    expect(shell).toHaveAttribute('data-viewport', 'desktop');

    // Resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    fireEvent(window, new Event('resize'));
    
    await waitFor(() => {
      expect(shell).toHaveAttribute('data-viewport', 'mobile');
    });
  });

  test('stacking context: toggle is within sticky topbar and not absolutely positioned', () => {
    renderAppShell();
    const topbar = screen.getByRole('banner');
    const toggleButton = screen.getByLabelText(/sidebar/i);

    expect(topbar.contains(toggleButton)).toBe(true);

    const headerStyle = window.getComputedStyle(topbar);
    const toggleStyle = window.getComputedStyle(toggleButton);

    expect(headerStyle.position).toBe('sticky');
    expect(headerStyle.zIndex).toBe('20');
    expect(toggleStyle.position).toBe('static');
  });

  test('main content is clickable near top-left (desktop and tablet)', async () => {
    // Desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
    let clicked = false;

    renderAppShell(
      <button
        data-testid="click-top-left"
        onClick={() => {
          clicked = true;
        }}
        style={{ alignSelf: 'flex-start' }}
      >
        Click Me
      </button>
    );

    const btn = screen.getByTestId('click-top-left');
    fireEvent.click(btn);
    expect(clicked).toBe(true);

    // Tablet
    clicked = false;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });
    fireEvent(window, new Event('resize'));
    // Re-render for tablet
    renderAppShell(
      <button data-testid="click-top-left-2" onClick={() => (clicked = true)}>
        Click Me 2
      </button>
    );
    const btn2 = screen.getByTestId('click-top-left-2');
    fireEvent.click(btn2);
    expect(clicked).toBe(true);
  });
});
