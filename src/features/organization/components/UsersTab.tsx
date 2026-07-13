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
          <h3 className="text-lg font-bold text-slate-900">{t('organization.usersTab.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('organization.usersTab.subtitle')}
          </p>
        </div>
        {hasUsersEdit && (
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/10 shrink-0"
            id="btn-open-bulk-import"
          >
            <Upload className="h-4 w-4" />
            <span>{t('organization.usersTab.bulkImportBtn')}</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="flex items-center space-x-2.5 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700" id="users-tab-success">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center space-x-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700" id="users-tab-error">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filters bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3" id="users-filters-form">
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('organization.usersTab.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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
            className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors border border-slate-200"
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
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 border border-slate-100 rounded-2xl bg-white space-y-2" id="users-empty-state">
            <User className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">{t('organization.usersTab.noUsersFound')}</p>
          </div>
        ) : (
          <div className="border border-slate-200/80 rounded-2xl bg-white shadow-sm overflow-hidden" id="users-list-table-container">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs" id="users-list-table">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{t('organization.usersTab.nameCol')}</th>
                  <th className="px-6 py-4">{t('organization.usersTab.emailCol')}</th>
                  <th className="px-6 py-4 text-center">{t('organization.usersTab.statusCol')}</th>
                  <th className="px-6 py-4">{t('organization.usersTab.roleCol')}</th>
                  <th className="px-6 py-4">{t('organization.usersTab.orgUnitCol')}</th>
                  <th className="px-6 py-4 text-right">{t('organization.usersTab.actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => handleViewDetail(u.id)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>
                    <td className="px-6 py-4 text-center">
                      {u.status === 'ACTIVE' && (
                        <span className="inline-flex items-center rounded-full bg-green-50 border border-green-100 px-2.5 py-1 text-2xs font-semibold text-green-700">
                          Active
                        </span>
                      )}
                      {u.status === 'PENDING' && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-2xs font-semibold text-amber-700">
                          Pending
                        </span>
                      )}
                      {u.status === 'ARCHIVED' && (
                        <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200/50 px-2.5 py-1 text-2xs font-semibold text-slate-600">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{u.role?.name || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{u.organizationUnit?.name || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(u.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold"
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30" id="users-pagination">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-semibold text-slate-800">{users.length}</span> of{' '}
                  <span className="font-semibold text-slate-800">{total}</span> users
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
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
          <div className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-3xs" id="user-details-overlay">
            <div className="absolute top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col" id="user-details-panel">
              {/* Slide-over header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {t('organization.usersTab.userDetailTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      {userDetail?.name || '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Slide-over Content */}
              {loadingDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSaveUser} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Basic info form */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        Account Information
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">First Name</label>
                          <input
                            type="text"
                            disabled={!hasUsersEdit}
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Last Name</label>
                          <input
                            type="text"
                            disabled={!hasUsersEdit}
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Email Address</label>
                        <input
                          type="email"
                          disabled={true}
                          value={userDetail?.email || ''}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Role</label>
                        <select
                          disabled={!hasUsersEdit}
                          value={editRoleId}
                          onChange={(e) => setEditRoleId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
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
                        <label className="text-xs font-bold text-slate-500">Organization Unit</label>
                        <select
                          disabled={!hasUsersEdit}
                          value={editOrgUnitId}
                          onChange={(e) => setEditOrgUnitId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
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
                        <label className="text-xs font-bold text-slate-500">Learning Cohorts / Groups</label>
                        {learningGroups.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No learning cohorts defined.</p>
                        ) : (
                          <div className="border border-slate-100 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-2 bg-white">
                            {learningGroups.map((lg) => {
                              const isChecked = editLearningGroupIds.includes(lg.id);
                              return (
                                <label
                                  key={lg.id}
                                  className="flex items-center space-x-2.5 text-xs font-medium text-slate-700 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!hasUsersEdit}
                                    checked={isChecked}
                                    onChange={() => handleToggleLearningGroup(lg.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
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
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
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
                    <div className="pt-6 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        Admin Controls
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        {hasUsersEdit && (
                          <button
                            type="button"
                            onClick={handleResetPassword}
                            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition-colors"
                            id="btn-admin-reset-pw"
                          >
                            <Key className="h-3.5 w-3.5 text-slate-500" />
                            <span>{t('organization.usersTab.resetPasswordBtn')}</span>
                          </button>
                        )}

                        {hasUsersDelete && (
                          userDetail?.status === 'ARCHIVED' ? (
                            <button
                              type="button"
                              onClick={() => setShowReactivateModal(true)}
                              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100/60 transition-colors"
                              id="btn-admin-reactivate"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                              <span>{t('organization.usersTab.restoreBtn')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowArchiveConfirm(true)}
                              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100/60 transition-colors"
                              id="btn-admin-archive"
                            >
                              <Archive className="h-3.5 w-3.5 text-red-500" />
                              <span>{t('organization.usersTab.archiveBtn')}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slide-over Footer Actions */}
                  {hasUsersEdit && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end space-x-3 shrink-0">
                      <button
                        type="button"
                        onClick={handleCloseDetail}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                        id="user-edit-cancel-btn"
                      >
                        {t('organization.usersTab.cancelBtn')}
                      </button>
                      <button
                        type="submit"
                        disabled={savingDetail}
                        className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-600/10"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-red-50 p-2.5 text-red-600 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {t('organization.usersTab.archiveTitle', { name: userDetail?.name })}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('organization.usersTab.archiveBody')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('organization.usersTab.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleArchiveUser}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-600/10"
              >
                {t('organization.usersTab.archiveConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Choice Option Dialog Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 mt-0.5">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {t('organization.usersTab.reactivateTitle', { name: userDetail?.name })}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose the reactivation state style behavior below. This delegates directly to the system's dual restoration options.
                </p>
              </div>
            </div>

            {/* Reactivation Radio Choice Options */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {t('organization.usersTab.reactivateOptionLabel')}
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="reactivate-option"
                  value="RESTORE"
                  checked={reactivateOption === 'RESTORE'}
                  onChange={() => setReactivateOption('RESTORE')}
                  className="mt-1.5 text-blue-600 border-slate-300 focus:ring-blue-500/20"
                />
                <span className="text-xs font-bold text-slate-800 leading-relaxed">
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
                  className="mt-1.5 text-blue-600 border-slate-300 focus:ring-blue-500/20"
                />
                <span className="text-xs font-bold text-slate-800 leading-relaxed">
                  {t('organization.usersTab.reactivateFreshStart')}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('organization.usersTab.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleReactivateUser}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-600/10"
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
