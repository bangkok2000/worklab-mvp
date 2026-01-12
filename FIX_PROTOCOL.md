# FIX PROTOCOL - MANDATORY STEPS BEFORE ANY FIX

**THIS PROTOCOL MUST BE FOLLOWED FOR EVERY SINGLE FIX. NO EXCEPTIONS.**

## ⚠️ CRITICAL RULE
**NEVER fix anything without completing ALL steps below. If you skip steps, you WILL break other things.**

---

## STEP 1: FIND ALL RELATED CODE (MANDATORY)

Before touching ANY code, you MUST:

1. **Search for ALL API endpoints/function calls:**
   ```bash
   grep -r "/api/endpoint-name" app/
   grep -r "functionName" app/
   ```

2. **Find ALL files that use the affected feature:**
   ```bash
   glob_file_search for related files
   codebase_search for semantic matches
   ```

3. **List ALL entry points:**
   - Frontend components that call it
   - API routes that use it
   - Utility functions that reference it
   - Database queries that touch it

4. **Show the user the complete list BEFORE proceeding**

---

## STEP 2: TRACE THE ENTIRE WORKFLOW (MANDATORY)

For EVERY entry point found in Step 1:

1. **Trace the complete flow:**
   - User action → Frontend component → API call → Database → Response → UI update
   - Document EVERY step in the chain

2. **Identify ALL dependencies:**
   - What data structures are used?
   - What other APIs/functions are called?
   - What database tables are involved?
   - What localStorage keys are used?

3. **Map ALL data sources:**
   - Is it localStorage? Supabase? Both?
   - Are there multiple systems that need to stay in sync?

4. **Show the user the workflow diagram BEFORE proceeding**

---

## STEP 3: LIST ALL ISSUES (MANDATORY)

Before fixing ANYTHING:

1. **List EVERY issue you found:**
   - Authentication issues
   - Data source mismatches (localStorage vs Supabase)
   - Missing error handling
   - Inconsistent patterns
   - Broken dependencies

2. **Identify ALL potential problems:**
   - What could break if I change X?
   - What other code depends on this?
   - Are there edge cases I'm missing?

3. **Categorize by severity:**
   - Critical (breaks functionality)
   - High (causes errors)
   - Medium (inconsistencies)
   - Low (code quality)

4. **Show the user the complete issue list BEFORE fixing**

---

## STEP 4: GET APPROVAL (MANDATORY)

**DO NOT START FIXING UNTIL USER APPROVES:**

1. Present the findings:
   - All entry points found
   - Complete workflow traced
   - All issues identified

2. Wait for user approval:
   - "Yes, fix all of these"
   - "Also check X"
   - "Don't forget Y"

3. **ONLY THEN proceed to fix**

---

## STEP 5: FIX ALL ISSUES AT ONCE (MANDATORY)

When fixing:

1. **Fix ALL issues in ONE batch:**
   - Don't fix one, test, then fix another
   - Fix everything related in one go
   - Ensure consistency across ALL entry points

2. **Update ALL affected files:**
   - If you fix API route, check ALL frontend callers
   - If you fix frontend, check ALL API routes it calls
   - If you change data structure, update ALL usages

3. **Maintain consistency:**
   - Use the same pattern everywhere
   - Don't mix localStorage and Supabase without sync
   - Don't create duplicate systems

4. **Test ALL paths:**
   - Test every entry point
   - Test error cases
   - Test edge cases

---

## STEP 6: VERIFY NOTHING BROKE (MANDATORY)

After fixing:

1. **Check ALL related functionality:**
   - Does it still work?
   - Did I break anything?
   - Are there new errors?

2. **Verify ALL entry points:**
   - Test each path you found in Step 1
   - Ensure they all work correctly

3. **Check for regressions:**
   - Did I break something that was working?
   - Are there new issues I introduced?

---

## COMMON MISTAKES TO AVOID

❌ **DON'T:**
- Fix one file without checking others
- Assume there's only one entry point
- Mix localStorage and Supabase without sync
- Fix piecemeal (one issue at a time)
- Forget to check all API routes
- Skip workflow tracing
- Start fixing before listing all issues

✅ **DO:**
- Find ALL related code first
- Trace ENTIRE workflow
- List ALL issues
- Get approval
- Fix ALL at once
- Test ALL paths
- Verify nothing broke

---

## EXAMPLE: Fixing Team Invite

**WRONG WAY (what I did):**
1. See error in TeamSettings.tsx
2. Fix authentication in API route
3. Done (but missed /app/team/page.tsx)

**RIGHT WAY (what I should have done):**
1. `grep -r "/api/teams/invite"` → Found 2 callers
2. Read both files → Found localStorage vs Supabase mismatch
3. List all issues: auth, data source mismatch, two systems
4. Get approval
5. Fix both entry points + sync issue
6. Test both paths

---

## REMEMBER

**If you're not sure, ASK. If you haven't checked everything, DON'T FIX YET.**

**One comprehensive fix > Ten piecemeal fixes that break things**
