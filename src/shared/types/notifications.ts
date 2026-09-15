export interface NotificationListItem {
  deliveryId: string;
  notificationInstanceId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  actionUrl: string | null;
  actionLabel?: string;
  mandatory: boolean;
  targetAvailable: boolean;
}

export interface NotificationsResponse {
  unread: NotificationListItem[];
  recentRead: NotificationListItem[];
}

export interface NotificationHistoryResponse {
  items: NotificationListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
