import { initialState } from "@/data/initialData";
import { calcBillTotal } from "@/lib/utils";
import { encodeSharePayload } from "@/lib/share";

export const demoBill = initialState.bills[0]!;
export const demoHouse = initialState.settings.houseName;
export const demoAddress = initialState.settings.address;
export const demoRoommates = initialState.roommates.filter((r) =>
  demoBill.selectedRoommateIds.includes(r.id)
);
export const demoTotal = calcBillTotal(demoBill.rent, demoBill.expenses);
export const demoRent = demoBill.rent;
export const demoExpenses = demoBill.expenses.reduce((s, e) => s + e.amount, 0);

export function getDemoShareHash(): string {
  return encodeSharePayload(demoBill, initialState.roommates, initialState.settings);
}

export function openDemoBill() {
  window.location.hash = `/share/${getDemoShareHash()}`;
}
