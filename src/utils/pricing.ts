/**
 * Utilidades para cálculo de precios escalonados por volumen
 */

/**
 * Calcula el precio unitario correcto según la cantidad comprada
 * Lógica de descuentos por volumen:
 * - qty >= 200 → precio_200_u
 * - qty >= 100 → precio_100_u
 * - qty < 100 → precio_50_u
 */
export function calculateUnitPrice(
  qty: number,
  precio_50_u: number,
  precio_100_u: number,
  precio_200_u: number
): number {
  if (qty >= 200) {
    return precio_200_u;
  } else if (qty >= 100) {
    return precio_100_u;
  } else {
    return precio_50_u;
  }
}

/**
 * Calcula el subtotal aplicando el precio correcto según volumen
 */
export function calculateSubtotal(
  qty: number,
  precio_50_u: number,
  precio_100_u: number,
  precio_200_u: number
): number {
  const unitPrice = calculateUnitPrice(qty, precio_50_u, precio_100_u, precio_200_u);
  return unitPrice * qty;
}
