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

async function runQuickTests() {
  console.log("🧪 Testing deployed Worker - Quick Check\n");
  console.log(`📍 URL: ${WORKER_URL}/mcp\n`);

  // Test 1: List products
  console.log("1️⃣ list_products\n");
  const result1 = await callMCP("list_products", {});
  console.log(JSON.stringify(result1, null, 2));
  console.log("\n---\n");

  // Test 2: Get product
  console.log("2️⃣ get_product (ID: 1)\n");
  const result2 = await callMCP("get_product", { product_id: 1 });
  console.log(JSON.stringify(result2, null, 2));
  console.log("\n---\n");

  // Test 3: Create cart
  console.log("3️⃣ create_cart\n");
  const result3 = await callMCP("create_cart", {
    conversation_id: "test-" + Date.now(),
    items: [{ product_id: 1, qty: 2 }],
  });
  console.log(JSON.stringify(result3, null, 2));
  console.log("\n---\n");

  console.log("✅ All tools responding from deployed Worker!");
}

runQuickTests().catch(console.error);
