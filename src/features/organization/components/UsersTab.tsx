import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../shared/components/AppGate';
import {
  Search,
  Filter,
  User,
  Mail,
  Shield,
  Activity,
  Layers,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Key,
  Archive,
  Download,
  Upload
} from 'lucide-react';
import { ProfileFieldInput } from '../../../shared/components/ProfileFieldInput';
import { BulkImportWizard } from './BulkImportWizard';

interface BasicUser {
  id: string;
  username: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  status: 'ACTIVE' | 'PENDING' | 'ARCHIVED';
  role: { id: string; name: string } | null;
  organizationUnit: { id: string; name: string } | null;
}

interface UserDetail {
  id: string;
  username: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  status: 'ACTIVE' | 'PENDING' | 'ARCHIVED';
  role: { id: string; name: string } | null;
  organizationUnits: Array<{ id: string; name: string; membershipType: string }>;
  learningGroups: Array<{ id: string; name: string }>;
  profile: any[];
}

interface RoleOption {
  id: string;
  name: string;
}

interface OrgUnitOption {
  id: string;
  name: string;
}

interface LearningGroupOption {
  id: string;
  name: string;
}

export const UsersTab: React.FC = () => {
  const { t } = useTranslation();
  const { user: loggedInUser } = useAuth();

  // Permissions check
  const hasUsersEdit = !!(loggedInUser?.effectivePermissions?.includes('users:edit') || loggedInUser?.isSuperuser);
  const hasUsersDelete = !!(loggedInUser?.effectivePermissions?.includes('users:delete') || loggedInUser?.isSuperuser);

  // States for list and filtering
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgUnitFilter, setOrgUnitFilter] = useState('');

  // Dropdown reference lists
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([]);
  const [learningGroups, setLearningGroups] = useState<LearningGroupOption[]>([]);

  // Selected User detail & editing states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

  // Edit fields state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editOrgUnitId, setEditOrgUnitId] = useState('');
  const [editLearningGroupIds, setEditLearningGroupIds] = useState<string[]>([]);
  const [editProfileFields, setEditProfileFields] = useState<any[]>([]);

  // Notifications states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal / sub-wizard states
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateOption, setReactivateOption] = useState<'RESTORE' | 'FRESH_START'>('RESTORE');

  // CSRF token helper
  const getCsrfToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  // Fetch dropdown collections
  const fetchDropdownData = async () => {
    try {
      // 1. Roles
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data);
      }
      // 2. Org Units
      const orgRes = await fetch('/api/organization-units');
      if (orgRes.ok) {
        const data = await orgRes.json();
        setOrgUnits(data);
      }
      // 3. Learning Groups
      const groupRes = await fetch('/api/learning-groups');
      if (groupRes.ok) {
        const data = await groupRes.json();
        setLearningGroups(data);
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };

  // Fetch list of users
  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status: statusFilter,
        roleId: roleFilter,
        organizationUnitId: orgUnitFilter
      });

      const res = await fetch(`/api/users?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load users list.');
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  // Load dropdowns on mount
  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Fetch users list when page/filters change
  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, roleFilter, orgUnitFilter]);

  // Debounced/Triggered search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Open user details slide-over
  const handleViewDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error('Failed to load user details.');
      const data: UserDetail = await res.json();
      setUserDetail(data);

      // Populate edit states
      setEditFirstName(data.firstName || '');
      setEditLastName(data.lastName || '');
      setEditRoleId(data.role?.id || '');
      // Primary organization unit is of membershipType 'MEMBER'
      const primaryOU = data.organizationUnits.find(ou => ou.membershipType === 'MEMBER');
      setEditOrgUnitId(primaryOU?.id || '');
      setEditLearningGroupIds(data.learningGroups.map(lg => lg.id));
      setEditProfileFields(data.profile || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading user.');
      setSelectedUserId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close details panel
  const handleCloseDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  // Handle custom profile field edits from ProfileFieldInput
  const handleProfileFieldChange = (fieldId: string, val: string) => {
    setEditProfileFields((prev) =>
      prev.map((f) => (f.fieldDefinitionId === fieldId ? { ...f, value: val } : f))
    );
  };

  // Toggle learning groups in checklist
  const handleToggleLearningGroup = (groupId: string) => {
    setEditLearningGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Save changes
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !userDetail) return;

    setSavingDetail(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. Save standard fields via PUT /api/users/:id
      const userPayload = {
        firstName: editFirstName,
        lastName: editLastName,
        roleId: editRoleId || null,
        organizationUnitId: editOrgUnitId || null,
        learningGroupIds: editLearningGroupIds
      };

      const userRes = await fetch(`/api/users/${selectedUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify(userPayload)
      });

      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || 'Failed to update user basic settings.');
      }

      // 2. Save custom profile fields via PUT /api/profile/:userId
      const customRes = await fetch(`/api/profile/${selectedUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({
          fields: editProfileFields.map((f) => ({
            fieldDefinitionId: f.fieldDefinitionId,
            value: f.value
          }))
        })
      });

      if (!customRes.ok) {
        const errorData = await customRes.json();
        throw new Error(errorData.error || 'Failed to update custom profile fields.');
      }

      setSuccessMsg(t('profile.personal.successAlert') || 'User saved successfully.');
      // Refresh list & current view
      fetchUsers();
      handleViewDetail(selectedUserId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes.');
    } finally {
      setSavingDetail(false);
    }
  };

  // Admin action: Reset Password
  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/users/${selectedUserId}/admin-reset-password`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });
      if (!res.ok) throw new Error('Failed to reset user password.');
      setSuccessMsg(t('organization.usersTab.resetPasswordSuccess'));
    } catch (err: any) {
      setErrorMsg(err.message || t('organization.usersTab.resetPasswordError'));
    }
  };

  // Admin action: Archive User
  const handleArchiveUser = async () => {
    if (!selectedUserId) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    setShowArchiveConfirm(false);
    try {
      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });
      if (!res.ok) throw new Error('Failed to archive user.');
      setSuccessMsg(t('organization.usersTab.archiveSuccess'));
      fetchUsers();
      handleViewDetail(selectedUserId);
    } catch (err: any) {
      setErrorMsg(err.message || t('organization.usersTab.archiveError'));
    }
  };

  // Admin action: Reactivate / Restore User
  const handleReactivateUser = async () => {
    if (!selectedUserId) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    setShowReactivateModal(false);
    try {
      const res = await fetch(`/api/users/${selectedUserId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ option: reactivateOption })
      });
      if (!res.ok) throw new Error('Failed to restore user.');
      setSuccessMsg(t('organization.usersTab.restoreSuccess'));
      fetchUsers();
      handleViewDetail(selectedUserId);
    } catch (err: any) {
      setErrorMsg(err.message || t('organization.usersTab.restoreError'));
    }
  };

  // Custom profile fields grouping by categories (for detail rendering)
  const categoriesMap = new Map<string, { id: string; name: string; displayOrder: number; fields: any[] }>();
  const defaultCategory = { id: 'uncategorized', name: 'Other Details', displayOrder: 999, fields: [] };

  editProfileFields.forEach((field) => {
    const cat = field.category;
    if (cat) {
      if (!categoriesMap.has(cat.id)) {
        categoriesMap.set(cat.id, { id: cat.id, name: cat.name, displayOrder: cat.displayOrder, fields: [] });
      }
      categoriesMap.get(cat.id)!.fields.push(field);
    } else {
      defaultCategory.fields.push(field);
    }
  });

  const sortedCategories = Array.from(categoriesMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  if (defaultCategory.fields.length > 0) {
    sortedCategories.push(defaultCategory);
  }

  // Find logged-in user role ID to calculate editability correctly
  const loggedInRole = roles.find((r) => r.name === loggedInUser?.roleName);
  const loggedInUserRoles = loggedInRole ? [loggedInRole.id] : [];

  return (
    <div className="space-y-6" id="users-tab-container">
      {/* Title block with action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-text-heading">{t('organization.usersTab.title')}</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('organization.usersTab.subtitle')}
          </p>
        </div>
        {hasUsersEdit && (
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-btn-primary-bg px-4 py-2.5 text-xs font-semibold text-btn-primary-text hover:bg-btn-primary-hover transition-colors shadow-sm shrink-0"
            id="btn-open-bulk-import"
          >
            <Upload className="h-4 w-4" />
            <span>{t('organization.usersTab.bulkImportBtn')}</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="flex items-center space-x-2.5 rounded-xl bg-status-success-bg border border-status-success-text/20 p-4 text-sm text-status-success-text" id="users-tab-success">
          <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center space-x-2.5 rounded-xl bg-status-error-bg border border-status-error-text/20 p-4 text-sm text-status-error-text" id="users-tab-error">
          <AlertCircle className="h-4 w-4 text-status-error-text shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filters bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3" id="users-filters-form">
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder={t('organization.usersTab.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body"
            id="input-user-search"
          />
        </div>

        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body"
            id="select-filter-status"
          >
            <option value="">{t('organization.usersTab.allStatuses')}</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body"
            id="select-filter-role"
          >
            <option value="">{t('organization.usersTab.allRoles')}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={orgUnitFilter}
            onChange={(e) => {
              setOrgUnitFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body"
            id="select-filter-org-unit"
          >
            <option value="">{t('organization.usersTab.allOrgUnits')}</option>
            {orgUnits.map((ou) => (
              <option key={ou.id} value={ou.id}>
                {ou.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-card-header-bg hover:bg-card-border/50 px-3 py-2 text-sm font-semibold text-text-body transition-colors border border-card-border"
            id="btn-filter-submit"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Grid containing list (and optional slide-over overlay panel) */}
      <div className="relative" id="users-list-layout">
        {loading ? (
          <div className="flex items-center justify-center py-20" id="users-loading-state">
            <Loader2 className="h-8 w-8 text-link-primary animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 border border-card-border rounded-2xl bg-card-bg space-y-2" id="users-empty-state">
            <User className="h-10 w-10 text-text-muted mx-auto" />
            <p className="text-sm font-bold text-text-body">{t('organization.usersTab.noUsersFound')}</p>
          </div>
        ) : (
          <div className="border border-card-border rounded-2xl bg-card-bg shadow-sm overflow-hidden" id="users-list-table-container">
            <table className="min-w-full divide-y divide-card-border text-left text-xs" id="users-list-table">
              <thead className="bg-card-header-bg text-text-muted font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{t('organization.usersTab.nameCol')}</th>
                  <th className="px-6 py-4">{t('organization.usersTab.emailCol')}</th>
                  <th className="px-6 py-4 text-center">{t('organization.usersTab.statusCol')}</th>
                  <th className="px-6 py-4">{t('organization.usersTab.roleCol')}</th>
                  <th className="px-6 py-4">{t('organization.usersTab.orgUnitCol')}</th>
                  <th className="px-6 py-4 text-right">{t('organization.usersTab.actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border bg-card-bg">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => handleViewDetail(u.id)}
                    className="hover:bg-card-header-bg cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-text-heading">{u.name}</td>
                    <td className="px-6 py-4 text-text-muted font-medium">{u.email}</td>
                    <td className="px-6 py-4 text-center">
                      {u.status === 'ACTIVE' && (
                        <span className="inline-flex items-center rounded-full bg-status-success-bg border border-status-success-text/20 px-2.5 py-1 text-2xs font-semibold text-status-success-text">
                          Active
                        </span>
                      )}
                      {u.status === 'PENDING' && (
                        <span className="inline-flex items-center rounded-full bg-status-warning-bg border border-status-warning-text/20 px-2.5 py-1 text-2xs font-semibold text-status-warning-text">
                          Pending
                        </span>
                      )}
                      {u.status === 'ARCHIVED' && (
                        <span className="inline-flex items-center rounded-full bg-card-header-bg border border-card-border px-2.5 py-1 text-2xs font-semibold text-text-muted">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-text-body">{u.role?.name || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-text-body">{u.organizationUnit?.name || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(u.id);
                        }}
                        className="text-link-primary hover:text-link-primary/80 font-bold"
                      >
                        {t('organization.usersTab.editBtn')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-card-border bg-card-header-bg" id="users-pagination">
                <span className="text-xs text-text-muted font-medium">
                  Showing <span className="font-semibold text-text-heading">{users.length}</span> of{' '}
                  <span className="font-semibold text-text-heading">{total}</span> users
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-card-header-bg disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-text-body">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-card-header-bg disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slide-over details panel */}
        {selectedUserId && (
          <div className="fixed inset-0 z-40 bg-bg-overlay/40 backdrop-blur-3xs" id="user-details-overlay">
            <div className="absolute top-0 right-0 h-full w-full max-w-lg bg-card-bg border-l border-card-border shadow-2xl flex flex-col" id="user-details-panel">
              {/* Slide-over header */}
              <div className="p-6 border-b border-card-border flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-status-info-bg p-2.5 text-link-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-heading">
                      {t('organization.usersTab.userDetailTitle')}
                    </h3>
                    <p className="text-xs text-text-muted leading-normal">
                      {userDetail?.name || '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="rounded-lg p-1.5 text-text-muted hover:text-text-body hover:bg-card-header-bg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Slide-over Content */}
              {loadingDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-link-primary animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSaveUser} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Basic info form */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                        Account Information
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-text-muted">First Name</label>
                          <input
                            type="text"
                            disabled={!hasUsersEdit}
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body disabled:bg-card-header-bg disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-text-muted">Last Name</label>
                          <input
                            type="text"
                            disabled={!hasUsersEdit}
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body disabled:bg-card-header-bg disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted">Email Address</label>
                        <input
                          type="email"
                          disabled={true}
                          value={userDetail?.email || ''}
                          className="w-full px-3 py-2 text-xs border border-input-border rounded-xl bg-card-header-bg text-text-muted cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted">Role</label>
                        <select
                          disabled={!hasUsersEdit}
                          value={editRoleId}
                          onChange={(e) => setEditRoleId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body disabled:bg-card-header-bg disabled:cursor-not-allowed"
                        >
                          <option value="">Select Role</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted">Organization Unit</label>
                        <select
                          disabled={!hasUsersEdit}
                          value={editOrgUnitId}
                          onChange={(e) => setEditOrgUnitId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-link-primary/20 bg-card-bg text-text-body disabled:bg-card-header-bg disabled:cursor-not-allowed"
                        >
                          <option value="">Select Organization Unit</option>
                          {orgUnits.map((ou) => (
                            <option key={ou.id} value={ou.id}>
                              {ou.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Learning Groups checklist */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Learning Cohorts / Groups</label>
                        {learningGroups.length === 0 ? (
                          <p className="text-xs text-text-muted italic">No learning cohorts defined.</p>
                        ) : (
                          <div className="border border-card-border rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-2 bg-card-bg">
                            {learningGroups.map((lg) => {
                              const isChecked = editLearningGroupIds.includes(lg.id);
                              return (
                                <label
                                  key={lg.id}
                                  className="flex items-center space-x-2.5 text-xs font-medium text-text-body cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!hasUsersEdit}
                                    checked={isChecked}
                                    onChange={() => handleToggleLearningGroup(lg.id)}
                                    className="rounded border-input-border text-link-primary focus:ring-link-primary/20"
                                  />
                                  <span>{lg.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom profile fields */}
                    {sortedCategories.map((category) => (
                      <div key={category.id} className="space-y-4">
                        <h4 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                          {category.name}
                        </h4>
                        <div className="space-y-4">
                          {category.fields.map((field) => (
                            <ProfileFieldInput
                              key={field.fieldDefinitionId}
                              field={{ ...field, id: field.fieldDefinitionId }}
                              value={field.value || ''}
                              isOwner={false}
                              userRoles={loggedInUserRoles}
                              isSuperuser={loggedInUser?.isSuperuser}
                              disabled={!hasUsersEdit}
                              onChange={(val) => handleProfileFieldChange(field.fieldDefinitionId, val)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Admin utility actions panel */}
                    <div className="pt-6 border-t border-card-border space-y-3">
                      <h4 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                        Admin Controls
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        {hasUsersEdit && (
                          <button
                            type="button"
                            onClick={handleResetPassword}
                            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-text-body bg-card-header-bg border border-card-border rounded-xl hover:bg-card-border/50 transition-colors"
                            id="btn-admin-reset-pw"
                          >
                            <Key className="h-3.5 w-3.5 text-text-muted" />
                            <span>{t('organization.usersTab.resetPasswordBtn')}</span>
                          </button>
                        )}

                        {hasUsersDelete && (
                          userDetail?.status === 'ARCHIVED' ? (
                            <button
                              type="button"
                              onClick={() => setShowReactivateModal(true)}
                              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-link-primary bg-status-info-bg border border-link-primary/20 rounded-xl hover:bg-status-info-bg/80 transition-colors"
                              id="btn-admin-reactivate"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-link-primary" />
                              <span>{t('organization.usersTab.restoreBtn')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowArchiveConfirm(true)}
                              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-status-error-text bg-status-error-bg border border-status-error-text/20 rounded-xl hover:bg-status-error-bg/80 transition-colors"
                              id="btn-admin-archive"
                            >
                              <Archive className="h-3.5 w-3.5 text-status-error-text" />
                              <span>{t('organization.usersTab.archiveBtn')}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slide-over Footer Actions */}
                  {hasUsersEdit && (
                    <div className="p-6 border-t border-card-border bg-card-header-bg flex items-center justify-end space-x-3 shrink-0">
                      <button
                        type="button"
                        onClick={handleCloseDetail}
                        className="px-5 py-2.5 text-sm font-semibold text-text-body hover:text-text-heading hover:bg-card-header-bg rounded-xl transition-colors"
                        id="user-edit-cancel-btn"
                      >
                        {t('organization.usersTab.cancelBtn')}
                      </button>
                      <button
                        type="submit"
                        disabled={savingDetail}
                        className="flex items-center justify-center space-x-2 rounded-xl bg-btn-primary-bg px-6 py-2.5 text-sm font-semibold text-btn-primary-text hover:bg-btn-primary-hover transition-colors disabled:opacity-50 shadow-sm"
                        id="user-edit-save-btn"
                      >
                        {savingDetail ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>{t('organization.usersTab.saveBtn')}</span>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-overlay backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-card-bg rounded-2xl border border-card-border shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-status-error-bg p-2.5 text-status-error-text mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-heading">
                  {t('organization.usersTab.archiveTitle', { name: userDetail?.name })}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t('organization.usersTab.archiveBody')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-text-body hover:text-text-heading hover:bg-card-header-bg rounded-xl transition-colors"
              >
                {t('organization.usersTab.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleArchiveUser}
                className="px-4 py-2 text-xs font-semibold text-btn-primary-text bg-status-error-text hover:bg-status-error-text/90 rounded-xl transition-colors shadow-sm"
              >
                {t('organization.usersTab.archiveConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Choice Option Dialog Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-overlay backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-card-bg rounded-2xl border border-card-border shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-status-info-bg p-2.5 text-link-primary mt-0.5">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-heading">
                  {t('organization.usersTab.reactivateTitle', { name: userDetail?.name })}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Choose the reactivation state style behavior below. This delegates directly to the system's dual restoration options.
                </p>
              </div>
            </div>

            {/* Reactivation Radio Choice Options */}
            <div className="space-y-3 bg-card-header-bg p-4 rounded-xl border border-card-border">
              <label className="text-xs font-bold text-text-muted block mb-1">
                {t('organization.usersTab.reactivateOptionLabel')}
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="reactivate-option"
                  value="RESTORE"
                  checked={reactivateOption === 'RESTORE'}
                  onChange={() => setReactivateOption('RESTORE')}
                  className="mt-1.5 text-link-primary border-input-border focus:ring-link-primary/20"
                />
                <span className="text-xs font-bold text-text-heading leading-relaxed">
                  {t('organization.usersTab.reactivateRestore')}
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer pt-2">
                <input
                  type="radio"
                  name="reactivate-option"
                  value="FRESH_START"
                  checked={reactivateOption === 'FRESH_START'}
                  onChange={() => setReactivateOption('FRESH_START')}
                  className="mt-1.5 text-link-primary border-input-border focus:ring-link-primary/20"
                />
                <span className="text-xs font-bold text-text-heading leading-relaxed">
                  {t('organization.usersTab.reactivateFreshStart')}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-text-body hover:text-text-heading hover:bg-card-header-bg rounded-xl transition-colors"
              >
                {t('organization.usersTab.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleReactivateUser}
                className="px-4 py-2 text-xs font-semibold text-btn-primary-text bg-btn-primary-bg hover:bg-btn-primary-hover rounded-xl transition-colors shadow-sm"
              >
                {t('organization.usersTab.reactivateConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import wizard modal */}
      {showBulkImport && (
        <BulkImportWizard
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            fetchUsers();
            setSuccessMsg('Bulk user import completed successfully!');
          }}
        />
      )}
    </div>
  );
};
