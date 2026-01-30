#!/bin/bash

# Comprehensive admin endpoint testing script

API_KEY="sk_test_99e85a679a70a554eb42cdace768af399cc4d86b474ad40e61d4e2a70f1b950b"
BASE_URL="http://localhost:3000"

echo "🧪 Admin Endpoint Testing"
echo "=========================================="
echo ""

# Test 1: List all users
echo "1️⃣  GET /api/admin/users - List all users"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $API_KEY" $BASE_URL/api/admin/users)
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Status: $HTTP_STATUS"
  echo "Response: $(echo $BODY | json_pp | head -20)"
else
  echo "❌ Status: $HTTP_STATUS"
  echo "Error: $BODY"
fi
echo ""

# Test 2: Get specific user (coach)
echo "2️⃣  GET /api/admin/users/:id - Get specific user"
COACH_ID="550e8400-e29b-41d4-a716-446655440010"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $API_KEY" $BASE_URL/api/admin/users/$COACH_ID)
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Status: $HTTP_STATUS"
  echo "Response: $(echo $BODY | json_pp | head -15)"
else
  echo "❌ Status: $HTTP_STATUS"
  echo "Error: $BODY"
fi
echo ""

# Test 3: List all API keys
echo "3️⃣  GET /api/admin/api-keys - List all API keys"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $API_KEY" $BASE_URL/api/admin/api-keys)
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Status: $HTTP_STATUS"
  KEYCOUNT=$(echo $BODY | grep -o '"id"' | wc -l | xargs)
  echo "Found $KEYCOUNT API keys"
else
  echo "❌ Status: $HTTP_STATUS"
  echo "Error: $BODY"
fi
echo ""

# Test 4: Create new coach
echo "4️⃣  POST /api/admin/users - Create new coach"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"coach","email":"test.coach@example.com","name":"Test Coach"}' \
  $BASE_URL/api/admin/users)
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Status: $HTTP_STATUS (Created)"
  NEW_COACH_ID=$(echo $BODY | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "New coach ID: $NEW_COACH_ID"
else
  echo "⚠️  Status: $HTTP_STATUS"
  echo "Response: $BODY"
fi
echo ""

# Test 5: Create API key for new coach (if created)
if [ ! -z "$NEW_COACH_ID" ]; then
  echo "5️⃣  POST /api/admin/api-keys - Create API key for coach"
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Coach Key\",\"owner_type\":\"coach\",\"owner_id\":\"$NEW_COACH_ID\"}" \
    $BASE_URL/api/admin/api-keys)
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "201" ]; then
    echo "✅ Status: $HTTP_STATUS (Created)"
    NEW_KEY=$(echo $BODY | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)
    NEW_KEY_ID=$(echo $BODY | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
    echo "New API key ID: $NEW_KEY_ID"
    echo "API key (shown once): ${NEW_KEY:0:20}..."
  else
    echo "❌ Status: $HTTP_STATUS"
    echo "Error: $BODY"
  fi
  echo ""

  # Test 6: Revoke the newly created API key
  if [ ! -z "$NEW_KEY_ID" ]; then
    echo "6️⃣  PUT /api/admin/api-keys/:id/revoke - Revoke API key"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT \
      -H "Authorization: Bearer $API_KEY" \
      $BASE_URL/api/admin/api-keys/$NEW_KEY_ID/revoke)
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

    if [ "$HTTP_STATUS" = "200" ]; then
      echo "✅ Status: $HTTP_STATUS"
      echo "Response: $BODY"
    else
      echo "❌ Status: $HTTP_STATUS"
      echo "Error: $BODY"
    fi
    echo ""

    # Test 7: Reactivate the API key
    echo "7️⃣  PUT /api/admin/api-keys/:id/activate - Reactivate API key"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT \
      -H "Authorization: Bearer $API_KEY" \
      $BASE_URL/api/admin/api-keys/$NEW_KEY_ID/activate)
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

    if [ "$HTTP_STATUS" = "200" ]; then
      echo "✅ Status: $HTTP_STATUS"
      echo "Response: $BODY"
    else
      echo "❌ Status: $HTTP_STATUS"
      echo "Error: $BODY"
    fi
    echo ""

    # Test 8: Delete the API key
    echo "8️⃣  DELETE /api/admin/api-keys/:id - Delete API key"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE \
      -H "Authorization: Bearer $API_KEY" \
      $BASE_URL/api/admin/api-keys/$NEW_KEY_ID)
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

    if [ "$HTTP_STATUS" = "200" ]; then
      echo "✅ Status: $HTTP_STATUS"
      echo "Response: $BODY"
    else
      echo "❌ Status: $HTTP_STATUS"
      echo "Error: $BODY"
    fi
    echo ""
  fi

  # Test 9: Delete the test coach
  echo "9️⃣  DELETE /api/admin/users/:id - Delete test coach"
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $API_KEY" \
    $BASE_URL/api/admin/users/$NEW_COACH_ID)
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Status: $HTTP_STATUS"
    echo "Response: $BODY"
  else
    echo "❌ Status: $HTTP_STATUS"
    echo "Error: $BODY"
  fi
  echo ""
fi

echo "=========================================="
echo "✅ All admin endpoint tests complete!"
