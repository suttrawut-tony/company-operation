#!/bin/bash
echo "=== Company Operation Setup ==="
echo ""

# 1. Install dependencies
echo "1. Installing dependencies..."
cd api && npm install
echo ""

# 2. Create database
echo "2. Creating database..."
createdb sda_operation 2>/dev/null || echo "Database already exists"

# 3. Import database
echo "3. Importing database..."
psql sda_operation < database.sql
echo ""

# 3b. Ensure admin login always works (admin@sala-daeng.com / 111111)
echo "3b. Ensuring admin login..."
psql sda_operation < ensure-admin.sql
echo ""

# 4. Start server
echo "4. Starting server..."
echo ""
echo "=== Setup complete! ==="
echo ""
echo "Login: admin@sala-daeng.com / 111111"
echo ""
echo "Run this to start:"
echo "  cd api && DATABASE_URL=postgresql://\$USER@localhost:5432/sda_operation JWT_SECRET=sda-operation-dev-secret-2026 node server.js"
echo ""
echo "Then open: http://localhost:4000"
