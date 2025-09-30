#!/bin/bash

# Build script for Thunder Copilot extension
# Creates a .xpi file (which is a renamed ZIP file) containing the extension

set -e

echo "Building Thunder Copilot extension..."

# Create build directory
BUILD_DIR="build"
XPI_NAME="thunder-copilot.xpi"

# Clean previous build
rm -rf "$BUILD_DIR"
rm -f "$XPI_NAME"

# Create temp directory and copy extension files
mkdir -p "$BUILD_DIR"

# Copy all necessary files for the extension
cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp sidebar.html "$BUILD_DIR/"
cp -r icons "$BUILD_DIR/"

# Create the .xpi file (which is just a ZIP)
cd "$BUILD_DIR"
zip -r "../$XPI_NAME" *
cd ..

# Clean up build directory
rm -rf "$BUILD_DIR"

echo "Extension packaged as $XPI_NAME"
echo "To install in Thunderbird:"
echo "1. Open Thunderbird"
echo "2. Go to Tools > Add-ons and Themes"
echo "3. Click the gear icon and select 'Install Add-on From File...'"
echo "4. Select the $XPI_NAME file"