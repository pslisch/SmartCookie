/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, ScrollText, CheckCircle2 } from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import {
  AuditListItem,
  AuditListResponse,
  AuditSearchResponse,
  AuditFilterOptionsResponse,
  AuditFilterState,
} from '../types';
import { AuditLogFilters } from '../components/AuditLogFilters';
import { AuditLogTable } from '../components/AuditLogTable';
import { AuditLogDetailModal } from '../components/AuditLogDetailModal';

const initialFilters: AuditFilterState = {
  searchQuery: '',
  dateFrom: '',
  dateTo: '',
  actorId: '',
  action: '',
  entityType: '',
  outcome: '',
};

export const AuditLog: React.FC = () => {
  const { t } = useTranslation();
  const canViewAudit = usePermission('audit', 'view');

  const [filters, setFilters] = useState<AuditFilterState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptionsResponse | null>(null);

  const [items, setItems] = useState<AuditListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(30);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<AuditListItem | null>(null);
  const [isExportingFiltered, setIsExportingFiltered] = useState<boolean>(false);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query changes by 300ms
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery);
      setPage(1); // Reset to page 1 on new search query
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [filters.searchQuery]);

  // Load filter options on mount
  useEffect(() => {
    if (!canViewAudit) return;

    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const res = await fetch('/api/audit-logs/filter-options');
        if (res.ok) {
          const data: AuditFilterOptionsResponse = await res.json();
          if (isMounted) {
            setFilterOptions(data);
          }
        }
      } catch (err) {
        console.error('[AuditLog] Failed to load filter options:', err);
      }
    };

    loadFilterOptions();
    return () => {
      isMounted = false;
    };
  }, [canViewAudit]);

  // Build query string for API requests
  const buildQueryParams = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('pageSize', String(pageSize));

      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.actorId) params.set('actorId', filters.actorId);
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.outcome) params.set('outcome', filters.outcome);

      return params.toString();
    },
    [filters, pageSize]
  );

  // Fetch audit logs (list or search)
  const fetchAuditLogs = useCallback(
    async (targetPage = 1) => {
      if (!canViewAudit) return;

      setLoading(true);
      setError(null);

      try {
        const queryParams = buildQueryParams(targetPage);
        let endpoint = `/api/audit-logs?${queryParams}`;

        const isSearch = Boolean(debouncedSearch.trim());
        if (isSearch) {
          endpoint = `/api/audit-logs/search?q=${encodeURIComponent(debouncedSearch.trim())}&${queryParams}`;
        }

        const res = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch audit logs (${res.status})`);
        }

        const data: AuditListResponse | AuditSearchResponse = await res.json();

        setItems(data.items || []);
        setTotalCount(data.totalCount || 0);
        setPage(data.page || targetPage);
        setTotalPages(data.totalPages || 1);
      } catch (err: unknown) {
        console.error('[AuditLog] Error fetching audit logs:', err);
        setError(err instanceof Error ? err.message : t('audit.loadError', 'Failed to load audit logs'));
      } finally {
        setLoading(false);
      }
    },
    [canViewAudit, debouncedSearch, buildQueryParams, t]
  );

  useEffect(() => {
    fetchAuditLogs(page);
  }, [page, debouncedSearch, filters.dateFrom, filters.dateTo, filters.actorId, filters.action, filters.entityType, filters.outcome, fetchAuditLogs]);

  const handleFilterChange = <K extends keyof AuditFilterState>(key: K, value: AuditFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setDebouncedSearch('');
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  // CSV Export handlers
  const handleExportFiltered = async () => {
    setIsExportingFiltered(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.actorId) params.set('actorId', filters.actorId);
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.outcome) params.set('outcome', filters.outcome);

      const res = await fetch(`/api/audit-logs/export?${params.toString()}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `audit-log-export-${new Date().toISOString().split('T')[0]}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('[AuditLog] Export filtered error:', err);
      alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExportingFiltered(false);
    }
  };

  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      const res = await fetch('/api/audit-logs/export/all');
      if (!res.ok) throw new Error(`Export all failed (${res.status})`);

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `audit-log-all-${new Date().toISOString().split('T')[0]}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('[AuditLog] Export all error:', err);
      alert(err instanceof Error ? err.message : 'Export all failed.');
    } finally {
      setIsExportingAll(false);
    }
  };

  // If user lacks permission, do not render sensitive content
  if (!canViewAudit) {
    return (
      <div className="p-8 text-center text-status-error-text" id="audit-log-unauthorized">
        <p className="text-sm font-semibold">{t('audit.unauthorized', 'Unauthorized: You do not have permission to view audit logs.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="audit-log-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-info-bg text-link-primary border border-link-primary/20">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-heading font-sans">
              {t('audit.title', 'Audit Log')}
            </h2>
            <p className="text-xs text-text-muted font-sans">
              {t('audit.subtitle', 'Complete compliance trail of all administrative and security mutations.')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <span
            className="inline-flex items-center rounded-full bg-card-header-bg px-3 py-1 text-xs font-semibold text-text-muted border border-card-border"
            id="audit-log-count-badge"
          >
            {t('audit.eventsCount', { count: totalCount, defaultValue: `${totalCount} events` })}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <AuditLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        filterOptions={filterOptions}
        onExportFiltered={handleExportFiltered}
        onExportAll={handleExportAll}
        isExportingFiltered={isExportingFiltered}
        isExportingAll={isExportingAll}
      />

      {/* Main Content Area: Loading, Error, Empty, or Table */}
      {loading && items.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-8" id="audit-log-loading">
          <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
          <p className="text-sm text-text-muted font-sans">{t('audit.loading', 'Loading audit logs…')}</p>
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
          id="audit-log-error"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-sans">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchAuditLogs(page)}
            className="ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-status-error-text text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            id="audit-log-retry-btn"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-12 text-center"
          id="audit-log-empty"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-info-bg text-link-primary mb-4 border border-link-primary/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-text-heading font-sans">
            {t('audit.emptyTitle', 'No Audit Logs Found')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-md font-sans">
            {t('audit.emptyDesc', 'No audit log entries match your current search or filter criteria.')}
          </p>
        </div>
      ) : (
        <AuditLogTable
          items={items}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onSelectRow={(item) => setSelectedItem(item)}
          loading={loading}
        />
      )}

      {/* Detail Modal */}
      <AuditLogDetailModal
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};
