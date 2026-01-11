# Pending Fixes & Improvements

**Last Updated:** January 2025  
**Status:** Prioritized list of remaining issues

---

## 🔴 High Priority (Should Fix Soon)

### 1. UI Refinement & Design Polish ⚠️ HIGH PRIORITY

**From TODO.md Section 3.4 - User Feedback:**
> "Right now the overall feel is that most of the elements are taking up a lot of prime space, the fonts, icons etc might be too big, empty space at the bottom, side bar menu column length is more that it should be, etc. Also, the colorway/color palette also not appealing or elegantly professional."

**Issues:**
- [ ] **Spacing & Layout Optimization**
  - Reduce font sizes (currently too large)
  - Reduce icon sizes (currently too large)
  - Optimize padding/margins (elements taking too much prime space)
  - Fix empty space at bottom of pages
  - Reduce sidebar menu column width (currently too wide)
  - Optimize panel widths for better content-to-chrome ratio
  - Improve vertical rhythm and spacing consistency

- [ ] **Color Palette & Visual Design**
  - Redesign color scheme for more elegant, professional feel
  - Current purple/teal accents may not be appealing enough
  - Consider more sophisticated color palette (e.g., muted tones, better contrast)
  - Improve color harmony and visual hierarchy
  - Ensure accessibility (WCAG contrast ratios)
  - Create cohesive design system with consistent color usage

- [ ] **Typography Refinement**
  - Review and optimize font sizes across all components
  - Improve line heights for better readability
  - Ensure consistent font weights and styles

- [ ] **Component Density**
  - Make components more compact where appropriate
  - Reduce unnecessary whitespace
  - Optimize information density

**Effort:** 5-7 days  
**Impact:** High - Directly affects user experience and professional appearance

---

### 2. Bug 2: Project Page Returns 404

**Issue:**
- After creating a new project, clicking on it navigates to `/app/projects/project-{id}` which returns 404

**Root Cause:**
- Dynamic route `/app/projects/[projectId]/page.tsx` may not exist or has wrong path

**Fix Needed:**
- [ ] Verify the dynamic route exists at correct path
- [ ] Check navigation URL matches route structure
- [ ] Test project creation and navigation flow

**Effort:** 1-2 hours  
**Impact:** High - Blocks core functionality (project access)

---

### 3. Bug 3: Cache Issue (Old UI Appearing)

**Issue:**
- Sometimes the old UI appears with:
  - "Add Content" button at top of sidebar (should be FAB)
  - "Integrations" as separate menu item (should be in Settings)
  - Guest indicator showing even when signed in with BYOK

**Root Cause:**
- Possible Vercel cache or build issue
- May be related to Bug 5 (inconsistent auth state)

**Fix Needed:**
- [ ] Investigate Vercel cache configuration
- [ ] Check for service worker or browser cache issues
- [ ] Verify VersionCheck component is working
- [ ] Add cache-busting strategy if needed

**Effort:** 2-4 hours  
**Impact:** Medium - Affects user experience but intermittent

---

## 🟡 Medium Priority (Should Fix This Month)

### 4. Bug 5: Inconsistent Auth State (Edge Cases)

**Status:** ⚠️ MOSTLY FIXED - Logic correct, but may have edge cases

**Remaining Issues:**
- [ ] Test edge cases:
  - Sign in while having BYOK key
  - Add BYOK key while signed in
  - Remove BYOK key while signed in
  - Rapid sign in/out transitions
- [ ] Add loading states to prevent race conditions
- [ ] Coordinate auth loading with BYOK loading states

**Effort:** 2-3 hours  
**Impact:** Medium - Edge cases may cause flicker or incorrect state

---

### 5. Prompt Engineering Improvements

**From PROMPT_ENGINEERING_ANALYSIS.md:**

**Immediate Improvements (Next 1-2 Weeks):**
- [ ] **Simplify prompts** - Reduce verbosity by 50%, keep critical instructions
- [ ] **Add few-shot examples** - Show model what good answers look like
- [ ] **Adjust temperature** - Use 0.3-0.5 for synthesis tasks (currently 0.1 for all)

**Short-term (Next Month):**
- [ ] **Context-aware prompting** - Different prompts for PDFs, YouTube, web
- [ ] **Chain-of-thought** - Step-by-step reasoning for complex questions
- [ ] **Improve query expansion** - Use LLM-based expansion for complex queries

**Effort:** 3-5 days  
**Impact:** Medium-High - Improves AI answer quality and user satisfaction

---

## 🟢 Low Priority (Nice to Have)

### 6. Minor TODOs in Code

**Found in codebase:**
- [ ] `app/components/layout/AppShell.tsx` line 123: Command palette TODO
- [ ] `app/api/upload/route.ts` line 270: Link API key ID when BYOK implemented
- [ ] `app/api/ask/route.ts` line 798: Link API key ID when BYOK implemented

**Effort:** 1-2 hours  
**Impact:** Low - Code cleanup, not blocking functionality

---

### 7. Onboarding & Polish

**From TODO.md Section 3.5:**
- [ ] First-run tutorial
- [ ] Sample project with demo content
- [ ] Tooltips and hints
- [ ] Empty state guidance
- [ ] Error messages that help
- [ ] Loading state polish

**Effort:** 3-4 days  
**Impact:** Medium - Improves new user experience

---

## 📊 Summary by Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **High** | UI Refinement & Design | 5-7 days | High |
| **High** | Bug 2: Project 404 | 1-2 hours | High |
| **High** | Bug 3: Cache Issue | 2-4 hours | Medium |
| **Medium** | Bug 5: Auth Edge Cases | 2-3 hours | Medium |
| **Medium** | Prompt Engineering | 3-5 days | Medium-High |
| **Low** | Code TODOs | 1-2 hours | Low |
| **Low** | Onboarding | 3-4 days | Medium |

---

## 🎯 Recommended Fix Order

### Week 1: Critical Bugs
1. **Bug 2: Project 404** (1-2 hours) - Blocks core functionality
2. **Bug 3: Cache Issue** (2-4 hours) - Affects user experience
3. **Bug 5: Auth Edge Cases** (2-3 hours) - Polish existing fix

### Week 2-3: UI Refinement
4. **UI Refinement & Design** (5-7 days) - High user impact

### Week 4: AI Quality
5. **Prompt Engineering** (3-5 days) - Improves answer quality

### Later: Polish
6. **Onboarding** (3-4 days) - Nice to have
7. **Code TODOs** (1-2 hours) - Cleanup

---

## 📝 Notes

- **File Upload Size Limit:** ✅ Fixed (implementation complete, setup pending)
- **Bugs 1 & 4:** ✅ Fixed (BYOK key issues)
- **Flashcards:** ✅ Complete
- **AI Hallucination Prevention:** ✅ Complete

---

**Next Action:** Start with Bug 2 (Project 404) as it's quick and blocks core functionality.
