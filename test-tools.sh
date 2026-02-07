#!/bin/bash

# Script de Testing Local para MCP Tools
# Tarea 5.1 - Testing local de todos los tools con wrangler dev

BASE_URL="http://localhost:8787/mcp"

echo "============================================"
echo "TESTING MCP TOOLS - Laburen Challenge"
echo "============================================"
echo ""

# Función helper para hacer requests
test_tool() {
  local test_name="$1"
  local tool_name="$2"
  local arguments="$3"
  
  echo "───────────────────────────────────────────"
  echo "TEST: $test_name"
  echo "Tool: $tool_name"
  echo "───────────────────────────────────────────"
  
  curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"method\":\"tools/call\",\"params\":{\"name\":\"$tool_name\",\"arguments\":$arguments}}" \
    | python -m json.tool 2>/dev/null || cat
  
  echo ""
  echo ""
}

# ============================================
# TEST 1: list_products sin filtros
# ============================================
test_tool \
  "Listar productos sin filtros" \
  "list_products" \
  '{}'

# ============================================
# TEST 2: list_products con query
# ============================================
test_tool \
  "Buscar productos con query 'zapatilla'" \
  "list_products" \
  '{"query":"zapatilla"}'

# ============================================
# TEST 3: list_products con filtro de categoría
# ============================================
test_tool \
  "Filtrar productos por categoría Deportivo" \
  "list_products" \
  '{"categoria":"Deportivo"}'

# ============================================
# TEST 4: get_product con ID válido
# ============================================
test_tool \
  "Obtener producto con ID 1" \
  "get_product" \
  '{"product_id":1}'

# ============================================
# TEST 5: get_product con ID inválido
# ============================================
test_tool \
  "Obtener producto con ID 99999 (no existe)" \
  "get_product" \
  '{"product_id":99999}'

# ============================================
# TEST 6: create_cart - caso normal
# ============================================
test_tool \
  "Crear carrito con 2 productos" \
  "create_cart" \
  '{"conversation_id":"test-conv-001","items":[{"product_id":1,"qty":2},{"product_id":2,"qty":1}]}'

# ============================================
# TEST 7: create_cart - stock insuficiente
# ============================================
test_tool \
  "Crear carrito con cantidad mayor al stock" \
  "create_cart" \
  '{"conversation_id":"test-conv-002","items":[{"product_id":1,"qty":99999}]}'

# ============================================
# TEST 8: create_cart - mismo conversation_id
# ============================================
test_tool \
  "Agregar más productos al carrito existente (test-conv-001)" \
  "create_cart" \
  '{"conversation_id":"test-conv-001","items":[{"product_id":3,"qty":3}]}'

# ============================================
# TEST 9: update_cart - cambiar cantidad
# ============================================
test_tool \
  "Actualizar cantidad de producto en carrito" \
  "update_cart" \
  '{"conversation_id":"test-conv-001","updates":[{"product_id":1,"qty":5}]}'

# ============================================
# TEST 10: update_cart - qty=0 eliminar
# ============================================
test_tool \
  "Eliminar producto del carrito (qty=0)" \
  "update_cart" \
  '{"conversation_id":"test-conv-001","updates":[{"product_id":2,"qty":0}]}'

# ============================================
# TEST 11: update_cart - carrito no existe
# ============================================
test_tool \
  "Actualizar carrito inexistente" \
  "update_cart" \
  '{"conversation_id":"test-conv-noexiste","updates":[{"product_id":1,"qty":1}]}'

echo "============================================"
echo "TESTING COMPLETADO"
echo "============================================"
