# Development Protocol - MANDATORY CHECKLIST

**This document MUST be followed for EVERY code change. No exceptions.**

## 🚨 CRITICAL: Read This First Before ANY Code Change

**YOU MUST READ THIS ENTIRE DOCUMENT FROM TOP TO BOTTOM BEFORE MAKING ANY CODE CHANGE.**

**DO NOT ASSUME. DO NOT SKIP. DO NOT RUSH.**

Before making ANY code modification, you MUST:
1. **READ THIS ENTIRE PROTOCOL** - Every single time, from start to finish. No exceptions.
2. **READ INSTRUCTIONS.md** - Understand the project context and requirements.
3. **UNDERSTAND THE FULL CONTEXT** - Read all relevant files, understand the structure, don't guess.
4. **FOLLOW EACH STEP METHODICALLY** - Go through the checklist step by step.
5. **VERIFY YOUR WORK** - Test, check, verify before committing.
6. **NEVER SKIP STEPS** - Not even to "save time" or because you "think you know."
7. **NEVER ASSUME** - Always read, always verify, always check.

**If you find yourself making assumptions or skipping steps, STOP. Go back and read the protocol again.**

---

## 📋 Pre-Change Checklist (MUST DO ALL - NO EXCEPTIONS)

**BEFORE YOU TOUCH ANY CODE:**
1. [ ] **I have read DEVELOPMENT_PROTOCOL.md completely** - Every word, every section
2. [ ] **I have read INSTRUCTIONS.md** - Understand project context
3. [ ] **I understand what I'm trying to fix** - Not guessing, actually understand
4. [ ] **I am ready to follow the checklist step by step** - No shortcuts

### Step 1: Understand the Full Context
- [ ] **Read ALL relevant files first** - Don't assume structure, actually read them
- [ ] **Understand parent/child component relationships** - Trace the hierarchy
- [ ] **Check how components are wrapped/nested** - Layout files, wrappers, containers
- [ ] **Identify all related files that might be affected** - Don't miss any
- [ ] **Map out the data flow and component hierarchy** - Draw it if needed
- [ ] **Check for parent containers with overflow, z-index, or positioning** - These affect children

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

## ❌ NEVER DO THESE - ABSOLUTE PROHIBITIONS

- ❌ **NEVER skip reading DEVELOPMENT_PROTOCOL.md**
  - Read it EVERY SINGLE TIME before making changes
  - Don't assume you remember it - read it again
  - This is not optional, it's mandatory

- ❌ **NEVER assume anything**
  - Don't assume you know the structure - READ IT
  - Don't assume you know the fix - VERIFY IT
  - Don't assume it will work - TEST IT
  - When in doubt, READ MORE CODE, don't guess

- ❌ **NEVER commit without verifying the fix is correct**
  - Don't push code that "should work" - verify it first
  - Run linters, check for errors
  - At minimum, verify logic/calculations are correct
  - Test the actual behavior, don't just check if it compiles

- ❌ **NEVER assume layout structure**
  - Always check if components are wrapped
  - Always verify parent container dimensions
  - Always check for nested layouts
  - Always check for overflow, z-index, positioning on parents

- ❌ **NEVER copy patterns without understanding**
  - Don't just copy numbers from working code
  - Understand WHY it works
  - Apply the principle, not just the values
  - If you don't understand why it works, READ MORE

- ❌ **NEVER rush to "fix" without understanding**
  - Take time to understand the problem fully
  - Read code thoroughly before changing it
  - Read ALL relevant files, not just the one you're editing
  - Map out the full context before making changes

- ❌ **NEVER skip verification steps**
  - Always check function signatures
  - Always verify calculations
  - Always run linters
  - Always check for TypeScript errors
  - Always test the actual behavior

- ❌ **NEVER make multiple "quick fixes" hoping one works**
  - One correct fix is better than five rushed attempts
  - If your first fix doesn't work, STOP and re-read the protocol
  - Understand why it didn't work before trying again

---

## ✅ Pre-Commit Checklist - MANDATORY VERIFICATION

**YOU CANNOT COMMIT UNTIL ALL OF THESE ARE CHECKED:**

- [ ] **I have read DEVELOPMENT_PROTOCOL.md completely** - Not skimmed, READ IT
- [ ] **I have read INSTRUCTIONS.md** - Understand project context
- [ ] **I have read ALL relevant files** - Every file that might be affected
- [ ] **I understand the full context** - Not guessing, actually understand
- [ ] **I understand the root cause** - Not just symptoms, the actual problem
- [ ] **I have verified function signatures match usage** - Checked actual code
- [ ] **I have calculated/verified all values** - Especially positioning, show your work
- [ ] **I have compared with working examples** - Found similar code that works
- [ ] **I have run linter checks** - No errors
- [ ] **I have verified the logic is correct** - Step by step, it makes sense
- [ ] **I have checked for TypeScript errors** - No compilation errors
- [ ] **I have accounted for all parent containers/layouts** - Checked overflow, z-index, positioning
- [ ] **I have tested the actual behavior** - Not just "it should work"
- [ ] **I am confident this fix is correct** - Not hoping, actually confident

**If you cannot check ALL of these, DO NOT COMMIT. Go back and do the work.**

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

## 📝 Critical Reminders

- **READ THIS PROTOCOL EVERY SINGLE TIME** - Don't assume you remember it
- **READ INSTRUCTIONS.md EVERY SINGLE TIME** - Understand the project context
- **Time spent understanding is NOT wasted** - it prevents rework and frustration
- **One correct fix is better than five rushed attempts** - Quality over speed
- **When in doubt, read more code, don't guess** - Reading is faster than debugging
- **Always show your work/calculations in commit messages** - Helps with review
- **If you're making assumptions, STOP** - Go back and read the code
- **If your fix doesn't work, STOP** - Re-read the protocol, understand why it failed
- **Following this protocol is not optional** - It's mandatory for every change

## 🎯 The Golden Rule

**READ → UNDERSTAND → VERIFY → THEN CODE**

Not: Code → Hope → Fix → Hope → Fix again

---

**Last Updated:** After user dropdown menu blocking issue
**Purpose:** Prevent repeated mistakes by enforcing systematic approach and mandatory reading
**Critical:** This protocol must be read and followed EVERY SINGLE TIME, without exception
