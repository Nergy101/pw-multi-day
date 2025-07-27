#!/bin/bash

# Test Flow Script - Demonstrates the complete pipeline with Deno
# This script simulates the Monday -> Tuesday pipeline flow

set -e  # Exit on any error

echo "🚀 Starting Playwright Trial Test Flow (Deno)"
echo "============================================="

# Step 1: Install Playwright browsers
echo ""
echo "🌐 Installing Playwright browsers..."
deno task install

# Step 2: Generate test data (Monday pipeline simulation)
echo ""
echo "📊 Step 1: Generating test data (Monday Pipeline)..."
deno task test:generate

# Step 3: Simulate artifact download (Tuesday pipeline simulation)
echo ""
echo "📥 Step 2: Simulating artifact download..."
mkdir -p downloaded-artifacts
cp output/* downloaded-artifacts/ 2>/dev/null || echo "No files to copy (this is normal for first run)"

# Step 4: Validate the data (Tuesday pipeline simulation)
echo ""
echo "🔍 Step 3: Validating test data (Tuesday Pipeline)..."
deno task test:validate

# Step 5: Show results
echo ""
echo "📋 Results Summary:"
echo "=================="

if [ -f "output/validation-report.txt" ]; then
    echo ""
    cat output/validation-report.txt
else
    echo "✅ Data generation completed successfully"
    echo "📁 Check the 'output/' directory for generated files"
fi

echo ""
echo "🎉 Test flow completed successfully!"
echo ""
echo "📁 Generated files:"
echo "   - output/person-data.json (main data)"
echo "   - output/person-data.csv (CSV format)"
echo "   - output/metadata.json (generation info)"
echo "   - output/validation-report.json (validation results)"
echo "   - output/validation-report.txt (human-readable report)"
echo ""
echo "🔧 To run individual steps:"
echo "   - deno task test:generate (generate data only)"
echo "   - deno task test:validate (validate data only)"
echo "   - deno task test (run all tests)"
echo ""
echo "🐿️  Using Deno for better TypeScript support and faster execution!" 