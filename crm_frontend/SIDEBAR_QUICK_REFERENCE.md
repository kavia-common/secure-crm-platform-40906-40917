# Sidebar Quick Reference Card

## State Management

### Data Attributes (on `.shell`)
```html
<div class="shell" 
     data-collapsed="false"     <!-- "true" | "false" -->
     data-drawer="false"        <!-- "true" (mobile only) | "false" -->
     data-viewport="desktop">   <!-- "mobile" | "tablet" | "desktop" -->
```

### localStorage
```javascript
// Key: ui_sidebar_collapsed
// Values: "0" (expanded) | "1" (collapsed)
localStorage.getItem('ui_sidebar_collapsed')
```

---

## Breakpoints

| Viewport | Width | Behavior | data-drawer |
|----------|-------|----------|-------------|
| Mobile | <640px | Drawer overlay + backdrop | `"true"` |
| Tablet | 640-1023px | Inline collapsible | `"false"` |
| Desktop | ≥1024px | Persistent sidebar | `"false"` |

---

## CSS Custom Properties

```css
/* Desktop */
--sidebar-w: 260px;
--sidebar-w-collapsed: 64px;

/* Tablet */
--sidebar-w: 240px;
--sidebar-w-collapsed: 64px;

/* Mobile */
--sidebar-w: 280px;
```

---

## Z-Index Hierarchy

```
40 ← Sidebar drawer (mobile)
30 ← Backdrop (mobile)
20 ← Sidebar (desktop/tablet)
15 ← Top bar
10 ← Content area
```

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| Enter / Space | Toggle sidebar | On hamburger button |
| ESC | Close drawer | Mobile drawer open |
| Tab | Navigate elements | Any viewport |
| Enter / Space | Activate link | On nav links |

---

## Grid Layout

### Desktop/Tablet (2 columns)
```css
grid-template-columns: var(--sidebar-w) 1fr;
grid-template-areas: "sidebar content";
```

### Mobile (1 column)
```css
grid-template-columns: 1fr;
grid-template-areas: "content";
/* Sidebar is position: fixed */
```

---

## Routes & Navigation

All paths match `Routes.jsx`:

| NavLink Path | Route | Component |
|--------------|-------|-----------|
| `/dashboard` | `/dashboard` | Dashboard |
| `/customers` | `/customers` | CustomersList |
| `/service-requests` | `/service-requests` | ServiceRequestsList |
| `/omnichannel` | `/omnichannel` | OmniChannelInbox |
| `/complaints` | `/complaints` | ComplaintsList |
| `/settings` | `/settings` | Settings |

---

## Critical CSS Properties

### Prevent Overlap
```css
.content {
  min-width: 0;      /* Allow shrinking */
  grid-area: content; /* Explicit grid area */
}

.main {
  min-width: 0;      /* Allow content shrinking */
  min-height: 0;     /* Prevent overflow */
}
```

### Sidebar Positioning
```css
/* Desktop/Tablet: Grid positioning */
.sidebar {
  grid-area: sidebar;
  position: relative;
}

/* Mobile: Fixed positioning */
.shell[data-drawer="true"] .sidebar {
  position: fixed;
  transform: translateX(-100%); /* Hidden */
}

.shell[data-drawer="true"][data-collapsed="false"] .sidebar {
  transform: translateX(0); /* Visible */
}
```

---

## Focus Management Flow

### Opening Drawer (Mobile)
```
User clicks hamburger
  → Drawer opens
  → Focus moves to first nav link (Dashboard)
```

### Closing Drawer
```
User clicks backdrop / ESC / nav link
  → Drawer closes
  → Focus returns to hamburger button
```

---

## Testing Commands

```bash
# Run smoke tests
npm test -- AppShell.smoke.test.jsx

# Run all tests
npm test

# Build production
npm run build

# Check localStorage (in browser console)
localStorage.getItem('ui_sidebar_collapsed')

# Inspect data attributes
document.querySelector('.shell').dataset
```

---

## Common CSS Selectors

```css
/* Collapsed (not drawer mode) */
.shell[data-collapsed="true"]:not([data-drawer="true"]) .nav .label {
  display: none;
}

/* Drawer open */
.shell[data-drawer="true"][data-collapsed="false"] .sidebar {
  transform: translateX(0);
}

/* Backdrop visible */
.shell[data-drawer="true"] .backdrop.show {
  opacity: 1;
  pointer-events: auto;
}
```

---

## ARIA Attributes

```jsx
<button
  aria-label="Expand sidebar"
  aria-expanded="false"
  aria-controls="primary-sidebar"
/>

<aside
  id="primary-sidebar"
  aria-label="Primary navigation"
  aria-hidden="false"
/>

<NavLink
  aria-label="Dashboard"
  aria-current="page"  // When active
/>
```

---

## Viewport Mode Detection

```javascript
const getViewportMode = () => {
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
};
```

---

## Troubleshooting Quick Checks

```bash
# 1. Check build
npm run build

# 2. Clear cache
# Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

# 3. Clear localStorage
localStorage.clear()

# 4. Check data attributes (DevTools)
$0.dataset  // Select element first
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `AppShell.jsx` | Main component (222 lines) |
| `appshell.css` | Layout styles (402 lines) |
| `AppShell.smoke.test.jsx` | Test suite (310 lines) |
| `SIDEBAR_FIX_NOTES.md` | Detailed docs (450 lines) |
| `SIDEBAR_VALIDATION_GUIDE.md` | Manual testing (350 lines) |
| `SIDEBAR_FIX_SUMMARY.md` | Complete overview (400 lines) |
| `SIDEBAR_QUICK_REFERENCE.md` | This file |

---

## One-Line Debug Checks

```javascript
// Check viewport mode
document.querySelector('.shell').dataset.viewport

// Check collapsed state
document.querySelector('.shell').dataset.collapsed

// Check drawer mode
document.querySelector('.shell').dataset.drawer

// Check localStorage
localStorage.getItem('ui_sidebar_collapsed')

// Check z-index
getComputedStyle(document.querySelector('.sidebar')).zIndex

// Check if sidebar visible
!document.querySelector('.sidebar').ariaHidden
```

---

**Print this page for quick desk reference!**
