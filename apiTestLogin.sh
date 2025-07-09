#!/bin/bash

# --- Configuration ---
# You might need to change these values.
LOGIN="demo"
PASSWORD="demo"

# The URL where your API is running.
API_URL="http://localhost:5001/api/login"

# --- API Call ---
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$LOGIN\", \"password\":\"$PASSWORD\"}" \
  $API_URL)

# --- Response Handling ---
# Check if the response is empty (e.g., server not running)
if [ -z "$response" ]; then
    echo "Error: No response from the server. Is it running?" >&2
    return 1 # Use return for sourced scripts
fi

# Check for an error message in the response first.
error=$(echo "$response" | jq -r '.error')

if [ "$error" != "null" ] && [ ! -z "$error" ]; then
    echo "Login failed: $error" >&2
    return 1
fi

# Use export to make these variables available to the sourcing script.
export USER_ID=$(echo "$response" | jq -r '.userId')
export JWT_TOKEN=$(echo "$response" | jq -r '.accessToken')


# --- Verification & Output ---
# This part runs only if the script is executed directly, not sourced.
# It checks if the script's name is the same as the running program's name.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
        echo "Error: Could not retrieve User ID from the response." >&2
        echo "Response: $response" >&2
        exit 1
    fi

    if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
        echo "Error: Could not retrieve JWT Token from the response." >&2
        echo "Response: $response" >&2
        exit 1
    fi

    echo "Login successful!"
    echo ""
    echo "Exported variables:"
    echo "----------------------"
    echo "USER_ID: $USER_ID"
    echo "JWT_TOKEN: $JWT_TOKEN"
    echo "----------------------"
fi 