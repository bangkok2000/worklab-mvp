# UI Refinement Plan

**Goal:** Make UI more compact, professional, and elegant

---

## 🎯 Issues to Address

1. **Sidebar too wide** - Currently 240px, should be ~200px
2. **Icons too large** - Currently 1.125rem, should be 1rem
3. **Fonts too large** - Various sizes need reduction
4. **Excessive padding** - Elements taking too much space
5. **Empty space at bottom** - Pages not filling viewport
6. **Color palette** - Purple/teal may not be professional enough

---

## 📐 Target Measurements

### Sidebar
- Width: 240px → **200px** (collapsed: 64px → **56px**)
- Item padding: 0.75rem-1rem → **0.625rem 0.875rem**
- Icon size: 1.125rem → **1rem**
- Font size: 0.875rem → **0.8125rem**

### Header
- Height: 64px → **56px**
- Logo size: 38px → **32px**
- Title font: 1.25rem → **1.125rem**
- Subtitle font: 0.6875rem → **0.625rem**

### Typography Scale
- H1: 2rem → **1.75rem**
- H2: 1.5rem → **1.375rem**
- H3: 1.25rem → **1.125rem**
- Body: 1rem → **0.9375rem**
- Small: 0.875rem → **0.8125rem**
- Tiny: 0.75rem → **0.6875rem**

### Spacing Scale
- Tight: 0.25rem → **0.1875rem**
- Small: 0.5rem → **0.375rem**
- Medium: 1rem → **0.75rem**
- Large: 1.5rem → **1.25rem**

### Color Palette (Refined)
- Primary: #8b5cf6 → **#7c3aed** (more muted purple)
- Secondary: #6366f1 → **#5b21b6** (darker indigo)
- Accent: #c4b5fd → **#a78bfa** (softer purple)
- Text Primary: #f1f5f9 → **#e2e8f0** (slightly softer)
- Text Secondary: #94a3b8 → **#64748b** (more muted)
- Background: Current gradient → **More subtle gradient**

---

## 🔧 Components to Update

1. **Sidebar.tsx** - Width, padding, icon sizes
2. **Header.tsx** - Height, logo, font sizes
3. **AppShell.tsx** - Overall layout spacing
4. **globals.css** - Typography scale, color palette
5. **Button.tsx** - Padding, font sizes
6. **Input.tsx** - Height, padding (already done)
7. **Card.tsx** - Padding, spacing
8. **Panel.tsx** - Width, padding

---

## 📋 Implementation Order

1. **Typography & Colors** (globals.css)
2. **Sidebar** (Sidebar.tsx)
3. **Header** (Header.tsx)
4. **Layout Components** (AppShell, Panel)
5. **UI Components** (Button, Card, Input)
6. **Page Components** (Dashboard, Projects, etc.)

---

**Status:** In Progress
