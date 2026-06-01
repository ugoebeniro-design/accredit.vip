import { apiClient } from "@/lib/api-client";

export type AdminStats = {
  users: number;
  events: number;
  guests: number;
  payments: number;
  checkins: number;
  tickets: number;
  accreditation_requests: number;
  total_revenue: number;
};

export type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AdminUserDetail = AdminUser & {
  phone: string | null;
  is_verified: boolean;
  event_count: number;
  payment_count: number;
  ticket_count: number;
};

export type AdminEvent = {
  id: number;
  title: string;
  event_type: string;
  status: string;
  is_public: boolean;
  organizer: string;
  created_at: string;
};

export type AdminEventDetail = {
  id: number;
  title: string;
  event_type: string;
  host_name: string;
  event_date: string;
  event_time: string;
  timezone: string;
  venue: string | null;
  description: string;
  status: string;
  is_public: boolean;
  category: string;
  organizer: string;
  cover_image: string;
  guest_count: number;
  checkin_count: number;
  revenue: number;
  created_at: string;
};

export type RevenueRow = {
  provider: string;
  count: number;
  total: number;
};

export type TimelinePoint = {
  date: string;
  count: number;
};

export type RevenueTimelinePoint = {
  date: string;
  revenue: number;
  transactions: number;
};

export type DeliveryStats = {
  total_batches: number;
  total_messages: number;
  delivered: number;
  failed: number;
  pending: number;
  by_channel: Record<string, number>;
};

export type SupportTicket = {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  user_name: string;
  user_email: string;
};

export type CheckInLog = {
  id: number;
  guest_name: string;
  guest_email: string;
  event_title: string;
  event_id: number;
  scanned_by: string;
  checked_in_at: string;
};

export type StaffAssignment = {
  id: number;
  staff_name: string;
  staff_email: string;
  event_title: string;
  role: string;
  assigned_at: string;
};

export type PaymentRecord = {
  id: number;
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  event_title: string;
  organizer_name: string;
};

export type TicketPurchaseRecord = {
  id: number;
  reference: string;
  event_title: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
};

export type AuditLogEntry = {
  id: number;
  user_id: number | null;
  action: string;
  resource: string;
  resource_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
};

export type FraudFlags = {
  inactive_users: number;
  unverified_users: number;
  failed_payments: number;
  failed_deliveries: number;
};

export type AccreditationRequest = {
  id: number;
  staff_count: number;
  scanner_rental: boolean;
  status: string;
  notes: string;
  event_title: string;
  organizer_name: string;
  created_at: string;
};

export type PaginatedResponse<T> = {
  total: number;
  page: number;
  per_page: number;
};

export type UserListResponse = PaginatedResponse<AdminUser> & { users: AdminUser[] };
export type EventListResponse = PaginatedResponse<AdminEvent> & { events: AdminEvent[] };
export type CheckinListResponse = PaginatedResponse<CheckInLog> & { checkins: CheckInLog[] };
export type PaymentListResponse = PaginatedResponse<PaymentRecord> & { payments: PaymentRecord[] };
export type TicketPurchaseListResponse = PaginatedResponse<TicketPurchaseRecord> & { ticket_purchases: TicketPurchaseRecord[] };
export type AuditLogResponse = PaginatedResponse<AuditLogEntry> & { logs: AuditLogEntry[] };

export async function getAdminStats(): Promise<AdminStats> {
  return apiClient("/admin/stats");
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<UserListResponse> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.role) q.set("role", params.role);
  if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
  if (params?.page) q.set("page", String(params.page));
  if (params?.per_page) q.set("per_page", String(params.per_page));
  return apiClient(`/admin/users?${q.toString()}`);
}

export async function getAdminUserDetail(userId: number): Promise<AdminUserDetail> {
  return apiClient(`/admin/users/${userId}`);
}

export async function getAdminEvents(params?: {
  search?: string;
  status?: string;
  event_type?: string;
  is_public?: boolean;
  page?: number;
  per_page?: number;
}): Promise<EventListResponse> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  if (params?.event_type) q.set("event_type", params.event_type);
  if (params?.is_public !== undefined) q.set("is_public", String(params.is_public));
  if (params?.page) q.set("page", String(params.page));
  if (params?.per_page) q.set("per_page", String(params.per_page));
  return apiClient(`/admin/events?${q.toString()}`);
}

export async function getAdminEventDetail(eventId: number): Promise<AdminEventDetail> {
  return apiClient(`/admin/events/${eventId}`);
}

export async function getAdminRevenue(): Promise<RevenueRow[]> {
  return apiClient("/admin/revenue");
}

export async function getAdminRevenueTimeline(days: number = 30): Promise<RevenueTimelinePoint[]> {
  return apiClient(`/admin/revenue/timeline?days=${days}`);
}

export async function getAdminUsersTimeline(days: number = 30): Promise<TimelinePoint[]> {
  return apiClient(`/admin/users/timeline?days=${days}`);
}

export async function getAdminEventsTimeline(days: number = 30): Promise<TimelinePoint[]> {
  return apiClient(`/admin/events/timeline?days=${days}`);
}

export async function updateUserRole(userId: number, role: string): Promise<void> {
  return apiClient(`/admin/users/${userId}/role?role=${role}`, { method: "PATCH" });
}

export async function getAdminDeliveryStats(): Promise<DeliveryStats> {
  return apiClient("/admin/delivery-stats");
}

export async function getAdminTickets(status?: string): Promise<SupportTicket[]> {
  const q = status ? `?status=${status}` : "";
  return apiClient(`/admin/tickets${q}`);
}

export async function updateTicketStatus(
  ticketId: number,
  status: string,
  assignedTo?: number
): Promise<void> {
  let url = `/admin/tickets/${ticketId}?status=${status}`;
  if (assignedTo) url += `&assigned_to=${assignedTo}`;
  return apiClient(url, { method: "PATCH" });
}

export async function getAdminCheckins(page: number = 1, per_page: number = 50): Promise<CheckinListResponse> {
  return apiClient(`/admin/checkins?page=${page}&per_page=${per_page}`);
}

export async function getAdminStaff(): Promise<StaffAssignment[]> {
  return apiClient("/admin/staff");
}

export async function createStaffAssignment(userId: number, eventId: number, role: string = "accreditation"): Promise<void> {
  await apiClient(`/admin/staff?user_id=${userId}&event_id=${eventId}&role=${role}`, { method: "POST" });
}

export async function deleteStaffAssignment(assignmentId: number): Promise<void> {
  await apiClient(`/admin/staff/${assignmentId}`, { method: "DELETE" });
}

export async function getAdminPayments(page: number = 1, per_page: number = 50): Promise<PaymentListResponse> {
  return apiClient(`/admin/payments?page=${page}&per_page=${per_page}`);
}

export async function getAdminTicketPurchases(page: number = 1, per_page: number = 50, status?: string): Promise<TicketPurchaseListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("per_page", String(per_page));
  if (status) q.set("status", status);
  return apiClient(`/admin/ticket-purchases?${q.toString()}`);
}

export async function getAdminAuditLogs(params?: {
  action?: string;
  page?: number;
  per_page?: number;
}): Promise<AuditLogResponse> {
  const q = new URLSearchParams();
  if (params?.action) q.set("action", params.action);
  if (params?.page) q.set("page", String(params.page));
  if (params?.per_page) q.set("per_page", String(params.per_page));
  return apiClient(`/admin/audit-logs?${q.toString()}`);
}

export async function getAdminFraudFlags(): Promise<FraudFlags> {
  return apiClient("/admin/fraud-flags");
}

export async function getAdminAccreditationRequests(): Promise<AccreditationRequest[]> {
  return apiClient("/admin/accreditation-requests");
}

export type CommunityPost = {
  id: number;
  title: string;
  excerpt: string | null;
  content: string | null;
  tag: string | null;
  image: string | null;
  author: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export async function getAdminCommunityPosts(): Promise<CommunityPost[]> {
  return apiClient("/posts?published=false");
}

export async function createAdminCommunityPost(data: {
  title: string;
  excerpt?: string;
  content?: string;
  tag?: string;
  image?: string;
  author?: string;
  is_published?: boolean;
}): Promise<CommunityPost> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${base}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

export async function updateAdminCommunityPost(postId: number, data: {
  title?: string;
  excerpt?: string;
  content?: string;
  tag?: string;
  image?: string;
  author?: string;
  is_published?: boolean;
}): Promise<CommunityPost> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${base}/posts/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

export async function deleteAdminCommunityPost(postId: number): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  await fetch(`${base}/posts/${postId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function downloadAdminExport(resource: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${base}/admin/export/${resource}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resource}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
