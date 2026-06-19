export type Page =
  | "dashboard"
  | "roommates"
  | "bills"
  | "expenses"
  | "analytics"
  | "settings"
  | "bill-details"
  | "shared-bill";

export type RoommateStatus = "Active" | "Pending" | "Inactive";
export type PayStatus = "Paid" | "Partial" | "Pending";
export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface Roommate {
  id: number;
  name: string;
  room: string;
  phone: string;
  email: string;
  status: RoommateStatus;
  joinDate: string;
  moveOutDate?: string;
  note?: string;
  share: string;
  initials: string;
  avatarGrad: string;
  payStatus: PayStatus;
  occupation: string;
  color: string;
}

export interface Expense {
  id: number;
  name: string;
  amount: number;
  paidBy?: number;
  category: string;
  icon?: string;
  note?: string;
  shareMode?: "all" | "selected";
  sharedBy?: number[];
}

export interface ParkingAssignment {
  spotName: string;
  roommateId: number | null;
  monthlyFee: number;
  active: boolean;
  shareSpace?: boolean;
  sharedBy?: number[];
}

export interface ParkingAssignmentTemplate extends ParkingAssignment {
  id: number;
}

export interface ParkingSnapshot {
  totalSpots: number;
  parkingIncludedInRent: boolean;
  assignments: ParkingAssignment[];
}

export interface RoommateShare {
  roommateId: number;
  share: number;
  paid: number;
  status: PayStatus;
}

export interface Bill {
  id: string;
  title?: string;
  month: string;
  houseName: string;
  rent: number;
  expenses: Expense[];
  selectedRoommateIds: number[];
  roommateShares: RoommateShare[];
  createdAt: string;
  announcementTitle?: string;
  announcementMessage?: string;
  parkingSnapshot?: ParkingSnapshot | null;
  isExtraBill?: boolean;
  completed?: boolean;
}

export interface Settings {
  houseName: string;
  address: string;
  currency: string;
  timezone: string;
  language: string;
  emailBill: boolean;
  emailExpense: boolean;
  emailReminder: boolean;
  smsBill: boolean;
  pushAll: boolean;
  pushPayment: boolean;
  autoSplit: boolean;
  twoFactor: boolean;
  sessionTimeout: string;
  dataExport: boolean;
  plan: "Free" | "Pro" | "Team";
  memberCanCreateBills: boolean;
  memberCanEditExpenses: boolean;
  memberCanInvite: boolean;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  globalMessageTitle: string;
  globalMessage: string;
  parkingTotalSpots: number;
  parkingIncludedInRent: boolean;
  parkingAssignments: ParkingAssignmentTemplate[];
  roundUpAmounts: boolean;
}

export interface Activity {
  id: number;
  icon: string;
  label: string;
  desc: string;
  time: string;
  color: string;
  bg: string;
}

export interface AppState {
  roommates: Roommate[];
  bills: Bill[];
  activeBillId: string | null;
  settings: Settings;
  darkMode: boolean;
  activities: Activity[];
}
