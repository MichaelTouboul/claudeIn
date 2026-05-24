#!/bin/bash
# Claude Code hook → POST event to Agent Manager API
# Reads hook data from stdin (JSON) and forwards to the events endpoint

API_URL="${AGENT_MANAGER_URL:-http://localhost:3456}"
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
EVENT_TYPE=$(echo "$INPUT" | jq -r '.event_type // "unknown"')
AGENT_NAME=$(echo "$INPUT" | jq -r '.agent_name // "unknown"')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

curl -s -X POST "$API_URL/api/hooks/event" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_name\": \"$AGENT_NAME\",
    \"session_id\": \"$SESSION_ID\",
    \"event_type\": \"$EVENT_TYPE\",
    \"tool_name\": \"$TOOL_NAME\",
    \"payload\": $INPUT
  }" > /dev/null 2>&1 &
