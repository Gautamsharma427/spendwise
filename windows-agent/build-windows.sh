#!/usr/bin/env sh
set -eu

agent_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
output_directory="$agent_directory/../frontend/public"
mkdir -p "$output_directory"
(
  cd "$agent_directory"
  GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o "$output_directory/SpendWiseAgent.exe" .
)
printf 'Built %s\n' "$output_directory/SpendWiseAgent.exe"
