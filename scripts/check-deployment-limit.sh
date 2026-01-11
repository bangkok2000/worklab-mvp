#!/bin/bash

# Check deployment limit status
# Usage: ./scripts/check-deployment-limit.sh

echo "📊 Deployment Limit Checker"
echo "=========================="
echo ""

# Check commits today
TODAY_COUNT=$(git log --since="today" --oneline | wc -l | tr -d ' ')
HOURS_24_COUNT=$(git log --since="24 hours ago" --oneline | wc -l | tr -d ' ')

echo "Commits today: $TODAY_COUNT"
echo "Commits in last 24 hours: $HOURS_24_COUNT"
echo ""

# Vercel free tier limit
LIMIT=100
REMAINING=$((LIMIT - HOURS_24_COUNT))

if [ $HOURS_24_COUNT -lt 50 ]; then
    echo "✅ Status: SAFE ($REMAINING deployments remaining)"
    echo "   You're well under the limit. Keep going!"
elif [ $HOURS_24_COUNT -lt 80 ]; then
    echo "⚠️  Status: WARNING ($REMAINING deployments remaining)"
    echo "   Approaching limit. Consider batching commits."
elif [ $HOURS_24_COUNT -lt 100 ]; then
    echo "🔴 Status: DANGER ($REMAINING deployments remaining)"
    echo "   Very close to limit! Batch your commits now."
else
    echo "❌ Status: LIMIT EXCEEDED"
    echo "   You've hit the 100 deployments/day limit."
    echo "   Wait 1 hour or until midnight UTC to reset."
fi

echo ""
echo "💡 Tip: Batch your commits to avoid hitting the limit!"
echo "   See DEPLOYMENT_WORKFLOW.md for best practices."
