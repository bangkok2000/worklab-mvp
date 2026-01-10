# Development Protocol - MANDATORY CHECKLIST

**This document MUST be followed for EVERY code change. No exceptions.**

## 🚨 CRITICAL: Read This First Before ANY Code Change

Before making ANY code modification, you MUST:
1. Read this entire protocol
2. Follow each step methodically
3. Verify your work before committing
4. Never skip steps to "save time"

---

## 📋 Pre-Change Checklist (MUST DO ALL)

### Step 1: Understand the Full Context
- [ ] Read ALL relevant files first (don't assume structure)
- [ ] Understand parent/child component relationships
- [ ] Check how components are wrapped/nested (layout files, wrappers)
- [ ] Identify all related files that might be affected
- [ ] Map out the data flow and component hierarchy

### Step 2: Find Working Examples
- [ ] Look for similar working code (e.g., right arrow for left arrow)
- [ ] Understand WHY the working example works
- [ ] Identify the pattern/principle, not just copy code
- [ ] Compare your intended change with the working example

### Step 3: Verify Function Signatures & APIs
- [ ] Check function signatures in source files (don't guess)
- [ ] Verify parameter order and types
- [ ] Check return types
- [ ] Look at actual usage examples in the codebase
- [ ] Verify imports are correct

### Step 4: Calculate/Verify Logic
- [ ] For positioning: Calculate exact pixel values
- [ ] For dimensions: Account for all parent containers
- [ ] For calculations: Show your math/work
- [ ] For API calls: Verify request/response structure
- [ ] Double-check your calculations

### Step 5: Check Dependencies
- [ ] Verify all imports exist
- [ ] Check if functions/utilities are available
- [ ] Verify environment variables if needed
- [ ] Check for TypeScript types/interfaces

---

## 🔍 Specific Protocols by Change Type

### UI/Positioning Fixes (Like Buttons, Panels, Layouts)
1. [ ] **Check parent container dimensions**
   - Read the parent component/layout file
   - Note all widths, heights, margins, padding
   - Account for ALL parent containers (not just immediate parent)

2. [ ] **Check sibling elements**
   - See how similar elements are positioned
   - Understand the layout system (flex, grid, fixed, etc.)

3. [ ] **Verify positioning type**
   - `position: fixed` = relative to viewport
   - `position: absolute` = relative to nearest positioned ancestor
   - `position: relative` = relative to normal position

4. [ ] **Calculate exact values**
   - Show your calculation: `sidebar (260px) + panel (300px) - button (28px) = 532px`
   - Don't guess or estimate
   - Account for borders, margins, padding

5. [ ] **Compare with working example**
   - If right arrow works, understand WHY it works
   - Mirror the logic exactly for left arrow
   - Don't just copy numbers - understand the principle

### API Route Changes
1. [ ] **Read the function signature in source file**
   - Don't assume parameter order
   - Check the actual implementation file
   - Verify all required parameters

2. [ ] **Check existing usage**
   - Find other places using the same function
   - See how they call it correctly
   - Match the pattern exactly

3. [ ] **Verify response structure**
   - Check what the function returns
   - Ensure your code handles the response correctly
   - Check for error cases

### TypeScript/Interface Changes
1. [ ] **Check existing type definitions**
   - Read the actual type/interface file
   - Don't assume what properties exist
   - Verify optional vs required fields

2. [ ] **Update all related code**
   - If you add a property, update all usages
   - Check for TypeScript errors before committing
   - Run linter to catch issues

---

## ❌ NEVER DO THESE

- ❌ **Never commit without verifying the fix is correct**
  - Don't push code that "should work" - verify it first
  - Run linters, check for errors
  - At minimum, verify logic/calculations are correct

- ❌ **Never assume layout structure**
  - Always check if components are wrapped
  - Always verify parent container dimensions
  - Always check for nested layouts

- ❌ **Never copy patterns without understanding**
  - Don't just copy numbers from working code
  - Understand WHY it works
  - Apply the principle, not just the values

- ❌ **Never rush to "fix" without understanding**
  - Take time to understand the problem fully
  - Read code thoroughly before changing it
  - Ask questions if unclear (don't guess)

- ❌ **Never skip verification steps**
  - Always check function signatures
  - Always verify calculations
  - Always run linters
  - Always check for TypeScript errors

---

## ✅ Pre-Commit Checklist

Before committing ANY code:
- [ ] I have read ALL relevant files
- [ ] I understand the full context
- [ ] I have verified function signatures match usage
- [ ] I have calculated/verified all values (especially positioning)
- [ ] I have compared with working examples
- [ ] I have run linter checks
- [ ] I have verified the logic is correct
- [ ] I have checked for TypeScript errors
- [ ] I have accounted for all parent containers/layouts
- [ ] I am confident this fix is correct

---

## 🎯 Example: How to Fix the Left Arrow Button (What Should Have Been Done)

### Step 1: Understand Context
- [ ] Read `app/app/projects/[projectId]/page.tsx` - understand the component
- [ ] Read `app/app/layout.tsx` - see it's wrapped in AppShell
- [ ] Read `app/components/layout/AppShell.tsx` - see sidebar is 260px
- [ ] Understand: Project page → AppShell → Sidebar (260px) → Sources Panel (300px) → Main Content

### Step 2: Find Working Example
- [ ] Look at right arrow button (it works correctly)
- [ ] Understand: `right: '280px'` when panel open, `right: '0'` when closed
- [ ] Understand: Right panel is 280px, button aligns with main content edge
- [ ] Principle: Button's edge aligns with main content edge

### Step 3: Calculate for Left Arrow
- [ ] When Sources panel OPEN:
  - Sidebar: 260px
  - Sources panel: 300px
  - Main content starts at: 260px + 300px = 560px
  - Button width: 28px
  - Button left position: 560px - 28px = 532px (so right edge at 560px)

- [ ] When Sources panel CLOSED:
  - Sidebar: 260px
  - Sources panel: 0px
  - Main content starts at: 260px + 0px = 260px
  - Button width: 28px
  - Button left position: 260px - 28px = 232px (so right edge at 260px)

### Step 4: Verify
- [ ] Check calculation: 532px and 232px are correct
- [ ] Compare with right arrow logic (mirrors it)
- [ ] Verify button won't cover sidebar (it's at 232px/532px, sidebar ends at 260px)
- [ ] Run linter to check for errors

### Step 5: Commit
- [ ] Only commit after all above steps are verified

---

## 📝 Notes

- **Time spent understanding is NOT wasted** - it prevents rework
- **One correct fix is better than five rushed attempts**
- **When in doubt, read more code, don't guess**
- **Always show your work/calculations in commit messages**

---

**Last Updated:** After left arrow button positioning issues
**Purpose:** Prevent repeated mistakes by enforcing systematic approach
