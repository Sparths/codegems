#!/bin/bash

echo "🧪 Testing Security Features..."

# Test Rate Limiting
echo "Testing rate limiting..."
for i in {1..10}; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:3000/api/users?action=login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# Test CSRF (should fail)
echo -e "\n\nTesting CSRF protection (should fail)..."
curl -s -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"projectName":"test","userId":"123","text":"test"}' \
  -w "\nStatus: %{http_code}\n"

echo -e "\n\n✅ Security tests completed. Check the results above."
