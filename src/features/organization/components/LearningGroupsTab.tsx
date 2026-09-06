import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, RotateCcw, Check, X, ChevronDown, 
  UserPlus, UserMinus, Calendar, Clock, AlertCircle, Loader2, FolderOpen 
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

interface LearningGroup {
  id: string;
  name: string;
  parentGroupId: string | null;
  isTemporary: boolean;
  expiresAt: string | null;
  deletedAt: string | null;
  permanentDeleteAt: string | null;
  memberships?: Membership[];
}

interface TreeNode extends LearningGroup {
  children: TreeNode[];
  depth: number;
}

export const LearningGroupsTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeGroups, setActiveGroups] = useState<LearningGroup[]>([]);
  const [deletedGroups, setDeletedGroups] = useState<LearningGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParentId, setNewGroupParentId] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Nesting management state
  const [movingGroup, setMovingGroup] = useState<LearningGroup | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');

  // Dropdown assignment states
  const [selectedGroupForMember, setSelectedGroupForMember] = useState<string>('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');

  // CSRF token helpers
  const getCsrfToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch active groups
      const resActive = await fetch('/api/learning-groups');
      if (!resActive.ok) throw new Error(t('organization.groups.errors.failedToFetch'));
      const dataActive = await resActive.json();
      setActiveGroups(dataActive);

      // 2. Fetch deleted groups
      const resDeleted = await fetch('/api/learning-groups?showDeleted=true');
      if (resDeleted.ok) {
        const dataDeleted = await resDeleted.json();
        setDeletedGroups(dataDeleted);
      }

      // 3. Fetch active users
      const resUsers = await fetch('/api/users');
      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setUsers(dataUsers);
      }
    } catch (err: any) {
      setError(err.message || t('organization.groups.errors.unexpectedFetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Create learning group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setError(null);
    try {
      const res = await fetch('/api/learning-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({
          name: newGroupName,
          parentGroupId: newGroupParentId || null,
          isTemporary,
          expiresAt: isTemporary && expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToCreate'));
      }

      setNewGroupName('');
      setNewGroupParentId('');
      setIsTemporary(false);
      setExpiresAt('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Rename group
  const handleRenameGroup = async (id: string) => {
    if (!editingGroupName.trim()) return;

    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ name: editingGroupName })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToRename'));
      }

      setEditingGroupId(null);
      setEditingGroupName('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Move Group in hierarchy
  const handleMoveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingGroup) return;

    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${movingGroup.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ parentGroupId: targetParentId || null })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToMove'));
      }

      setMovingGroup(null);
      setTargetParentId('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupForMember || !selectedUserToAdd) return;

    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${selectedGroupForMember}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ userId: selectedUserToAdd })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToAddMember'));
      }

      setSelectedUserToAdd('');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Remove Member
  const handleRemoveMember = async (groupId: string, userId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToRemoveMember'));
      }

      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Soft delete group
  const handleDeleteGroup = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${id}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToDelete'));
      }

      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Restore group
  const handleRestoreGroup = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${id}/restore`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.groups.errors.failedToRestore'));
      }

      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Build tree hierarchy
  const buildTree = (groups: LearningGroup[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    groups.forEach((g) => {
      map.set(g.id, { ...g, children: [], depth: 0 });
    });

    groups.forEach((g) => {
      const node = map.get(g.id)!;
      if (g.parentGroupId && map.has(g.parentGroupId)) {
        const parentNode = map.get(g.parentGroupId)!;
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const setDepth = (node: TreeNode, depth: number) => {
      node.depth = depth;
      node.children.forEach((child) => setDepth(child, depth + 1));
    };

    roots.forEach((r) => setDepth(r, 0));
    return roots;
  };

  const treeData = buildTree(activeGroups);

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

  const renderGroupRow = (node: TreeNode) => {
    const isEditing = editingGroupId === node.id;
    const members = node.memberships?.filter((m) => m.membershipType === 'MEMBER') || [];

    return (
      <div 
        key={node.id} 
        className="group relative flex flex-col md:flex-row md:items-center justify-between border-b border-card-border/50 py-4 hover:bg-card-header-bg transition-colors rounded-xl px-4"
        style={{ paddingLeft: `${node.depth * 1.5 + 1}rem` }}
        id={`group-row-${node.id}`}
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
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  className="rounded-lg border border-input-border bg-card-bg px-2.5 py-1 text-sm font-semibold focus:border-input-border-focus focus:outline-none text-text-body"
                  autoFocus
                />
                <button
                  onClick={() => handleRenameGroup(node.id)}
                  className="rounded-lg bg-status-success-bg p-1 text-status-success-text hover:bg-status-success-bg/80 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingGroupId(null)}
                  className="rounded-lg bg-status-error-bg p-1 text-status-error-text hover:bg-status-error-bg/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-text-heading text-sm">{node.name}</span>
                <button
                  onClick={() => {
                    setEditingGroupId(node.id);
                    setEditingGroupName(node.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-text-body rounded transition-opacity"
                  title={t('organization.groups.renameTooltip')}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Temporary / Expiration Pill Indicator */}
            {node.isTemporary && (
              <span className="inline-flex items-center space-x-1 rounded-md bg-status-warning-bg border border-status-warning-text/20 text-status-warning-text text-[10px] font-bold px-1.5 py-0.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  {node.expiresAt 
                    ? t('organization.groups.expires', { date: new Date(node.expiresAt).toLocaleDateString() }) 
                    : t('organization.groups.expiresNever')}
                </span>
              </span>
            )}
          </div>

          {/* Members list */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs pl-6">
            {members.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-link-primary bg-status-info-bg px-1.5 py-0.5 rounded">
                  {t('organization.groups.membersCount', { count: members.length })}
                </span>
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center space-x-1 rounded-full border border-card-border bg-card-header-bg px-2 py-0.5 text-[11px] text-text-body font-medium">
                    <span>{m.user?.username || m.user?.email || t('organization.groups.anonymousUser')}</span>
                    <button
                      onClick={() => handleRemoveMember(node.id, m.userId)}
                      className="text-text-muted hover:text-status-error-text ml-1 rounded-full hover:bg-status-error-bg p-0.5 shrink-0"
                      title={t('organization.groups.removeMemberTooltip')}
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-text-muted italic">{t('organization.groups.noMembers')}</span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-3 md:mt-0 flex items-center space-x-2 self-start md:self-auto pl-6 md:pl-0 shrink-0">
          <button
            onClick={() => {
              setSelectedGroupForMember(node.id);
              setSelectedUserToAdd('');
            }}
            className="flex items-center space-x-1 text-xs text-link-primary hover:text-link-primary/80 hover:bg-status-info-bg px-2.5 py-1 rounded-lg border border-link-primary/20 transition-all font-semibold"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{t('organization.groups.addMemberBtn')}</span>
          </button>

          <button
            onClick={() => {
              setMovingGroup(node);
              setTargetParentId(node.parentGroupId || '');
            }}
            className="flex items-center space-x-1 text-xs text-text-body hover:text-text-heading hover:bg-card-header-bg px-2.5 py-1 rounded-lg border border-card-border transition-all font-semibold"
            title={t('organization.groups.nestTooltip')}
          >
            <span>{t('organization.groups.nestGroupBtn')}</span>
          </button>

          <button
            onClick={() => handleDeleteGroup(node.id)}
            className="flex items-center justify-center p-1.5 text-text-muted hover:text-status-error-text hover:bg-status-error-bg rounded-lg transition-colors border border-transparent hover:border-status-error-text/20"
            title={t('organization.groups.deleteTooltip')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="learning-groups-tab-container">
      {/* Left Column: List/Tree View of Active Cohorts */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-card-border pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-text-heading">{t('organization.groups.title')}</h3>
              <p className="text-xs text-text-muted mt-1">{t('organization.groups.subtitle')}</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 text-link-primary animate-spin" />}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-status-error-bg border border-status-error-text/20 p-4 text-xs text-status-error-text flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-status-error-text mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeGroups.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-card-border bg-card-header-bg">
              <FolderOpen className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-muted">{t('organization.groups.noCohortsTitle')}</p>
              <p className="text-xs text-text-muted mt-1">{t('organization.groups.noCohortsDesc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto pr-2">
              {flatTreeList.map(renderGroupRow)}
            </div>
          )}
        </div>

        {/* Recently Deleted Learning Groups Restore Panel */}
        {deletedGroups.length > 0 && (
          <div className="bg-card-header-bg rounded-2xl border border-card-border p-6">
            <h4 className="text-sm font-bold text-text-heading flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-text-body" />
              <span>{t('organization.groups.deletedTitle')}</span>
            </h4>
            <p className="text-xs text-text-muted mt-1">
              {t('organization.groups.deletedDesc')}
            </p>

            <div className="mt-4 space-y-2.5">
              {deletedGroups.map((group) => {
                const daysLeft = group.permanentDeleteAt 
                  ? Math.max(0, Math.ceil((new Date(group.permanentDeleteAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                  : 14;

                return (
                  <div key={group.id} className="flex items-center justify-between rounded-xl border border-card-border bg-card-bg p-3.5 shadow-sm">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-text-heading truncate">{group.name}</p>
                      <p className="text-[11px] text-status-error-text font-semibold mt-0.5">
                        {t('organization.groups.daysLeftPurge', { count: daysLeft })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreGroup(group.id)}
                      className="flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs font-semibold text-text-body shadow-sm transition-colors hover:bg-card-header-bg"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-text-muted" />
                      <span>{t('organization.groups.restoreBtn')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Creation, Assignment and Nesting Forms */}
      <div className="lg:col-span-4 space-y-6">
        {/* Create Cohort Form */}
        <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-text-heading flex items-center space-x-2 pb-3 border-b border-card-border">
            <Plus className="h-4 w-4 text-link-primary" />
            <span>{t('organization.groups.createTitle')}</span>
          </h3>
          <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.groups.cohortNameLabel')}</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t('organization.groups.cohortNamePlaceholder')}
                className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2 text-sm focus:border-input-border-focus focus:outline-none placeholder:text-text-muted font-medium text-text-body"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.groups.parentCohortLabel')}</label>
              <select
                value={newGroupParentId}
                onChange={(e) => setNewGroupParentId(e.target.value)}
                className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-sm focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
              >
                <option value="">{t('organization.groups.noneTopLevel')}</option>
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-link-primary leading-normal font-medium bg-status-info-bg p-2 rounded-lg border border-link-primary/20">
                {t('organization.groups.parentNote')}
              </p>
            </div>

            {/* Temporary Group Expiration Toggles */}
            <div className="rounded-xl border border-card-border bg-card-header-bg p-3.5 space-y-3.5">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                  className="rounded border-input-border text-link-primary focus:ring-link-primary h-4 w-4"
                />
                <span className="text-xs font-bold text-text-body">{t('organization.groups.tempCohortCheckbox')}</span>
              </label>

              {isTemporary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">{t('organization.groups.expirationDateLabel')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full rounded-lg border border-input-border bg-card-bg pl-9 pr-3 py-2 text-xs focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
                      required={isTemporary}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={!newGroupName.trim() || (isTemporary && !expiresAt)}
              className="w-full rounded-xl bg-btn-primary-bg py-2.5 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
            >
              {t('organization.groups.addGroupBtn')}
            </button>
          </form>
        </div>

        {/* Add Member Form */}
        {selectedGroupForMember && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h3 className="text-sm font-bold text-text-heading flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-link-primary" />
                <span>{t('organization.groups.addMemberTitle')}</span>
              </h3>
              <button onClick={() => setSelectedGroupForMember('')} className="text-text-muted hover:text-text-body">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t('organization.groups.assignUserText', { name: activeGroups.find(g => g.id === selectedGroupForMember)?.name })}
            </p>
            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.groups.selectUserLabel')}</label>
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-sm focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
                  required
                >
                  <option value="">{t('organization.groups.chooseUserPlaceholder')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedUserToAdd}
                className="w-full rounded-xl bg-btn-primary-bg py-2.5 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
              >
                {t('organization.groups.confirmAddMemberBtn')}
              </button>
            </form>
          </motion.div>
        )}

        {/* Nesting cohort re-parenting form */}
        {movingGroup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-header-bg border border-card-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h3 className="text-sm font-bold text-text-heading">{t('organization.groups.nestTitle')}</h3>
              <button onClick={() => setMovingGroup(null)} className="text-text-muted hover:text-text-body">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t('organization.groups.moveText', { name: movingGroup.name })}
            </p>
            <form onSubmit={handleMoveGroup} className="mt-4 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">{t('organization.groups.parentCohortLabel')}</label>
                <select
                  value={targetParentId}
                  onChange={(e) => setTargetParentId(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-sm focus:border-input-border-focus focus:outline-none font-semibold text-text-body"
                >
                  <option value="">{t('organization.groups.noneTopLevel')}</option>
                  {activeGroups
                    .filter((g) => g.id !== movingGroup.id) // Cannot parent to itself
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
                <p className="mt-1.5 text-[11px] text-link-primary leading-normal font-medium bg-status-info-bg p-2 rounded-lg border border-link-primary/20">
                  {t('organization.groups.nestingClarityNote')}
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-btn-primary-bg py-2.5 text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors"
              >
                {t('organization.groups.confirmNestMoveBtn')}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};
