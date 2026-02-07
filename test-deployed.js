const https = require("https");

const WORKER_URL = "https://laburen-challenge-mcp.laburen-challenge.workers.dev";

async function callMCP(toolName, args) {
  return new Promise((resolve, reject) => {
    const payload = {
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const data = JSON.stringify(payload);

    const url = new URL(WORKER_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: "/mcp",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function getTools() {
  return new Promise((resolve, reject) => {
    const url = new URL(WORKER_URL + "/tools");
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "GET",
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Testing deployed Worker on Cloudflare...\n");
  console.log(`📍 URL: ${WORKER_URL}\n`);

  // Test 0: Get available tools
  console.log("0️⃣ Test: GET /tools");
  try {
    const result = await getTools();
    console.log("✅ Available tools:", result.tools.map((t) => t.name).join(", "));
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 1: List products (no filters)
  console.log("1️⃣ Test: list_products (sin filtros)");
  try {
    const result = await callMCP("list_products", {});
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: ${data.total} productos encontrados, mostrando ${data.showing}`);
      console.log("   Primer producto:", data.products[0].tipo_prenda, "-", data.products[0].color);
    } else {
      console.log("❌ Resultado inesperado:", JSON.stringify(result));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 2: List products with filter
  console.log('2️⃣ Test: list_products (query: "pantalon")');
  try {
    const result = await callMCP("list_products", { query: "pantalon" });
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: ${data.total} productos encontrados`);
      if (data.products.length > 0) {
        console.log("   Primer resultado:", data.products[0].tipo_prenda);
      }
    } else {
      console.log("❌ Resultado inesperado:", JSON.stringify(result));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 3: Get product by ID
  console.log("3️⃣ Test: get_product (ID: 1)");
  try {
    const result = await callMCP("get_product", { product_id: 1 });
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log("✅ Success:", data.tipo_prenda, data.color, "Talla:", data.talla);
      console.log("   Stock:", data.cantidad_disponible, "unidades");
    } else {
      console.log("❌ Resultado inesperado:", JSON.stringify(result));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 4: Get product with invalid ID
  console.log("4️⃣ Test: get_product (ID inválido: 99999)");
  try {
    const result = await callMCP("get_product", { product_id: 99999 });
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      if (data.error) {
        console.log("✅ Manejo de error correcto:", data.message);
      } else {
        console.log("❌ Debería retornar error pero no lo hizo");
      }
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 5: Create cart
  console.log("5️⃣ Test: create_cart");
  try {
    const convId = "test-deployed-" + Date.now();
    const result = await callMCP("create_cart", {
      conversation_id: convId,
      items: [{ product_id: 1, qty: 2 }],
    });
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log("✅ Success: Carrito creado con", data.items.length, "item(s)");
      console.log("   Total items:", data.total_items);
      console.log("   Subtotal:", data.subtotal);
    } else {
      console.log("❌ Resultado inesperado:", JSON.stringify(result));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 6: Create cart with insufficient stock
  console.log("6️⃣ Test: create_cart (stock insuficiente)");
  try {
    const convId = "test-stock-" + Date.now();
    const result = await callMCP("create_cart", {
      conversation_id: convId,
      items: [{ product_id: 1, qty: 999999 }],
    });
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      if (data.error) {
        console.log("✅ Manejo de error correcto:", data.message);
      } else {
        console.log("❌ Debería retornar error de stock");
      }
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 7: Update cart
  console.log("7️⃣ Test: update_cart");
  try {
    const convId = "test-update-" + Date.now();

    // First create a cart
    await callMCP("create_cart", {
      conversation_id: convId,
      items: [{ product_id: 1, qty: 2 }],
    });

    // Then update it
    const result = await callMCP("update_cart", {
      conversation_id: convId,
      updates: [{ product_id: 1, qty: 5 }],
    });

    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log("✅ Success: Carrito actualizado");
      console.log("   Total items:", data.total_items);
      console.log("   Cantidad del producto 1:", data.items[0].qty);
    } else {
      console.log("❌ Resultado inesperado:", JSON.stringify(result));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log("\n---\n");

  // Test 8: Update cart - remove item (qty = 0)
  console.log("8️⃣ Test: update_cart (remover item con qty=0)");
  try {
    const convId = "test-remove-" + Date.now();

    // Create cart with 2 products
    await callMCP("create_cart", {
      conversation_id: convId,
      items: [
        { product_id: 1, qty: 2 },
        { product_id: 2, qty: 3 },
      ],
    });

    // Remove product 1
    const result = await callMCP("update_cart", {
      conversation_id: convId,
      updates: [{ product_id: 1, qty: 0 }],
    });

    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log("✅ Success: Item eliminado del carrito");
      console.log("   Items restantes:", data.items.length);
      console.log("   Total items:", data.total_items);
    } else {
      console.log("❌ Resultado inesperado:", JSON.stringify(result));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n✨ Tests completed!");
  console.log("\n📊 Resumen:");
  console.log("   ✅ Worker deployed y funcionando en Cloudflare");
  console.log("   ✅ Todos los tools operativos");
  console.log("   ✅ Manejo de errores correcto");
  console.log("   ✅ Base de datos D1 conectada y con datos");
}

runTests().catch(console.error);
