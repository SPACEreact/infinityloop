#!/bin/bash

# Ensure the script is executable
chmod +x build.sh

# Set up error catching and logging
echo "Starting build process..."

# Install dependencies with proper error handling
echo "Installing dependencies..."
npm ci || { echo "Error: npm ci failed. Check dependencies."; exit 1; }



# Run the build command and catch errors
echo "Running build script..."
npm run build || { echo "Error: npm run build failed. Check build script."; exit 1; }

# Success message
echo "Build completed successfully."
