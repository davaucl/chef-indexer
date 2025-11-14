#!/bin/bash

# Download Database from Render
# This script helps you download your SQLite database from Render to your local machine

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📥 DATABASE DOWNLOAD FROM RENDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if render CLI is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI not found!"
    echo ""
    echo "To install Render CLI:"
    echo "  brew tap render-oss/render"
    echo "  brew install render"
    echo ""
    echo "Or visit: https://render.com/docs/cli"
    exit 1
fi

echo "✅ Render CLI found"
echo ""

# Check if logged in
if ! render whoami &> /dev/null; then
    echo "⚠️  Not logged in to Render"
    echo "Please login first:"
    echo "  render login"
    exit 1
fi

echo "✅ Logged in to Render as: $(render whoami)"
echo ""

# List services
echo "📋 Fetching your services..."
render services list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "To download your database:"
echo "1. Find your service ID from the list above"
echo "2. Run: render ssh [SERVICE_ID]"
echo "3. Then on the server, run: cat /opt/render/project/data/creators.db | base64"
echo "4. Copy the output and save locally:"
echo "   echo '[PASTE_BASE64_HERE]' | base64 -d > ./data/creators.db"
echo ""
echo "Or use the automated download:"
echo "  render exec [SERVICE_ID] 'cat /opt/render/project/data/creators.db' > ./data/creators-download.db"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
