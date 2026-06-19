import type { AppState, Bill, Expense, Roommate } from "@/types";
import { buildRoommateShares, buildParkingSnapshotFromSettings, getAvatarStyle, getInitials } from "@/lib/utils";
import { todayISO } from "@/lib/memberDates";

const roommates: Roommate[] = [
  {
    id: 1,
    name: "Alex Johnson",
    room: "101",
    phone: "+1 (555) 012-3456",
    email: "alex.johnson@gmail.com",
    status: "Active",
    joinDate: "2026-01-15",
    share: "$690",
    initials: "AJ",
    avatarGrad: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    payStatus: "Partial",
    occupation: "Software Engineer",
    color: "#4F46E5",
  },
  {
    id: 2,
    name: "Sarah Williams",
    room: "102",
    phone: "+1 (555) 023-4567",
    email: "sarah.w@gmail.com",
    status: "Active",
    joinDate: "2026-02-01",
    share: "$690",
    initials: "SW",
    avatarGrad: "linear-gradient(135deg, #06B6D4, #0891B2)",
    payStatus: "Paid",
    occupation: "Graphic Designer",
    color: "#06B6D4",
  },
  {
    id: 3,
    name: "Marcus Chen",
    room: "103",
    phone: "+1 (555) 034-5678",
    email: "marcus.chen@gmail.com",
    status: "Active",
    joinDate: "2026-01-15",
    share: "$690",
    initials: "MC",
    avatarGrad: "linear-gradient(135deg, #10B981, #059669)",
    payStatus: "Paid",
    occupation: "Data Analyst",
    color: "#10B981",
  },
  {
    id: 4,
    name: "Emma Davis",
    room: "104",
    phone: "+1 (555) 045-6789",
    email: "emma.davis@gmail.com",
    status: "Pending",
    joinDate: "2026-06-01",
    share: "$690",
    initials: "ED",
    avatarGrad: "linear-gradient(135deg, #F59E0B, #D97706)",
    payStatus: "Pending",
    occupation: "Marketing Manager",
    color: "#F59E0B",
  },
  {
    id: 5,
    name: "James Wilson",
    room: "105",
    phone: "+1 (555) 056-7890",
    email: "james.w@gmail.com",
    status: "Inactive",
    joinDate: "2026-03-01",
    moveOutDate: "2026-05-31",
    share: "$690",
    initials: "JW",
    avatarGrad: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    payStatus: "Paid",
    occupation: "Product Manager",
    color: "#8B5CF6",
  },
];

const expenses: Expense[] = [
  { id: 1, name: "Internet", amount: 80, paidBy: 2, category: "Internet", icon: "📶", note: "Fiber 1Gbps" },
  { id: 2, name: "Electricity", amount: 120, paidBy: 1, category: "Electricity", icon: "⚡", note: "Jun usage" },
  { id: 3, name: "Water", amount: 60, paidBy: 3, category: "Water", icon: "💧", note: "Utility" },
  { id: 4, name: "Cleaning", amount: 150, paidBy: 4, category: "Cleaning", icon: "🧹", note: "Professional clean" },
  { id: 5, name: "Supplies", amount: 40, paidBy: 5, category: "Supplies", icon: "🧴", note: "Toilet paper, soap" },
];

const demoSettings = {
  houseName: "Sunset House",
  address: "42 Maple Street, NY 10001",
  currency: "USD",
  timezone: "UTC-5 (EST)",
  language: "English",
  emailBill: true,
  emailExpense: true,
  emailReminder: false,
  smsBill: false,
  pushAll: true,
  pushPayment: true,
  autoSplit: true,
  twoFactor: false,
  sessionTimeout: "30 minutes",
  dataExport: true,
  plan: "Free" as const,
  memberCanCreateBills: true,
  memberCanEditExpenses: false,
  memberCanInvite: false,
  adminName: "Admin User",
  adminEmail: "admin@otipu.com",
  adminPassword: "",
  globalMessageTitle: "House Guidelines",
  globalMessage: "Please keep common areas clean and report maintenance issues promptly.",
  parkingTotalSpots: 2,
  parkingIncludedInRent: true,
  parkingAssignments: [
    { id: 1, spotName: "Spot A", roommateId: 1, monthlyFee: 100, active: true, shareSpace: false },
    { id: 2, spotName: "Spot B", roommateId: 3, monthlyFee: 150, active: true, shareSpace: true },
  ],
  roundUpAmounts: false,
};

const parkingSnapshot = buildParkingSnapshotFromSettings(demoSettings);

const juneBill: Bill = {
  id: "bill-june-2026",
  title: "June 2026",
  month: "June 2026",
  houseName: "Sunset House",
  rent: 3000,
  expenses,
  selectedRoommateIds: [1, 2, 3, 4, 5],
  roommateShares: buildRoommateShares(
    roommates,
    [1, 2, 3, 4, 5],
    3000,
    expenses,
    undefined,
    parkingSnapshot
  ),
  createdAt: "June 12, 2026",
  announcementTitle: "June Notice",
  announcementMessage: "Please submit rent before the 5th of the month.",
  parkingSnapshot,
};

export const initialState: AppState = {
  roommates,
  bills: [juneBill],
  activeBillId: juneBill.id,
  settings: demoSettings,
  darkMode: false,
  activities: [
    { id: 1, icon: "UserPlus", label: "New roommate added", desc: "Emma Davis joined Room 104", time: "2h ago", color: "#10B981", bg: "#ECFDF5" },
    { id: 2, icon: "FileText", label: "Monthly bill created", desc: "June 2026 — $3,450 total", time: "5h ago", color: "#4F46E5", bg: "#EEF2FF" },
    { id: 3, icon: "RefreshCw", label: "Expense updated", desc: "Electricity raised to $120", time: "1d ago", color: "#F59E0B", bg: "#FFFBEB" },
    { id: 4, icon: "Link2", label: "Share link generated", desc: "May 2026 bill shared", time: "2d ago", color: "#EC4899", bg: "#FDF2F8" },
    { id: 5, icon: "DollarSign", label: "Payment received", desc: "Sarah Williams paid $690", time: "3d ago", color: "#06B6D4", bg: "#ECFEFF" },
  ],
};

export function createRoommateFromForm(data: {
  name: string;
  room: string;
  phone: string;
  email: string;
  occupation: string;
  status: Roommate["status"];
  joinDate?: string;
  moveOutDate?: string;
  note?: string;
}, id: number, index: number): Roommate {
  const style = getAvatarStyle(index);
  return {
    id,
    name: data.name,
    room: data.room,
    phone: data.phone,
    email: data.email,
    status: data.status,
    joinDate: data.joinDate || todayISO(),
    moveOutDate: data.moveOutDate,
    note: data.note,
    share: "$690",
    initials: getInitials(data.name),
    avatarGrad: style.grad,
    payStatus: "Pending",
    occupation: data.occupation,
    color: style.color,
  };
}
