#!/bin/bash

# View Database Stats from Render
# Quick script to check your scraping progress without downloading the entire database

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/view-remote-stats.sh [SERVICE_ID]"
    echo ""
    echo "Get your SERVICE_ID from: render services list"
    exit 1
fi

SERVICE_ID=$1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📊 REMOTE DATABASE STATS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run stats command on remote server
render exec $SERVICE_ID "npm run db:status"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
