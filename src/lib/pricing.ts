/** (harga mobil + total aksesoris) x durasi hari. Tiap aksesoris qty 1. */
export function calculateTotal(
  carPricePerDay: number,
  accessoryPricesPerDay: number[],
  days: number,
): number {
  const perDay =
    carPricePerDay + accessoryPricesPerDay.reduce((sum, p) => sum + p, 0);
  return perDay * days;
}