#!/bin/bash
# Cloudflare Pages build script

# Navigate to webapp directory and build
cd webapp
npm install
npm run build
