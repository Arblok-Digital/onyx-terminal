#!/usr/bin/env bash
cd "$(dirname "$0")" && npx vite build 2>&1 | tail -6
