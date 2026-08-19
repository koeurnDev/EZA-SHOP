#!/bin/bash
# Cloudflare Pages build script

set -e  # Exit on error

echo "Building Vibe Lifestyle webapp..."
cd webapp

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build complete! Output is in webapp/dist"
