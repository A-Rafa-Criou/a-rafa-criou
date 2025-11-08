#!/bin/bash

# Script de teste de performance - Admin A Rafa Criou
# Execute: chmod +x test-performance.sh && ./test-performance.sh

echo "🚀 TESTE DE PERFORMANCE - A RAFA CRIOU"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000"

echo "📊 Testando APIs Admin..."
echo ""

echo "1️⃣  GET /api/admin/products"
time curl -s "$BASE_URL/api/admin/products" > /dev/null
echo ""

echo "2️⃣  GET /api/admin/orders"
time curl -s "$BASE_URL/api/admin/orders" > /dev/null
echo ""

echo "3️⃣  GET /api/admin/users"
time curl -s "$BASE_URL/api/admin/users" > /dev/null
echo ""

echo "4️⃣  GET /api/admin/stats"
time curl -s "$BASE_URL/api/admin/stats" > /dev/null
echo ""

echo "======================================"
echo "✅ Teste completo!"
echo ""
echo "💡 Resultados esperados:"
echo "   - Products: < 500ms"
echo "   - Orders: < 1s"
echo "   - Users: < 500ms"
echo "   - Stats: < 300ms"
