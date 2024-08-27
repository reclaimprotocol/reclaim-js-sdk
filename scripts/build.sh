#!/bin/bash

# Delete existing dist folder
echo "Deleting existing dist folder"
rm -rf dist

# Build 
echo "Building the project"
tsup --dts
