/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Save,
  X,
  Lock,
  Loader2,
  Info,
  Sliders,
  Settings as SettingsIcon,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  isProtected: boolean;
  parentRoleId: string | null;
  permissionCount: number;
}

interface PermissionItem {
  id: string;
  action: string;
  checked: boolean;
}

type GroupedPermissions = Record<string, PermissionItem[]>;

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const RoleManagement: React.FC = () => {
  const { t } = useTranslation();

  // Loading & State
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<GroupedPermissions>({});
  const [roleInheritanceEnabled, setRoleInheritanceEnabled] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog / Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [roleToRename, setRoleToRename] = useState<Role | null>(null);

  // Editor states (for active role details)
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [localPermissions, setLocalPermissions] = useState<GroupedPermissions>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch Company Settings
      const settingsRes = await fetch('/api/company/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setRoleInheritanceEnabled(settingsData.roleInheritanceEnabled);
      }

      // 2. Fetch Roles
      const rolesRes = await fetch('/api/roles');
      if (!rolesRes.ok) {
        throw new Error('Failed to load roles list.');
      }
      const rolesData: Role[] = await rolesRes.json();
      setRoles(rolesData);

      // Select first role by default
      if (rolesData.length > 0) {
        const defaultRole = rolesData.find(r => r.name === 'Superuser') || rolesData[0];
        setSelectedRole(defaultRole);
        await fetchRolePermissions(defaultRole.id);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch permissions for a specific role
  const fetchRolePermissions = async (roleId: string) => {
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`);
      if (!res.ok) {
        throw new Error('Failed to load permissions for this role.');
      }
      const data: GroupedPermissions = await res.json();
      setRolePermissions(data);
      setLocalPermissions(JSON.parse(JSON.stringify(data))); // Deep copy for editing
      
      const role = roles.find(r => r.id === roleId);
      if (role) {
        setEditingParentId(role.parentRoleId);
      }
    } catch (err: any) {
      setError(err.message || 'Could not fetch role permissions.');
    }
  };

  const handleRoleSelect = async (role: Role) => {
    setSelectedRole(role);
    setSuccess('');
    setError('');
    await fetchRolePermissions(role.id);
  };

  // Toggle company global inheritance setting
  const handleToggleInheritance = async () => {
    setError('');
    setSuccess('');
    const newValue = !roleInheritanceEnabled;
    try {
      const res = await fetch('/api/company/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ roleInheritanceEnabled: newValue }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update company inheritance setting.');
      }
      setRoleInheritanceEnabled(newValue);
      setSuccess('Global inheritance setting updated successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create role.');
      }

      const createdRole: Role = await res.json();
      setNewRoleName('');
      setShowCreateModal(false);
      setSuccess(`Role "${createdRole.name}" created successfully.`);
      
      // Reload list and select new role
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) {
        const rolesData: Role[] = await rolesRes.json();
        setRoles(rolesData);
        const newlyCreated = rolesData.find(r => r.id === createdRole.id);
        if (newlyCreated) {
          setSelectedRole(newlyCreated);
          await fetchRolePermissions(newlyCreated.id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Duplicate role
  const handleDuplicateRole = async (role: Role) => {
    if (role.name === 'Superuser') return; // Cannot duplicate superuser role
    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch(`/api/roles/${role.id}/duplicate`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to duplicate role.');
      }

      const duplicatedRole: Role = await res.json();
      setSuccess(`Role "${role.name}" duplicated as "${duplicatedRole.name}".`);

      // Reload list
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) {
        const rolesData: Role[] = await rolesRes.json();
        setRoles(rolesData);
        const newlyCreated = rolesData.find(r => r.id === duplicatedRole.id);
        if (newlyCreated) {
          setSelectedRole(newlyCreated);
          await fetchRolePermissions(newlyCreated.id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (role: Role) => {
    if (role.isProtected || role.name === 'Superuser') return;
    if (!window.confirm(t('rbac.deleteConfirm'))) return;

    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete role.');
      }

      setSuccess(`Role "${role.name}" deleted successfully.`);

      // Refresh roles list
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) {
        const rolesData: Role[] = await rolesRes.json();
        setRoles(rolesData);
        if (rolesData.length > 0) {
          setSelectedRole(rolesData[0]);
          await fetchRolePermissions(rolesData[0].id);
        } else {
          setSelectedRole(null);
          setRolePermissions({});
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Rename role
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleToRename || !renameValue.trim()) return;
    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch(`/api/roles/${roleToRename.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to rename role.');
      }

      setSuccess(`Role renamed to "${renameValue.trim()}" successfully.`);
      setShowRenameModal(false);
      setRoleToRename(null);

      // Refresh roles
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) {
        const rolesData: Role[] = await rolesRes.json();
        setRoles(rolesData);
        if (selectedRole?.id === roleToRename.id) {
          const updatedSelected = rolesData.find(r => r.id === roleToRename.id);
          if (updatedSelected) {
            setSelectedRole(updatedSelected);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const startRename = (role: Role) => {
    if (role.isProtected || role.name === 'Superuser') return;
    setRoleToRename(role);
    setRenameValue(role.name);
    setShowRenameModal(true);
  };

  // Toggle permission checkbox locally
  const handleLocalPermissionToggle = (moduleName: string, permissionId: string) => {
    if (!selectedRole || selectedRole.name === 'Superuser') return; // Superuser cannot be manually edited

    setLocalPermissions((prev) => {
      const list = prev[moduleName] || [];
      const updatedList = list.map((p) => {
        if (p.id === permissionId) {
          return { ...p, checked: !p.checked };
        }
        return p;
      });
      return {
        ...prev,
        [moduleName]: updatedList,
      };
    });
  };

  // Save changes to active role (Permissions and Parent Role)
  const handleSaveChanges = async () => {
    if (!selectedRole || selectedRole.name === 'Superuser') return;
    setError('');
    setSuccess('');
    setIsSavingPermissions(true);

    try {
      // Collect checked permission IDs
      const checkedIds: string[] = [];
      Object.values(localPermissions).forEach((items) => {
        items.forEach((p) => {
          if (p.checked) {
            checkedIds.push(p.id);
          }
        });
      });

      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({
          permissionIds: checkedIds,
          parentRoleId: editingParentId === 'none' ? null : editingParentId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save changes.');
      }

      setSuccess(`Changes to role "${selectedRole.name}" saved successfully.`);
      
      // Update role's parentRoleId and permissionCount in list
      setRoles(prevRoles => prevRoles.map(r => {
        if (r.id === selectedRole.id) {
          return {
            ...r,
            parentRoleId: editingParentId === 'none' ? null : editingParentId,
            permissionCount: checkedIds.length
          };
        }
        return r;
      }));

      // Reload local permission states
      await fetchRolePermissions(selectedRole.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8" id="role-mgmt-loading">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading security system profiles...</p>
        </div>
      </div>
    );
  }

  // Get eligible parent roles (exclude the active role itself to prevent cycles)
  const eligibleParentRoles = roles.filter((r) => r.id !== selectedRole?.id && r.name !== 'Superuser');

  return (
    <div className="space-y-6" id="role-management-root">
      
      {/* Alert Banners */}
      {error && (
        <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 border border-rose-100" id="role-error-banner">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-100" id="role-success-banner">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Column (Roles list & Global Switcher) - 4 cols */}
        <div className="space-y-6 lg:col-span-5">
          
          {/* Global Inheritance Toggle Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" id="global-inheritance-card">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center">
                  <Sliders className="h-4 w-4 mr-1.5 text-blue-600" />
                  {t('rbac.globalInheritance')}
                </h3>
                <p className="text-xs text-slate-500 max-w-[280px]">
                  When enabled, roles inherit all permissions assigned to their designated Parent Role automatically.
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleToggleInheritance}
                disabled={isActionLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  roleInheritanceEnabled ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                id="inheritance-toggle-button"
                role="switch"
                aria-checked={roleInheritanceEnabled}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    roleInheritanceEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Roles Registry List */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden" id="roles-list-card">
            <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-blue-600" />
                System Roles
              </h3>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={isActionLoading}
                className="flex items-center space-x-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                id="btn-create-role-trigger"
              >
                <Plus className="h-3 w-3" />
                <span>New Role</span>
              </button>
            </div>

            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {roles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {t('rbac.noRoles')}
                </div>
              ) : (
                roles.map((role) => {
                  const isSuper = role.name === 'Superuser';
                  const isProtected = role.isProtected || isSuper;
                  const isSelected = selectedRole?.id === role.id;

                  // Find parent role name
                  const parentRoleName = role.parentRoleId
                    ? roles.find((r) => r.id === role.parentRoleId)?.name
                    : null;

                  return (
                    <div
                      key={role.id}
                      onClick={() => handleRoleSelect(role)}
                      className={`flex flex-col p-4 transition-all cursor-pointer border-l-2 hover:bg-slate-50/70 ${
                        isSelected
                          ? 'border-l-blue-600 bg-blue-50/10'
                          : 'border-l-transparent'
                      }`}
                      id={`role-row-${role.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {role.name}
                          </span>
                          {isProtected && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              <Lock className="h-2.5 w-2.5 mr-0.5" />
                              System
                            </span>
                          )}
                        </div>

                        {/* Inline Actions (Always Visible, Disabled for protected) */}
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => startRename(role)}
                            disabled={isProtected || isActionLoading}
                            className={`p-1.5 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 ${
                              isProtected ? 'opacity-30 cursor-not-allowed' : 'hover:text-slate-700'
                            }`}
                            title={isProtected ? t('rbac.superuserProtected') : t('rbac.editBtn')}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDuplicateRole(role)}
                            disabled={isSuper || isActionLoading}
                            className={`p-1.5 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 ${
                              isSuper ? 'opacity-30 cursor-not-allowed' : 'hover:text-slate-700'
                            }`}
                            title={isSuper ? 'Cannot duplicate Superuser' : t('rbac.duplicateBtn')}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteRole(role)}
                            disabled={isProtected || isActionLoading}
                            className={`p-1.5 rounded-lg text-slate-400 transition-colors hover:bg-rose-50 ${
                              isProtected ? 'opacity-30 cursor-not-allowed' : 'hover:text-rose-600'
                            }`}
                            title={isProtected ? t('rbac.superuserProtected') : t('rbac.deleteBtn')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Parent Role indicator & Permission count */}
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {parentRoleName ? (
                            <span className="text-slate-500 font-medium">
                              Parent: {parentRoleName}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">No parent role</span>
                          )}
                        </span>
                        <span className="font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {role.permissionCount} rules
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Role details / Permission Matrix) - 7 cols */}
        <div className="lg:col-span-7">
          {selectedRole ? (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden" id="role-editor-card">
              
              {/* Editor Header */}
              <div className="border-b border-slate-50 bg-slate-50/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Role Permissions configuration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Editing profile for <strong className="text-slate-700">{selectedRole.name}</strong>
                    </p>
                  </div>

                  {selectedRole.name !== 'Superuser' && (
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSavingPermissions}
                      className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 h-9 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                      id="btn-save-role-changes"
                    >
                      {isSavingPermissions ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{t('rbac.saveBtn')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Content */}
              <div className="p-6 space-y-6">
                
                {/* Parent Role selection (Disabled for Superuser) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      {t('rbac.parentRole')}
                    </label>
                    <p className="text-xs text-slate-400">
                      Select parent to inherit all of its permissions.
                    </p>
                  </div>

                  <div className="flex items-center">
                    <select
                      value={editingParentId || 'none'}
                      onChange={(e) => setEditingParentId(e.target.value)}
                      disabled={selectedRole.name === 'Superuser'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 h-10 text-xs font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                      id="parent-role-selector"
                    >
                      <option value="none">-- {t('rbac.noParent')} --</option>
                      {eligibleParentRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Superuser Information Banner */}
                {selectedRole.name === 'Superuser' && (
                  <div className="flex items-start space-x-2 rounded-xl bg-blue-50 p-4 text-xs text-blue-800 border border-blue-100">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div className="space-y-1 font-semibold">
                      <p>The Superuser role holds absolute administrative permissions.</p>
                      <p className="text-blue-600 font-normal">Permissions for this system role are managed automatically by the kernel and cannot be manually unchecked or altered.</p>
                    </div>
                  </div>
                )}

                {/* Permissions Grid */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('rbac.permissions')} Matrix
                  </h4>

                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                    {Object.keys(localPermissions).length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs italic">
                        No permissions registry synchronized on the server.
                      </div>
                    ) : (
                      Object.keys(localPermissions).map((moduleName) => {
                        const permissions = localPermissions[moduleName] || [];

                        return (
                          <div key={moduleName} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 bg-white hover:bg-slate-50/20 transition-colors">
                            {/* Module header */}
                            <div className="sm:w-1/4">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                {moduleName}
                              </span>
                            </div>

                            {/* Actions list */}
                            <div className="sm:w-3/4 grid grid-cols-2 gap-3">
                              {permissions.map((p) => {
                                const isSuper = selectedRole.name === 'Superuser';
                                const isChecked = isSuper ? true : p.checked;

                                return (
                                  <label
                                    key={p.id}
                                    className={`flex items-center space-x-2 cursor-pointer text-xs font-semibold select-none ${
                                      isSuper ? 'cursor-not-allowed opacity-70' : 'text-slate-700 hover:text-slate-900'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isSuper}
                                      onChange={() => handleLocalPermissionToggle(moduleName, p.id)}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:bg-blue-100/50 disabled:text-blue-600"
                                    />
                                    <span>{p.action}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-400 text-sm">
              Please select a role from the registry list to modify its parameters.
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: Create Role Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Create New Role
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {t('rbac.roleName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Content Reviewer"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 h-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('rbac.cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="w-1/2 flex h-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  <span>{t('rbac.createBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Rename Role Dialog */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Rename Role
              </h3>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRoleToRename(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {t('rbac.roleName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Administrator"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 h-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameModal(false);
                    setRoleToRename(null);
                  }}
                  className="w-1/2 flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('rbac.cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="w-1/2 flex h-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  <span>{t('rbac.saveBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
