import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { NotificationListItem as NotificationItemType, NotificationHistoryResponse } from '../types/notifications';
import { NotificationItemRow } from './NotificationItemRow';

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (item: NotificationItemType) => void;
}

export const NotificationHistoryModal: React.FC<NotificationHistoryModalProps> = ({
  isOpen,
  onClose,
  onNotificationClick,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationItemType[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/history?page=${targetPage}&pageSize=${pageSize}`);
      if (res.ok) {
        const data: NotificationHistoryResponse = await res.json();
        setItems(data.items);
        setTotalCount(data.totalCount);
        setPage(data.page);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load notification history:', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory(1);
    }
  }, [isOpen, fetchHistory]);

  const handleItemClick = (item: NotificationItemType) => {
    // If it was unread in history, optimistically update item's readAt
    if (!item.readAt) {
      setItems((prev) =>
        prev.map((i) =>
          i.deliveryId === item.deliveryId ? { ...i, readAt: new Date().toISOString() } : i
        )
      );
    }
    onNotificationClick(item);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
          onClick={onClose}
          id="notification-history-modal-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full max-w-xl max-h-[85vh] rounded-2xl border border-card-border bg-card-bg shadow-2xl overflow-hidden"
            id="notification-history-modal-panel"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-link-primary" />
                <h3 className="text-base font-bold text-text-heading">
                  {t('notifications.historyTitle')}
                </h3>
                {totalCount > 0 && (
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-text-muted">
                    {totalCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text-heading transition-colors"
                id="notification-history-close-btn"
                aria-label={t('notifications.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex h-48 items-center justify-center text-text-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-link-primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
                  <History className="h-10 w-10 stroke-1 text-text-muted/60 mb-2" />
                  <p className="text-sm font-medium">{t('notifications.historyEmpty')}</p>
                </div>
              ) : (
                items.map((item) => (
                  <NotificationItemRow
                    key={item.deliveryId}
                    item={item}
                    onClick={handleItemClick}
                    idPrefix="history-item"
                  />
                ))
              )}
            </div>

            {/* Modal Footer / Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-card-border px-5 py-3 bg-card-header-bg text-xs">
                <span className="text-text-muted font-medium">
                  {t('notifications.pageIndicator', { current: page, total: totalPages })}
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => fetchHistory(page - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    id="notification-history-prev-page"
                    aria-label={t('notifications.previousPage')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchHistory(page + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    id="notification-history-next-page"
                    aria-label={t('notifications.nextPage')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
