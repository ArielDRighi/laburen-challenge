/**
 * Script de seed para importar productos desde products.xlsx a Cloudflare D1
 *
 * Uso:
 *   npm run db:seed
 *   npm run db:seed -- --remote  (para base de datos remota)
 */

const XLSX = require("xlsx");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuración
const XLSX_FILE = "products.xlsx";
const SQL_OUTPUT = "src/db/seed.sql";
const DB_NAME = "laburen-challenge-db";

// Verificar si se debe usar la base remota
const isRemote = process.argv.includes("--remote");

console.log("🌱 Iniciando seed de productos...\n");

// 1. Leer archivo XLSX
console.log(`📖 Leyendo ${XLSX_FILE}...`);
const workbook = XLSX.readFile(XLSX_FILE);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir a JSON
const data = XLSX.utils.sheet_to_json(worksheet);
console.log(`✅ Leídos ${data.length} productos\n`);

// 2. Generar sentencias SQL
console.log("🔨 Generando sentencias SQL...");

let sql = `-- Seed file generado automáticamente desde ${XLSX_FILE}
-- Total de productos: ${data.length}
-- Fecha: ${new Date().toISOString()}

-- Limpiar tabla products antes de insertar (opcional)
-- DELETE FROM products;

-- Insertar productos
`;

// Generar INSERT para cada producto
data.forEach((row, index) => {
  // Mapear columnas del XLSX a campos de la tabla
  const id = row.ID || index + 1;
  const tipo_prenda = (row.TIPO_PRENDA || "").replace(/'/g, "''"); // Escape single quotes
  const talla = (row.TALLA || "").replace(/'/g, "''");
  const color = (row.COLOR || "").replace(/'/g, "''");
  const cantidad_disponible = row.CANTIDAD_DISPONIBLE || 0;
  const precio_50_u = row.PRECIO_50_U || 0;
  const precio_100_u = row.PRECIO_100_U || 0;
  const precio_200_u = row.PRECIO_200_U || 0;
  const disponible = (row.DISPONIBLE || "Sí").replace(/'/g, "''");
  const categoria = (row.CATEGORÍA || row.CATEGORIA || "").replace(/'/g, "''");
  const descripcion = (row.DESCRIPCIÓN || row.DESCRIPCION || "").replace(/'/g, "''");

  sql += `INSERT INTO products (id, tipo_prenda, talla, color, cantidad_disponible, precio_50_u, precio_100_u, precio_200_u, disponible, categoria, descripcion)
VALUES (${id}, '${tipo_prenda}', '${talla}', '${color}', ${cantidad_disponible}, ${precio_50_u}, ${precio_100_u}, ${precio_200_u}, '${disponible}', '${categoria}', '${descripcion}');
`;
});

// 3. Guardar SQL a archivo
console.log(`💾 Guardando SQL en ${SQL_OUTPUT}...`);
fs.writeFileSync(SQL_OUTPUT, sql, "utf8");
console.log(`✅ Archivo SQL generado\n`);

// 4. Mostrar preview
console.log("📋 Preview de los primeros 3 productos:");
data.slice(0, 3).forEach((row, index) => {
  console.log(`\n  ${index + 1}. ${row.TIPO_PRENDA} - ${row.TALLA} - ${row.COLOR}`);
  console.log(`     Stock: ${row.CANTIDAD_DISPONIBLE} | Precio (50U): $${row.PRECIO_50_U}`);
  console.log(`     Categoría: ${row.CATEGORÍA || row.CATEGORIA} | Disponible: ${row.DISPONIBLE}`);
});
console.log(`\n  ... y ${data.length - 3} productos más.\n`);

// 5. Preguntar si ejecutar contra D1
console.log("🚀 Ejecutando contra Cloudflare D1...");
const remoteFlag = isRemote ? "--remote" : "--local";
const location = isRemote ? "REMOTA" : "LOCAL";

try {
  console.log(`📍 Ubicación: Base de datos ${location}\n`);

  const command = `wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SQL_OUTPUT}`;
  console.log(`⚡ Comando: ${command}\n`);

  const output = execSync(command, {
    encoding: "utf8",
    stdio: "inherit",
  });

  console.log("\n✅ Seed completado exitosamente!");
  console.log(`📊 ${data.length} productos importados a la base de datos ${location}.`);
} catch (error) {
  console.error("\n❌ Error al ejecutar contra D1:");
  console.error(error.message);
  console.error(`\n💡 Puedes ejecutar manualmente: wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SQL_OUTPUT}`);
  process.exit(1);
}

// 6. Verificar importación
console.log("\n🔍 Verificando importación...");
try {
  const verifyCommand = `wrangler d1 execute ${DB_NAME} ${remoteFlag} --command "SELECT COUNT(*) as total FROM products"`;
  const verifyOutput = execSync(verifyCommand, { encoding: "utf8" });
  console.log(verifyOutput);

  console.log("\n✨ ¡Importación completada con éxito!");
  console.log(`\n📝 Siguiente paso: Verificar con:`);
  console.log(`   wrangler d1 execute ${DB_NAME} ${remoteFlag} --command "SELECT * FROM products LIMIT 5"`);
} catch (error) {
  console.error("⚠️  No se pudo verificar automáticamente, pero la importación puede haber sido exitosa.");
}
