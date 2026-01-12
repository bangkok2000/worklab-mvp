# MANDATORY CHECKLIST - READ BEFORE EVERY CODE CHANGE

**THIS CHECKLIST MUST BE COMPLETED FOR EVERY SINGLE CODE CHANGE. NO EXCEPTIONS.**

## BEFORE TOUCHING ANY CODE:

### 1. Read the ENTIRE file first
- [ ] Read the complete file from start to finish
- [ ] Note ALL existing imports
- [ ] Note ALL existing variable declarations
- [ ] Note ALL existing function definitions

### 2. Check for duplicates
- [ ] Search for the variable/import name I'm about to add
- [ ] If it exists, REUSE it, don't create a new one
- [ ] If importing, check if import already exists at top of file

### 3. Check for null/undefined
- [ ] Every property access: `obj?.prop` not `obj.prop`
- [ ] Every array access: `arr?.[0]` not `arr[0]`
- [ ] Every function call: check if function exists first

### 4. Check Supabase client usage
- [ ] RLS-blocked queries → Use `serviceSupabase` (service key)
- [ ] User-specific queries → Use `authenticatedSupabase` (with user token)
- [ ] NEVER use `authenticatedSupabase` for team member lookups

### 5. Verify the fix
- [ ] Read the code I just wrote
- [ ] Check for syntax errors
- [ ] Check for logic errors
- [ ] Verify it actually solves the problem
- [ ] DON'T claim it's fixed until verified

## AFTER MAKING CHANGES:

### 6. Check for regressions
- [ ] Did I break anything else?
- [ ] Are there any new errors?
- [ ] Does the code still compile?

### 7. Test the actual behavior
- [ ] Does it work for the owner?
- [ ] Does it work for the member?
- [ ] Are the IDs matching correctly?
- [ ] Are the values displaying correctly?

## CRITICAL RULES:

1. **NEVER import/create a variable without checking if it exists first**
2. **NEVER access properties without null checks**
3. **NEVER use authenticatedSupabase for RLS-blocked queries**
4. **NEVER claim something is fixed without verifying it**
5. **ALWAYS read the entire file before editing**

## IF I SKIP ANY STEP:
- STOP immediately
- Go back and complete ALL steps
- Don't proceed until checklist is complete
