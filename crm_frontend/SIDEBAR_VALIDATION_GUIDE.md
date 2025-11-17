# Sidebar Visual Validation Guide

## Quick Check - 5 Minutes

Use this guide to quickly validate that all sidebar issues are resolved.

---

## 1. Desktop View (≥1024px) - 2 minutes

### Steps:
1. Open browser at 1280px+ width (or maximize window)
2. Navigate to: `http://localhost:3000/dashboard`

### ✅ Expected Behavior:
- [ ] Sidebar visible on left side (260px wide)
- [ ] Main content area fills remaining space to the right
- [ ] Click hamburger menu (☰) → sidebar collapses to 64px
  - Only icons visible, labels hidden
  - Main content expands to fill space
- [ ] Click again → sidebar expands back to 260px
- [ ] **Critical:** Main content NEVER sits underneath sidebar at any point
- [ ] Navigate to different routes → active link highlighted with background color

### 🐛 If Something's Wrong:
- **Content overlaps sidebar:** Check browser console for CSS errors
- **Sidebar won't toggle:** Check for JavaScript errors in console
- **Active link not highlighted:** Verify you're on a valid route

---

## 2. Tablet View (640px - 1023px) - 1 minute

### Steps:
1. Resize browser to 768px width (use DevTools device toolbar)
2. Refresh page if needed

### ✅ Expected Behavior:
- [ ] Sidebar still visible inline (no overlay)
- [ ] Sidebar width is 240px (slightly narrower than desktop)
- [ ] Toggle button collapses sidebar to 64px
- [ ] **No backdrop overlay appears**
- [ ] Main content adjusts width smoothly
- [ ] Grid layout maintains two columns

### 🐛 If Something's Wrong:
- **Backdrop appears:** Verify viewport detection logic
- **Sidebar acts like drawer:** Check data-drawer attribute

---

## 3. Mobile View (<640px) - 2 minutes

### Steps:
1. Resize browser to 375px width (iPhone size)
2. Refresh page

### ✅ Expected Behavior:
- [ ] Sidebar hidden initially (drawer mode)
- [ ] Only main content visible with hamburger menu button
- [ ] Click hamburger (☰):
  - Dark backdrop appears behind sidebar
  - Sidebar slides in from left (280px wide)
  - Backdrop is semi-transparent black
- [ ] Click any nav link → drawer closes automatically
- [ ] Click backdrop → drawer closes
- [ ] Press ESC key → drawer closes
- [ ] **Critical:** When drawer opens, focus moves to first nav link (Dashboard)
- [ ] When drawer closes, focus returns to hamburger button

### 🐛 If Something's Wrong:
- **Sidebar doesn't slide:** Check transform CSS and data-drawer attribute
- **Backdrop missing:** Verify backdrop element renders in mobile mode
- **ESC doesn't close:** Check keydown event listener

---

## 4. Keyboard Navigation - 1 minute (Any viewport)

### Steps:
1. Click anywhere on page, then press Tab repeatedly

### ✅ Expected Behavior:
- [ ] Tab key moves focus through all interactive elements
- [ ] Focus indicator visible (outline around elements)
- [ ] Focus order: Hamburger → Theme toggle → User menu → Nav links
- [ ] Press Enter or Space on hamburger → toggles sidebar
- [ ] Press Enter on nav link → navigates to route
- [ ] **Mobile only:** Press ESC with drawer open → closes drawer

### 🐛 If Something's Wrong:
- **No focus indicator:** Check :focus-visible styles in CSS
- **Enter/Space don't work:** Verify keydown handlers in JSX

---

## 5. Route Highlighting - 30 seconds

### Steps:
1. Navigate to each route by clicking nav links

### ✅ Routes to Test:
- [ ] `/dashboard` → Dashboard highlighted
- [ ] `/customers` → Customers highlighted
- [ ] `/service-requests` → Service Requests highlighted
- [ ] `/omnichannel` → OmniChannel Inbox highlighted
- [ ] `/complaints` → Complaints highlighted
- [ ] `/settings` → Settings highlighted

### ✅ Expected:
- Active route has:
  - Background color (secondary color)
  - Box shadow (inset border)
  - Bold font weight
  - `aria-current="page"` attribute

### 🐛 If Something's Wrong:
- **Wrong link highlighted:** Check NavLink path and Routes.jsx alignment
- **No highlighting:** Verify NavLink isActive prop

---

## 6. Responsive Transition - 30 seconds

### Steps:
1. Start at desktop width (1280px)
2. Slowly resize browser to mobile width (375px)
3. Watch sidebar behavior

### ✅ Expected Behavior:
- [ ] Desktop → Tablet: Sidebar narrows slightly, remains inline
- [ ] Tablet → Mobile: Sidebar transitions to drawer mode, collapses
- [ ] Smooth transitions (no jumping or flashing)
- [ ] `data-viewport` attribute updates: desktop → tablet → mobile

### 🐛 If Something's Wrong:
- **Sidebar jumps:** Check transition CSS properties
- **Mode doesn't change:** Verify resize event listener

---

## 7. State Persistence - 30 seconds

### Steps:
1. Toggle sidebar collapsed/expanded
2. Refresh page (F5)

### ✅ Expected Behavior:
- [ ] Sidebar state persists after refresh
- [ ] localStorage has `ui_sidebar_collapsed` key
- [ ] Value is "0" (expanded) or "1" (collapsed)

### 🔍 Check localStorage:
```javascript
// Open browser DevTools console:
localStorage.getItem('ui_sidebar_collapsed')
// Should return "0" or "1"
```

---

## 8. Accessibility Checks - 1 minute

### Steps:
1. Open browser DevTools
2. Go to Lighthouse or Accessibility tab
3. Run accessibility audit on any page

### ✅ Expected Results:
- [ ] No ARIA errors
- [ ] All buttons have accessible names
- [ ] Landmark roles present (banner, main, navigation)
- [ ] Contrast ratios pass WCAG AA
- [ ] Focus management works correctly

### Manual Screen Reader Test (Optional):
1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Tab through interface
3. Verify announcements make sense

---

## 9. Z-Index Layering - 30 seconds (Mobile Only)

### Steps:
1. Set browser to 375px width
2. Open sidebar drawer

### ✅ Expected Z-Index Order (bottom to top):
1. Main content (z-index: 10)
2. Top bar (z-index: 15)
3. Backdrop (z-index: 30)
4. Sidebar drawer (z-index: 40)

### Visual Check:
- [ ] Backdrop covers main content
- [ ] Sidebar appears above backdrop
- [ ] Top bar visible but backdrop covers it
- [ ] Nothing covers the drawer

### 🔍 Inspect Z-Index:
```javascript
// DevTools console:
getComputedStyle(document.querySelector('.backdrop')).zIndex // "30"
getComputedStyle(document.querySelector('.sidebar')).zIndex // "40"
```

---

## 10. Edge Cases - 1 minute

### Test These Scenarios:

#### A. Very narrow mobile (320px):
- [ ] Sidebar drawer still works
- [ ] Content doesn't overflow horizontally

#### B. Very wide desktop (2560px):
- [ ] Sidebar max width is reasonable
- [ ] Content uses available space

#### C. Rapid toggling:
- [ ] Click hamburger 5 times quickly
- [ ] No UI glitches or stuck states

#### D. Navigation during transition:
- [ ] Toggle sidebar
- [ ] Immediately click nav link while animating
- [ ] No errors or broken states

---

## Quick Problem Checklist

| Issue | Check |
|-------|-------|
| Content overlaps sidebar | Verify `min-width: 0` on .content and .main |
| Sidebar won't toggle | Check JavaScript console for errors |
| Wrong viewport mode | Verify window.innerWidth breakpoints |
| Focus not moving | Check ref.current exists and timing |
| Routes not highlighting | Verify NavLink paths match Routes.jsx |
| Backdrop doesn't appear | Check data-drawer attribute in mobile mode |
| ESC key not working | Verify keydown listener attached |
| State not persisting | Check localStorage access |
| Animations jumpy | Verify transition CSS properties |
| Z-index issues | Inspect computed z-index values |

---

## Browser Testing

Validate on these browsers (minimum):

- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Safari** (latest) - if on Mac
- [ ] **Edge** (latest)

### Mobile Browser Testing:
- [ ] **iOS Safari** (iPhone)
- [ ] **Chrome Mobile** (Android)

---

## Performance Check

### Desktop:
- [ ] Sidebar toggle feels smooth (no lag)
- [ ] Route changes instant
- [ ] No frame drops during animations

### Mobile:
- [ ] Drawer slides smoothly
- [ ] Touch interactions responsive
- [ ] No input delay

---

## Final Validation Checklist

Complete these to sign off:

- [ ] ✅ Desktop layout works (sidebar + content side-by-side)
- [ ] ✅ Tablet layout works (collapsible inline sidebar)
- [ ] ✅ Mobile layout works (drawer with backdrop)
- [ ] ✅ Keyboard navigation fully functional
- [ ] ✅ Focus management correct
- [ ] ✅ Route highlighting accurate
- [ ] ✅ State persists across refreshes
- [ ] ✅ Responsive transitions smooth
- [ ] ✅ Accessibility compliant
- [ ] ✅ Z-index layering correct
- [ ] ✅ No console errors
- [ ] ✅ Works on Chrome, Firefox, Safari, Edge

---

## Sign-Off

**Tested by:** ___________________  
**Date:** ___________________  
**Status:** ☐ Pass  ☐ Fail (see notes)  
**Notes:** ___________________

---

## Getting Help

If validation fails:

1. **Check browser console** for errors
2. **Review SIDEBAR_FIX_NOTES.md** for implementation details
3. **Inspect element** to verify data-attributes are set
4. **Run smoke tests:** `npm test -- AppShell.smoke.test.jsx`
5. **Check git diff** to see what changed

**Common fixes:**
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Restart development server
- Clear localStorage: `localStorage.clear()`
- Update dependencies: `npm install`

---

**Document Version:** 1.0  
**Last Updated:** [CURRENT DATE]
