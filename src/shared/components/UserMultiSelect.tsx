/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2, Lock, AlertCircle, User as UserIcon } from 'lucide-react';

export interface UserItem {
  id: string;
  username: string;
  email: string | null;
  status?: string;
}

export interface UserMultiSelectProps {
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const UserMultiSelect: React.FC<UserMultiSelectProps> = ({
  selectedUserIds = [],
  onChange,
  disabled = false,
  placeholder,
  className = '',
  id = 'user-multiselect',
}) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setIsForbidden(false);
      setErrorMessage(null);

      const res = await fetch('/api/users', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t('pickers.user.errorGeneric'));
      }

      const data = await res.json();
      const userList: UserItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
        ? data.users
        : [];
      setUsers(userList);
    } catch (err: any) {
      console.error('[UserMultiSelect] Error fetching users:', err);
      setErrorMessage(err.message || t('pickers.user.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Lookup map for fast name/email resolution
  const userMap = useMemo(() => {
    const map = new Map<string, UserItem>();
    for (const u of users) {
      map.set(u.id, u);
    }
    return map;
  }, [users]);

  // Client-side search filtering by username / email
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const usernameMatch = u.username ? u.username.toLowerCase().includes(query) : false;
      const emailMatch = u.email ? u.email.toLowerCase().includes(query) : false;
      return usernameMatch || emailMatch;
    });
  }, [users, searchQuery]);

  // Toggle single user
  const handleToggleUser = (userId: string) => {
    if (disabled) return;
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  // Remove single user from chips
  const handleRemoveUser = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disabled) return;
    onChange(selectedUserIds.filter((id) => id !== userId));
  };

  // Clear all selections
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Select / Deselect all matching
  const allMatchingSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.includes(u.id));

  const handleToggleSelectAllMatching = () => {
    if (disabled || filteredUsers.length === 0) return;
    if (allMatchingSelected) {
      const matchingIds = new Set(filteredUsers.map((u) => u.id));
      onChange(selectedUserIds.filter((id) => !matchingIds.has(id)));
    } else {
      const combined = new Set([...selectedUserIds, ...filteredUsers.map((u) => u.id)]);
      onChange(Array.from(combined));
    }
  };

  return (
    <div className={`space-y-2.5 font-sans ${className}`} id={id}>
      {/* 403 Forbidden State */}
      {isForbidden && (
        <div
          className="flex items-start space-x-3 p-3.5 rounded-xl bg-status-warning-bg border border-status-warning-text/25 text-status-warning-text"
          id={`${id}-forbidden`}
          role="alert"
        >
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-status-warning-text" />
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            {t('pickers.user.errorForbidden')}
          </div>
        </div>
      )}

      {/* Generic Error State */}
      {!isForbidden && errorMessage && (
        <div
          className="flex items-center justify-between p-3.5 rounded-xl bg-status-error-bg border border-status-error-text/20 text-status-error-text"
          id={`${id}-error`}
          role="alert"
        >
          <div className="flex items-center space-x-2 text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={disabled}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer ml-3 shrink-0"
            id={`${id}-retry-btn`}
          >
            {t('pickers.user.retry')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !isForbidden && !errorMessage && (
        <div
          className="flex items-center justify-center space-x-2 py-8 px-4 rounded-xl border border-card-border bg-card-bg text-text-muted text-sm"
          id={`${id}-loading`}
        >
          <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          <span>{t('pickers.user.loading')}</span>
        </div>
      )}

      {/* Main Select View (rendered when not in 403 state and not loading initial fetch) */}
      {!loading && !isForbidden && (
        <div className="space-y-2">
          {/* Selected Users Chips Area */}
          {selectedUserIds.length > 0 && (
            <div className="space-y-1.5" id={`${id}-selected-section`}>
              <div className="flex items-center justify-between text-xs text-text-muted px-0.5">
                <span className="font-medium" id={`${id}-selected-count`}>
                  {t('pickers.user.selectedCount', { count: selectedUserIds.length })}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-text-muted hover:text-text-heading underline cursor-pointer text-xs"
                    id={`${id}-clear-all-btn`}
                  >
                    {t('pickers.user.clearAll')}
                  </button>
                )}
              </div>
              <div
                className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl border border-card-border/80 bg-card-header-bg/50"
                id={`${id}-chips-container`}
              >
                {selectedUserIds.map((userId) => {
                  const user = userMap.get(userId);
                  const displayName = user?.username || user?.email || userId;
                  return (
                    <span
                      key={userId}
                      id={`${id}-chip-${userId}`}
                      className="inline-flex items-center space-x-1 pl-2 pr-1 py-0.5 rounded-lg text-xs font-medium bg-card-bg border border-card-border text-text-body shadow-2xs group"
                    >
                      <UserIcon className="h-3 w-3 text-text-muted shrink-0" />
                      <span
                        className="max-w-[150px] truncate"
                        title={user?.email ? `${displayName} (${user.email})` : displayName}
                      >
                        {displayName}
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveUser(userId, e)}
                          className="text-text-muted hover:text-status-error-text rounded p-0.5 hover:bg-card-header-bg cursor-pointer transition-colors"
                          id={`${id}-remove-chip-${userId}`}
                          aria-label={t('pickers.user.removeAria', { name: displayName })}
                          title={t('pickers.user.removeAria', { name: displayName })}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              placeholder={placeholder || t('pickers.user.searchPlaceholder')}
              className="w-full rounded-xl border border-input-border bg-card-bg py-2 pl-9 pr-8 text-sm text-text-body placeholder:text-text-muted focus:border-input-border-focus focus:outline-none focus:ring-1 focus:ring-input-border-focus/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              id={`${id}-search-input`}
            />
            {searchQuery && !disabled && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-heading p-0.5 rounded cursor-pointer"
                id={`${id}-clear-search-btn`}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* User Results List Container */}
          <div
            className="rounded-xl border border-card-border bg-card-bg overflow-hidden shadow-2xs"
            id={`${id}-results-box`}
          >
            {/* Action Bar / Matching Header (when query present or users exist) */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-card-header-bg/60 border-b border-card-border/60 text-xs text-text-muted">
                <span id={`${id}-matching-count`}>
                  {searchQuery
                    ? `${filteredUsers.length} matching`
                    : `${users.length} available`}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllMatching}
                    className="text-xs text-link-primary hover:text-link-hover font-medium cursor-pointer"
                    id={`${id}-toggle-all-matching-btn`}
                  >
                    {allMatchingSelected
                      ? t('pickers.user.deselectAllMatching')
                      : t('pickers.user.selectAllMatching')}
                  </button>
                )}
              </div>
            )}

            {/* Scrollable List */}
            <div
              className="max-h-56 overflow-y-auto divide-y divide-card-border/40"
              id={`${id}-list`}
            >
              {users.length === 0 ? (
                <div
                  className="py-6 px-4 text-center text-xs sm:text-sm text-text-muted"
                  id={`${id}-empty-no-users`}
                >
                  {t('pickers.user.emptyNoUsers')}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div
                  className="py-6 px-4 text-center text-xs sm:text-sm text-text-muted"
                  id={`${id}-empty-no-matches`}
                >
                  {t('pickers.user.emptyNoMatches', { query: searchQuery })}
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      id={`${id}-row-${user.id}`}
                      onClick={() => handleToggleUser(user.id)}
                      className={`flex items-center space-x-3 px-3 py-2 text-sm transition-colors select-none ${
                        disabled
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-card-header-bg'
                      } ${isSelected ? 'bg-card-header-bg/50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        id={`${id}-checkbox-${user.id}`}
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleUser(user.id);
                        }}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-input-border text-primary-base focus:ring-input-border-focus/40 cursor-pointer disabled:cursor-not-allowed shrink-0"
                      />
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="font-medium text-text-heading text-sm">
                            {user.username}
                          </span>
                          {user.email && (
                            <span className="text-xs text-text-muted ml-2 truncate">
                              ({user.email})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
