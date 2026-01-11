# Deployment Workflow Guide

**Problem:** Vercel free tier limits to 100 deployments/day. Each push to `main` triggers a deployment.

**Solution:** Batch commits locally, then push once when ready.

---

## 🎯 Best Practices

### ✅ DO: Batch Commits
- Make multiple changes locally
- Test locally with `npm run dev`
- Commit once when feature is complete
- Push once to trigger single deployment

### ❌ DON'T: Commit Every Small Change
- Don't push after every single file edit
- Don't push empty commits just to trigger deployment
- Don't push WIP commits to main

---

## 📋 Recommended Workflow

### For Development:

```bash
# 1. Make all your changes locally
# Edit files, test, iterate...

# 2. Test locally
npm run dev
# Test at http://localhost:3000

# 3. When ready, commit once
git add .
git commit -m "feat: Complete feature X with improvements Y and Z"

# 4. Push once
git push origin main
```

### For Quick Fixes:

```bash
# If it's a critical bug fix, commit and push immediately
git add .
git commit -m "fix: Critical bug in feature X"
git push origin main
```

### For Multiple Related Changes:

```bash
# Make all related changes
# Then commit together with descriptive message
git add .
git commit -m "refactor: Improve AI prompts and increase temperature

- Removed all 'couldn't find' language
- Increased temperature to 0.3-0.5
- Added relationship question detection
- Made prompts more encouraging"

git push origin main
```

---

## 🔧 Helper Scripts

### Option 1: Manual Batching (Recommended)

Just work locally, test, then commit once when ready.

### Option 2: Use Git Stash

```bash
# Make changes
# Stash if needed
git stash

# Continue working
# When ready, apply and commit
git stash pop
git add .
git commit -m "feat: Complete feature"
git push origin main
```

---

## 📊 Deployment Limit Tracking

### Check Your Commits Today:
```bash
git log --since="today" --oneline | wc -l
```

### Check Commits in Last 24 Hours:
```bash
git log --since="24 hours ago" --oneline | wc -l
```

### Safe Limit:
- **Target:** < 50 commits/day (leaves buffer)
- **Warning:** > 80 commits/day (approaching limit)
- **Danger:** > 100 commits/day (will hit limit)

---

## 🚨 If You Hit the Limit

1. **Wait 1 hour** - Limit resets after 1 hour
2. **Wait until midnight UTC** - Daily reset
3. **Test locally** - Use `npm run dev` to test changes
4. **Upgrade to Pro** - Unlimited deployments ($20/month)

---

## 💡 Tips

1. **Test Locally First:** Always test with `npm run dev` before deploying
2. **Meaningful Commits:** Group related changes together
3. **Descriptive Messages:** Write clear commit messages
4. **Use Branches:** For major features, use feature branches
5. **Monitor Usage:** Check commit count if doing many iterations

---

## 📝 Example: AI Prompt Improvements

**❌ Bad (Multiple Deployments):**
```bash
git commit -m "fix: Remove couldn't find language"
git push
git commit -m "fix: Increase temperature"
git push
git commit -m "fix: Add relationship detection"
git push
# = 3 deployments
```

**✅ Good (Single Deployment):**
```bash
# Make all changes locally
# Test locally
npm run dev

# Commit once
git add .
git commit -m "fix: Improve AI prompts for better responses

- Removed all 'couldn't find' language
- Increased temperature to 0.3-0.5
- Added relationship question detection
- Made prompts more encouraging and helpful"

git push origin main
# = 1 deployment
```

---

**Remember:** Each push = 1 deployment. Batch your work, test locally, then deploy once!
