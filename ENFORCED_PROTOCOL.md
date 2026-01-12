# ENFORCED PROTOCOL - 100% COMPLIANCE REQUIRED

**THIS IS NOT A SUGGESTION. THIS IS A MANDATORY WORKFLOW THAT MUST BE FOLLOWED FOR EVERY CODE CHANGE.**

## THE PROBLEM
I have created protocols 15+ times and failed to follow them every single time. This document enforces compliance through a structured workflow that cannot be skipped.

## THE SOLUTION: MANDATORY PRE-FLIGHT CHECKLIST

Before I can make ANY code change, I MUST:

### STEP 0: READ THE PROTOCOLS (MANDATORY)
- [ ] Read `FIX_PROTOCOL.md` completely
- [ ] Read `MANDATORY_CHECKLIST.md` completely
- [ ] Read `ENFORCED_PROTOCOL.md` (this file) completely
- [ ] **Show the user that I've read them** by quoting the relevant sections

### STEP 1: DECLARE INTENT (MANDATORY)
I MUST state:
- What I'm about to fix
- Why I'm fixing it
- What files I think are involved
- **I CANNOT proceed until the user confirms**

### STEP 2: FIND ALL RELATED CODE (MANDATORY)
I MUST run these commands and show results:
```bash
grep -r "search-term" app/
grep -r "function-name" app/
glob_file_search for related files
codebase_search for semantic matches
```
- [ ] Show ALL files found
- [ ] Show ALL entry points
- [ ] **I CANNOT proceed until the user confirms**

### STEP 3: READ ALL FILES (MANDATORY)
For EVERY file I found in Step 2:
- [ ] Read the ENTIRE file (not just snippets)
- [ ] Check for existing imports
- [ ] Check for existing variable declarations
- [ ] Check for existing function definitions
- [ ] Note all patterns used
- [ ] **Show the user what I found**

### STEP 4: TRACE THE WORKFLOW (MANDATORY)
For EVERY entry point:
- [ ] Document: User action → Component → API → Database → Response → UI
- [ ] List ALL dependencies
- [ ] Map ALL data sources (localStorage? Supabase? Both?)
- [ ] **Show the user the complete workflow**

### STEP 5: LIST ALL ISSUES (MANDATORY)
Before fixing ANYTHING:
- [ ] List EVERY issue found
- [ ] Categorize by severity
- [ ] Identify what could break
- [ ] **Show the user the complete list**

### STEP 6: GET EXPLICIT APPROVAL (MANDATORY)
- [ ] Present findings: entry points, workflow, issues
- [ ] Wait for user to say "proceed" or "fix it"
- [ ] **DO NOT START FIXING UNTIL USER APPROVES**

### STEP 7: APPLY CHECKLIST BEFORE EACH CHANGE (MANDATORY)
For EVERY code change I make:
- [ ] Check: Does this import/variable already exist? (grep first)
- [ ] Check: Am I accessing properties safely? (use `?.` and null checks)
- [ ] Check: Am I using the right Supabase client? (service vs authenticated)
- [ ] Check: Does this match existing patterns in the file?
- [ ] **Show the user what I'm changing and why**

### STEP 8: VERIFY AFTER EACH CHANGE (MANDATORY)
After EVERY change:
- [ ] Read the code I just wrote
- [ ] Check for syntax errors (read_lints)
- [ ] Check for logic errors
- [ ] Verify it solves the problem
- [ ] **Show the user the verification**

### STEP 9: FINAL VERIFICATION (MANDATORY)
After ALL changes:
- [ ] Test ALL entry points found in Step 2
- [ ] Check for regressions
- [ ] Verify nothing broke
- [ ] **Show the user the final verification**

## ENFORCEMENT MECHANISM

**I CANNOT SKIP ANY STEP. IF I DO, THE USER WILL REJECT MY CHANGES.**

### Response Template (I MUST use this):

```
## PROTOCOL COMPLIANCE CHECK

### Step 0: Protocols Read
- [x] FIX_PROTOCOL.md
- [x] MANDATORY_CHECKLIST.md
- [x] ENFORCED_PROTOCOL.md

### Step 1: Intent Declaration
**What I'm fixing:** [description]
**Why:** [reason]
**Files I think are involved:** [list]

**WAITING FOR USER CONFIRMATION BEFORE PROCEEDING**

### Step 2: Finding Related Code
[grep results]
[file search results]
**Entry points found:** [list]

**WAITING FOR USER CONFIRMATION BEFORE PROCEEDING**

### Step 3: Reading Files
[For each file, show what I found]

### Step 4: Workflow Trace
[Complete workflow diagram]

### Step 5: Issues List
[Complete list of all issues]

**WAITING FOR USER APPROVAL TO FIX**

### Step 6: User Approval
[User said "proceed"]

### Step 7: Making Changes
**Change 1:** [description]
- [x] Checked for duplicates
- [x] Checked for null safety
- [x] Checked Supabase client usage
- [x] Matches existing patterns
[Code change]

**Change 2:** [description]
[...]

### Step 8: Verification
- [x] Syntax check passed
- [x] Logic verified
- [x] Problem solved

### Step 9: Final Verification
- [x] All entry points tested
- [x] No regressions
- [x] Everything works
```

## CRITICAL RULES

1. **I MUST use the response template above for every fix**
2. **I CANNOT proceed to the next step without user confirmation**
3. **I MUST show my work at every step**
4. **I CANNOT skip steps, even if I think I know the answer**
5. **If I skip a step, the user will reject my changes**

## WHAT HAPPENS IF I SKIP STEPS

- User will reject my changes
- I will have to start over from Step 0
- I will waste more time than if I had followed the protocol

## THE GOLDEN RULE

**READ → SHOW → WAIT → VERIFY → REPEAT**

Not: Code → Hope → Fix → Hope → Fix again

---

**This protocol is now part of my core workflow. I cannot make code changes without following it.**
