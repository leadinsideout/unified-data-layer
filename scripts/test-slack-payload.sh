#!/bin/bash
# Test Slack payload JSON validity
# Purpose: Validate Slack notification payloads locally before pushing
# Usage: ./scripts/test-slack-payload.sh [checkpoint_number]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get checkpoint number from argument or default to latest
CHECKPOINT_NUM="${1:-$(git describe --tags --abbrev=0 | grep -oP 'checkpoint-\K\d+' || echo "9")}"

echo "🧪 Testing Slack Payload for Checkpoint $CHECKPOINT_NUM"
echo "================================================"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  macOS:  brew install jq"
    echo "  Linux:  apt install jq"
    echo ""
    exit 1
fi

# Map checkpoint numbers to names and phases (same as workflow)
case "$CHECKPOINT_NUM" in
  1)
    CHECKPOINT_NAME="Local MVP Foundation"
    PHASE="1"
    ;;
  2)
    CHECKPOINT_NAME="Vercel Deployment + Workflow Automation"
    PHASE="1"
    ;;
  3)
    CHECKPOINT_NAME="Custom GPT Integration (North Star)"
    PHASE="1"
    ;;
  4)
    CHECKPOINT_NAME="Schema Migration & Core Architecture"
    PHASE="2"
    ;;
  5)
    CHECKPOINT_NAME="Multi-Type Processing Pipeline"
    PHASE="2"
    ;;
  6)
    CHECKPOINT_NAME="Type-Aware Search with Multi-Dimensional Filtering"
    PHASE="2"
    ;;
  7)
    CHECKPOINT_NAME="Custom GPT Integration & Phase 2 Validation"
    PHASE="2"
    ;;
  8)
    CHECKPOINT_NAME="PII Scrubbing Pipeline"
    PHASE="3"
    ;;
  9)
    CHECKPOINT_NAME="Row-Level Security (RLS)"
    PHASE="3"
    ;;
  10)
    CHECKPOINT_NAME="API Key Management"
    PHASE="3"
    ;;
  11)
    CHECKPOINT_NAME="MCP Server Development"
    PHASE="4"
    ;;
  12)
    CHECKPOINT_NAME="Enhanced Custom GPT"
    PHASE="4"
    ;;
  13)
    CHECKPOINT_NAME="Multi-Tenant Authentication"
    PHASE="4"
    ;;
  *)
    CHECKPOINT_NAME="Checkpoint $CHECKPOINT_NUM"
    PHASE="Unknown"
    ;;
esac

VERSION="v0.${CHECKPOINT_NUM}.0"
TAG_NAME="${VERSION}-checkpoint-${CHECKPOINT_NUM}"

echo "Checkpoint: $CHECKPOINT_NUM"
echo "Name: $CHECKPOINT_NAME"
echo "Phase: $PHASE"
echo "Version: $VERSION"
echo ""

# Get changelog (limit to 5 most recent commits)
echo "Fetching changelog..."
LAST_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
  CHANGELOG_RAW=$(git log --format="- %s" HEAD | head -5)
else
  CHANGELOG_RAW=$(git log --format="- %s" ${LAST_TAG}..HEAD | head -5)
fi

# Escape for JSON using jq
CHANGELOG_JSON=$(echo "$CHANGELOG_RAW" | jq -Rs . | sed 's/^"//;s/"$//')

echo "Changelog (first 5 commits):"
echo "$CHANGELOG_RAW"
echo ""
echo "Changelog (JSON-escaped):"
echo "$CHANGELOG_JSON"
echo ""

# Build payload exactly as workflow does
cat > /tmp/slack-payload-test.json <<EOF
{
  "text": "🎯 Checkpoint ${CHECKPOINT_NUM} Complete: ${CHECKPOINT_NAME}",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🎯 Checkpoint ${CHECKPOINT_NUM} Complete"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*${CHECKPOINT_NAME}*"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Phase:*\nPhase ${PHASE}"
        },
        {
          "type": "mrkdwn",
          "text": "*Version:*\n${VERSION}"
        },
        {
          "type": "mrkdwn",
          "text": "*Checkpoint:*\n${CHECKPOINT_NUM}"
        },
        {
          "type": "mrkdwn",
          "text": "*Tag:*\n${TAG_NAME}"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Recent Changes:*\n${CHANGELOG_JSON}"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Checkpoint Results"
          },
          "url": "https://github.com/leadinsideout/unified-data-layer/blob/main/docs/checkpoints/checkpoint-${CHECKPOINT_NUM}-results.md"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Release"
          },
          "url": "https://github.com/leadinsideout/unified-data-layer/releases/tag/${TAG_NAME}"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "All Checkpoints"
          },
          "url": "https://github.com/leadinsideout/unified-data-layer/tree/main/docs/checkpoints"
        }
      ]
    }
  ]
}
EOF

# Validate JSON
echo "================================================"
echo "Validating JSON payload..."
echo ""

if jq empty /tmp/slack-payload-test.json 2>/tmp/jq-error.txt; then
  echo -e "${GREEN}✅ JSON is valid!${NC}"
  echo ""
  echo "Payload preview:"
  echo "----------------"
  jq . /tmp/slack-payload-test.json
  echo ""
  echo -e "${GREEN}✅ Test passed! Payload is ready to send.${NC}"
  echo ""
  echo "File saved to: /tmp/slack-payload-test.json"
  exit 0
else
  echo -e "${RED}❌ JSON is INVALID!${NC}"
  echo ""
  echo "Error:"
  cat /tmp/jq-error.txt
  echo ""
  echo "Problematic payload:"
  cat /tmp/slack-payload-test.json
  echo ""
  exit 1
fi
