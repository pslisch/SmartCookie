/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RotateCcw, Download, Loader2 } from 'lucide-react';
import { AuditFilterOptionsResponse, AuditFilterState } from '../types';

interface AuditLogFiltersProps {
  filters: AuditFilterState;
  onFilterChange: <K extends keyof AuditFilterState>(key: K, value: AuditFilterState[K]) => void;
  onResetFilters: () => void;
  filterOptions: AuditFilterOptionsResponse | null;
  onExportFiltered: () => void;
  onExportAll: () => void;
  isExportingFiltered: boolean;
  isExportingAll: boolean;
}

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  filterOptions,
  onExportFiltered,
  onExportAll,
  isExportingFiltered,
  isExportingAll,
}) => {
  const { t } = useTranslation();

  const hasActiveFilters =
    Boolean(filters.searchQuery.trim()) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    Boolean(filters.actorId) ||
    Boolean(filters.action) ||
    Boolean(filters.entityType) ||
    Boolean(filters.outcome);

  return (
    <div className="space-y-4 rounded-2xl border border-card-border bg-card-bg p-4 sm:p-5 shadow-xs" id="audit-log-filters">
      {/* Top row: Search input & Export buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            placeholder={t('audit.searchPlaceholder', 'Search by actor, action, object, details, or ID…')}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/70 pl-10 pr-4 py-2 text-xs sm:text-sm text-text-heading placeholder:text-text-muted/70 focus:outline-hidden focus:border-link-primary transition-colors"
            id="audit-search-input"
          />
        </div>

        {/* Action buttons: Export Filtered, Export All, Reset */}
        <div className="flex items-center flex-wrap gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-heading hover:bg-card-header-bg transition-colors cursor-pointer"
              id="audit-reset-filters-btn"
              title={t('audit.resetFilters', 'Reset all filters')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('audit.reset', 'Reset')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportFiltered}
            disabled={isExportingFiltered || isExportingAll}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-xs font-semibold text-text-body shadow-xs hover:bg-card-header-bg disabled:opacity-50 transition-colors cursor-pointer"
            id="audit-export-filtered-btn"
            title={t('audit.exportFilteredTitle', 'Export currently filtered results as CSV')}
          >
            {isExportingFiltered ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-link-primary" />
            ) : (
              <Download className="h-3.5 w-3.5 text-link-primary" />
            )}
            <span>{t('audit.exportFiltered', 'Export Filtered')}</span>
          </button>

          <button
            type="button"
            onClick={onExportAll}
            disabled={isExportingFiltered || isExportingAll}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-xs font-semibold text-text-body shadow-xs hover:bg-card-header-bg disabled:opacity-50 transition-colors cursor-pointer"
            id="audit-export-all-btn"
            title={t('audit.exportAllTitle', 'Export entire company audit trail as CSV')}
          >
            {isExportingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-link-primary" />
            ) : (
              <Download className="h-3.5 w-3.5 text-text-muted" />
            )}
            <span>{t('audit.exportAll', 'Export All')}</span>
          </button>
        </div>
      </div>

      {/* Filter grid: Date from/to, Actor, Action, Entity Type, Outcome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-card-border/60">
        {/* Date From */}
        <div>
          <label className="block text-2xs font-bold uppercase tracking-wider text-text-muted mb-1">
            {t('audit.filterDateFrom', 'Date From')}
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/50 px-3 py-1.5 text-xs text-text-heading focus:outline-hidden focus:border-link-primary"
            id="filter-date-from"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-2xs font-bold uppercase tracking-wider text-text-muted mb-1">
            {t('audit.filterDateTo', 'Date To')}
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/50 px-3 py-1.5 text-xs text-text-heading focus:outline-hidden focus:border-link-primary"
            id="filter-date-to"
          />
        </div>

        {/* Actor */}
        <div>
          <label className="block text-2xs font-bold uppercase tracking-wider text-text-muted mb-1">
            {t('audit.filterActor', 'Actor')}
          </label>
          <select
            value={filters.actorId}
            onChange={(e) => onFilterChange('actorId', e.target.value)}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/50 px-3 py-1.5 text-xs text-text-heading focus:outline-hidden focus:border-link-primary cursor-pointer"
            id="filter-actor"
          >
            <option value="">{t('audit.allActors', 'All Actors')}</option>
            {filterOptions?.hasSystemEvents && (
              <option value="system">{t('audit.systemActor', 'System')}</option>
            )}
            {filterOptions?.actors?.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Action */}
        <div>
          <label className="block text-2xs font-bold uppercase tracking-wider text-text-muted mb-1">
            {t('audit.filterAction', 'Action')}
          </label>
          <select
            value={filters.action}
            onChange={(e) => onFilterChange('action', e.target.value)}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/50 px-3 py-1.5 text-xs text-text-heading focus:outline-hidden focus:border-link-primary cursor-pointer"
            id="filter-action"
          >
            <option value="">{t('audit.allActions', 'All Actions')}</option>
            {filterOptions?.actions?.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Type */}
        <div>
          <label className="block text-2xs font-bold uppercase tracking-wider text-text-muted mb-1">
            {t('audit.filterEntityType', 'Object Type')}
          </label>
          <select
            value={filters.entityType}
            onChange={(e) => onFilterChange('entityType', e.target.value)}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/50 px-3 py-1.5 text-xs text-text-heading focus:outline-hidden focus:border-link-primary cursor-pointer"
            id="filter-entity-type"
          >
            <option value="">{t('audit.allEntityTypes', 'All Types')}</option>
            {filterOptions?.entityTypes?.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-2xs font-bold uppercase tracking-wider text-text-muted mb-1">
            {t('audit.filterOutcome', 'Outcome')}
          </label>
          <select
            value={filters.outcome}
            onChange={(e) => onFilterChange('outcome', e.target.value)}
            className="w-full rounded-xl border border-card-border bg-bg-subtle/50 px-3 py-1.5 text-xs text-text-heading focus:outline-hidden focus:border-link-primary cursor-pointer"
            id="filter-outcome"
          >
            <option value="">{t('audit.allOutcomes', 'All Outcomes')}</option>
            <option value="SUCCESS">{t('audit.outcomeSuccess', 'Success')}</option>
            <option value="FAILURE">{t('audit.outcomeFailure', 'Failure')}</option>
            <option value="RESOLVED">{t('audit.outcomeResolved', 'Resolved')}</option>
            <option value="UNCLASSIFIED">{t('audit.unclassified', 'Unclassified')}</option>
          </select>
        </div>
      </div>
    </div>
  );
};
