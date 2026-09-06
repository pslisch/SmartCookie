import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, FolderSync, ShieldAlert, AlertCircle, 
  RotateCcw, Check, X, ChevronRight, ChevronDown, UserPlus, 
  ShieldCheck, Trash, UserX, Loader2 
} from 'lucide-react';

interface User {
  id: string;
  username: string | null;
  email: string | null;
}

interface Membership {
  id: string;
  userId: string;
  membershipType: 'MEMBER' | 'MANAGER';
  user?: User;
}

interface OrganizationUnit {
  id: string;
  name: string;
  parentId: string | null;
  deletedAt: string | null;
  permanentDeleteAt: string | null;
  deletionBatchId: string | null;
  memberships?: Membership[];
}

interface TreeNode extends OrganizationUnit {
  children: TreeNode[];
  depth: number;
}

export const OrganizationStructureTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeOUs, setActiveOUs] = useState<OrganizationUnit[]>([]);
  const [deletedOUs, setDeletedOUs] = useState<OrganizationUnit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newOUName, setNewOUName] = useState('');
  const [newOUParentId, setNewOUParentId] = useState<string>('');
  const [editingOUId, setEditingOUId] = useState<string | null>(null);
  const [editingOUName, setEditingOUName] = useState('');

  // Dropdown assignment states
  const [selectedOUForUser, setSelectedOUForUser] = useState<string>('');
  const [selectedUserToMove, setSelectedUserToMove] = useState<string>('');
  const [selectedOUForManager, setSelectedOUForManager] = useState<string>('');
  const [selectedUserToManager, setSelectedUserToManager] = useState<string>('');

  // Delete modal states
  const [deletingOU, setDeletingOU] = useState<OrganizationUnit | null>(null);
  const [deleteOption, setDeleteOption] = useState<'REASSIGN' | 'SUBTREE'>('REASSIGN');
  const [affectedUsers, setAffectedUsers] = useState<User[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // CSRF token helpers
  const getCsrfToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch active OUs
      const resActive = await fetch('/api/organization-units');
      if (!resActive.ok) throw new Error(t('organization.structure.errors.failedToFetchActive'));
      const dataActive = await resActive.json();
      setActiveOUs(dataActive);

      // 2. Fetch deleted OUs
      const resDeleted = await fetch('/api/organization-units?showDeleted=true');
      if (resDeleted.ok) {
        const dataDeleted = await resDeleted.json();
        setDeletedOUs(dataDeleted);
      }

      // 3. Fetch active users
      const resUsers = await fetch('/api/users');
      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setUsers(dataUsers);
      }
    } catch (err: any) {
      setError(err.message || t('organization.structure.errors.unexpectedFetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch deletion preview when delete modal opens or delete option changes
  useEffect(() => {
    if (deletingOU) {
      const fetchPreview = async () => {
        setLoadingPreview(true);
        try {
          const res = await fetch(`/api/organization-units/${deletingOU.id}/deletion-preview?option=${deleteOption}`);
          if (res.ok) {
            const data = await res.json();
            setAffectedUsers(data);
          }
        } catch (err) {
          console.error('Error fetching deletion preview:', err);
        } finally {
          setLoadingPreview(false);
        }
      };
      fetchPreview();
    }
  }, [deletingOU, deleteOption]);

  // Create OU
  const handleCreateOU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOUName.trim()) return;

    setError(null);
    try {
      const res = await fetch('/api/organization-units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({
          name: newOUName,
          parentId: newOUParentId || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToCreate'));
      }

      setNewOUName('');
      setNewOUParentId('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Rename OU
  const handleRenameOU = async (id: string) => {
    if (!editingOUName.trim()) return;

    setError(null);
    try {
      const res = await fetch(`/api/organization-units/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ name: editingOUName })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToRename'));
      }

      setEditingOUId(null);
      setEditingOUName('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Move User
  const handleMoveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOUForUser || !selectedUserToMove) return;

    setError(null);
    try {
      const res = await fetch(`/api/organization-units/${selectedOUForUser}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ userId: selectedUserToMove })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToAssignUser'));
      }

      setSelectedUserToMove('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Assign Manager
  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOUForManager || !selectedUserToManager) return;

    setError(null);
    try {
      const res = await fetch(`/api/organization-units/${selectedOUForManager}/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ userId: selectedUserToManager })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToAssignManager'));
      }

      setSelectedUserToManager('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Remove Manager
  const handleRemoveManager = async (ouId: string, userId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/organization-units/${ouId}/managers/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToRemoveManager'));
      }

      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Confirm delete OU
  const handleConfirmDelete = async () => {
    if (!deletingOU) return;

    setError(null);
    try {
      const res = await fetch(`/api/organization-units/${deletingOU.id}?option=${deleteOption}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToDelete'));
      }

      setDeletingOU(null);
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Restore OU
  const handleRestoreOU = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/organization-units/${id}/restore`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.structure.errors.failedToRestore'));
      }

      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Build tree hierarchy from flat array
  const buildTree = (units: OrganizationUnit[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Initialize map
    units.forEach((u) => {
      map.set(u.id, { ...u, children: [], depth: 0 });
    });

    // Link parents & children
    units.forEach((u) => {
      const node = map.get(u.id)!;
      if (u.parentId && map.has(u.parentId)) {
        const parentNode = map.get(u.parentId)!;
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Set depths recursively
    const setDepth = (node: TreeNode, depth: number) => {
      node.depth = depth;
      node.children.forEach((child) => setDepth(child, depth + 1));
    };

    roots.forEach((r) => setDepth(r, 0));
    return roots;
  };

  const treeData = buildTree(activeOUs);

  // Flattens tree into list with indentation levels for clean rendering
  const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
    let result: TreeNode[] = [];
    nodes.forEach((n) => {
      result.push(n);
      if (n.children.length > 0) {
        result = result.concat(flattenTree(n.children));
      }
    });
    return result;
  };

  const flatTreeList = flattenTree(treeData);

  // Render tree node component with full managers, members, actions
  const renderUnitRow = (node: TreeNode) => {
    const isEditing = editingOUId === node.id;
    const managers = node.memberships?.filter((m) => m.membershipType === 'MANAGER') || [];
    const members = node.memberships?.filter((m) => m.membershipType === 'MEMBER') || [];

    return (
      <div 
        key={node.id} 
        className="group relative flex flex-col md:flex-row md:items-center justify-between border-b border-card-border/50 py-4 hover:bg-card-header-bg transition-colors rounded-xl px-4"
        style={{ paddingLeft: `${node.depth * 1.5 + 1}rem` }}
        id={`ou-row-${node.id}`}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center space-x-2">
            {node.children.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}

            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingOUName}
                  onChange={(e) => setEditingOUName(e.target.value)}
                  className="rounded-lg border border-input-border bg-card-bg text-text-body px-2.5 py-1 text-sm font-semibold focus:border-input-border-focus focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleRenameOU(node.id)}
                  className="rounded-lg bg-status-success-bg p-1 text-status-success-text hover:bg-status-success-bg/80 transition-colors"
                  title={t('organization.structure.saveNameTooltip')}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingOUId(null)}
                  className="rounded-lg bg-status-error-bg p-1 text-status-error-text hover:bg-status-error-bg/80 transition-colors"
                  title={t('organization.structure.cancelTooltip')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-text-heading text-sm">{node.name}</span>
                <button
                  onClick={() => {
                    setEditingOUId(node.id);
                    setEditingOUName(node.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-text-body rounded transition-opacity"
                  title={t('organization.structure.renameTooltip')}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Members / Managers lists */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs pl-6">
            {managers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-status-warning-text bg-status-warning-bg px-1.5 py-0.5 rounded">{t('organization.structure.managersLabel')}</span>
                {managers.map((m) => (
                  <span key={m.id} className="inline-flex items-center space-x-1 rounded-full border border-status-warning-text/20 bg-status-warning-bg px-2 py-0.5 text-[11px] text-status-warning-text font-medium">
                    <span>{m.user?.username || m.user?.email || t('organization.structure.anonymousUser')}</span>
                    <button
                      onClick={() => handleRemoveManager(node.id, m.userId)}
                      className="text-status-warning-text hover:text-status-warning-text/80 ml-1 rounded-full hover:bg-status-warning-bg p-0.5 shrink-0"
                      title={t('organization.structure.removeManagerTooltip')}
                    >
                      <UserX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {members.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted bg-card-header-bg px-1.5 py-0.5 rounded">{t('organization.structure.membersLabel')}</span>
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center space-x-1 rounded-full border border-card-border bg-card-header-bg px-2 py-0.5 text-[11px] text-text-body font-medium">
                    <span>{m.user?.username || m.user?.email || t('organization.structure.anonymousUser')}</span>
                  </span>
                ))}
              </div>
            )}

            {managers.length === 0 && members.length === 0 && (
              <span className="text-text-muted italic">{t('organization.structure.noMembersOrManagers')}</span>
            )}
          </div>
        </div>

        {/* Tree Node Actions */}
        <div className="mt-3 md:mt-0 flex items-center space-x-2 self-start md:self-auto pl-6 md:pl-0 shrink-0">
          <button
            onClick={() => {
              setSelectedOUForUser(node.id);
              setSelectedUserToMove('');
            }}
            className="flex items-center space-x-1 text-xs text-link-primary hover:text-link-primary/80 hover:bg-status-info-bg px-2.5 py-1 rounded-lg border border-link-primary/20 transition-all font-semibold"
            title={t('organization.structure.assignUserTooltip')}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{t('organization.structure.assignUserBtn')}</span>
          </button>

          <button
            onClick={() => {
              setSelectedOUForManager(node.id);
              setSelectedUserToManager('');
            }}
            className="flex items-center space-x-1 text-xs text-status-warning-text hover:text-status-warning-text/80 hover:bg-status-warning-bg px-2.5 py-1 rounded-lg border border-status-warning-text/20 transition-all font-semibold"
            title={t('organization.structure.assignManagerTooltip')}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t('organization.structure.assignManagerBtn')}</span>
          </button>

          <button
            onClick={() => setDeletingOU(node)}
            className="flex items-center justify-center p-1.5 text-text-muted hover:text-status-error-text hover:bg-status-error-bg rounded-lg transition-colors border border-transparent hover:border-status-error-text/20"
            title={t('organization.structure.deleteTooltip')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="org-structure-tab-container">
      {/* Left Column: List/Tree View of Active Units */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-card-border pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-text-heading">{t('organization.structure.treeTitle')}</h3>
              <p className="text-xs text-text-muted mt-1">{t('organization.structure.treeSubtitle')}</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 text-link-primary animate-spin" />}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-status-error-bg border border-status-error-text/20 p-4 text-xs text-status-error-text flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-status-error-text mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeOUs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-card-border bg-card-header-bg">
              <FolderSync className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-muted">{t('organization.structure.noUnitsTitle')}</p>
              <p className="text-xs text-text-muted mt-1">{t('organization.structure.noUnitsDesc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto pr-2">
              {flatTreeList.map(renderUnitRow)}
            </div>
          )}
        </div>

        {/* Recently Deleted / Soft Restore Window */}
        {deletedOUs.length > 0 && (
          <div className="bg-card-header-bg rounded-2xl border border-card-border p-6">
            <h4 className="text-sm font-bold text-text-heading flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-text-muted" />
              <span>{t('organization.structure.recentlyDeletedTitle')}</span>
            </h4>
            <p className="text-xs text-text-muted mt-1">
              {t('organization.structure.recentlyDeletedDesc')}
            </p>

            <div className="mt-4 space-y-2.5">
              {deletedOUs.map((ou) => {
                const daysLeft = ou.permanentDeleteAt 
                  ? Math.max(0, Math.ceil((new Date(ou.permanentDeleteAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                  : 14;

                return (
                  <div key={ou.id} className="flex items-center justify-between rounded-xl border border-card-border bg-card-bg p-3.5 shadow-sm">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-text-heading truncate">{ou.name}</p>
                      <p className="text-[11px] text-status-error-text font-semibold mt-0.5">
                        {t('organization.structure.daysRemaining', { count: daysLeft })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreOU(ou.id)}
                      className="flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs font-semibold text-text-body shadow-sm transition-colors hover:bg-card-header-bg"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-text-muted" />
                      <span>{t('organization.structure.restoreBtn')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Actions (Create, Move User, Assign Manager) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Create Unit Form */}
        <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-text-heading flex items-center space-x-2 pb-3 border-b border-card-border">
            <Plus className="h-4 w-4 text-link-primary" />
            <span>{t('organization.structure.createTitle')}</span>
          </h3>
          <form onSubmit={handleCreateOU} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.structure.unitNameLabel')}</label>
              <input
                type="text"
                value={newOUName}
                onChange={(e) => setNewOUName(e.target.value)}
                placeholder={t('organization.structure.unitNamePlaceholder')}
                className="w-full rounded-xl border border-input-border bg-card-bg text-text-body px-3.5 py-2 text-sm focus:border-input-border-focus focus:outline-none placeholder:text-text-muted font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.structure.parentUnitLabel')}</label>
              <select
                value={newOUParentId}
                onChange={(e) => setNewOUParentId(e.target.value)}
                className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-sm focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
              >
                <option value="">{t('organization.structure.noneTopLevel')}</option>
                {activeOUs.map((ou) => (
                  <option key={ou.id} value={ou.id}>{ou.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!newOUName.trim()}
              className="w-full rounded-xl bg-btn-primary-bg py-2.5 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
            >
              {t('organization.structure.addUnitBtn')}
            </button>
          </form>
        </div>

        {/* Move User Form */}
        {selectedOUForUser && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-bg rounded-2xl border border-link-primary/30 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h3 className="text-sm font-bold text-text-heading flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-link-primary" />
                <span>{t('organization.structure.moveUserTitle')}</span>
              </h3>
              <button onClick={() => setSelectedOUForUser('')} className="text-text-muted hover:text-text-body">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t('organization.structure.moveUserText', { name: activeOUs.find(o => o.id === selectedOUForUser)?.name })}
              {t('organization.structure.moveUserTextSuffix')}
            </p>
            <form onSubmit={handleMoveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.structure.selectUserLabel')}</label>
                <select
                  value={selectedUserToMove}
                  onChange={(e) => setSelectedUserToMove(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-sm focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
                  required
                >
                  <option value="">{t('organization.structure.chooseUserPlaceholder')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedUserToMove}
                className="w-full rounded-xl bg-btn-primary-bg py-2.5 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
              >
                {t('organization.structure.confirmMoveUserBtn')}
              </button>
            </form>
          </motion.div>
        )}

        {/* Assign Manager Form */}
        {selectedOUForManager && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-bg rounded-2xl border border-status-warning-text/30 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h3 className="text-sm font-bold text-text-heading flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-status-warning-text" />
                <span>{t('organization.structure.assignManagerTitle')}</span>
              </h3>
              <button onClick={() => setSelectedOUForManager('')} className="text-text-muted hover:text-text-body">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t('organization.structure.assignManagerText', { name: activeOUs.find(o => o.id === selectedOUForManager)?.name })}
            </p>
            <form onSubmit={handleAssignManager} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.structure.selectUserLabel')}</label>
                <select
                  value={selectedUserToManager}
                  onChange={(e) => setSelectedUserToManager(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-sm focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
                  required
                >
                  <option value="">{t('organization.structure.chooseUserToAssignPlaceholder')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedUserToManager}
                className="w-full rounded-xl bg-status-warning-text py-2.5 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-status-warning-text/90 transition-colors disabled:opacity-50"
              >
                {t('organization.structure.assignManagerBtn')}
              </button>
            </form>
          </motion.div>
        )}
      </div>

      {/* Mandatory Soft Deletion Preview Confirmation Modal */}
      <AnimatePresence>
        {deletingOU && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl overflow-hidden"
              id="delete-ou-confirmation-modal"
            >
              <div className="flex items-start space-x-3 text-status-error-text">
                <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-text-heading">
                    {t('organization.structure.deleteModalTitle', { name: deletingOU.name })}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {t('organization.structure.deleteModalSubtitle')}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Deletion Behavior Radio Option Choice */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                    {t('organization.structure.deleteStrategyLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      deleteOption === 'REASSIGN' 
                        ? 'border-link-primary bg-status-info-bg text-text-heading shadow-sm' 
                        : 'border-card-border bg-card-bg hover:border-input-border-focus'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="deleteOption"
                          value="REASSIGN"
                          checked={deleteOption === 'REASSIGN'}
                          onChange={() => setDeleteOption('REASSIGN')}
                          className="text-link-primary focus:ring-link-primary/20 h-4 w-4"
                        />
                        <span className="text-xs font-bold">{t('organization.structure.reassignOption')}</span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
                        {t('organization.structure.reassignOptionDesc')}
                      </p>
                    </label>

                    <label className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      deleteOption === 'SUBTREE' 
                        ? 'border-status-error-text bg-status-error-bg text-status-error-text shadow-sm' 
                        : 'border-card-border bg-card-bg hover:border-input-border-focus'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="deleteOption"
                          value="SUBTREE"
                          checked={deleteOption === 'SUBTREE'}
                          onChange={() => setDeleteOption('SUBTREE')}
                          className="text-status-error-text focus:ring-status-error-text/20 h-4 w-4"
                        />
                        <span className="text-xs font-bold text-status-error-text">{t('organization.structure.subtreeOption')}</span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
                        {t('organization.structure.subtreeOptionDesc')}
                      </p>
                    </label>
                  </div>
                </div>

                {/* Real Affected-Users List Preview Box */}
                <div className="rounded-xl border border-card-border bg-card-header-bg p-4">
                  <h4 className="text-xs font-bold text-text-heading flex items-center justify-between">
                    <span>{t('organization.structure.affectedMembershipsLabel', { count: loadingPreview ? '...' : affectedUsers.length })}</span>
                    {loadingPreview && <Loader2 className="h-3.5 w-3.5 text-link-primary animate-spin" />}
                  </h4>
                  
                  {!loadingPreview && affectedUsers.length === 0 ? (
                    <p className="text-[11px] text-text-muted italic mt-2">
                      {t('organization.structure.noAffectedMembers')}
                    </p>
                  ) : (
                    <div className="mt-2.5 max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                      {affectedUsers.map((u) => (
                        <div key={u.id} className="flex items-center space-x-2 text-xs bg-card-bg border border-card-border p-1.5 rounded-lg">
                          <div className="h-1.5 w-1.5 rounded-full bg-status-error-text" />
                          <span className="font-semibold text-text-body">{u.username || u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="mt-6 flex items-center justify-end space-x-2.5 border-t border-card-border pt-4">
                <button
                  onClick={() => setDeletingOU(null)}
                  className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-xs font-bold text-text-body hover:bg-card-header-bg transition-colors"
                >
                  {t('organization.structure.cancelBtn')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loadingPreview}
                  className="rounded-xl bg-status-error-text px-4 py-2 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-status-error-text/90 transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash className="h-4 w-4" />
                  <span>{t('organization.structure.confirmDeletionBtn')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
