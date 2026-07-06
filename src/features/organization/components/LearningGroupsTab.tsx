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
        className="group relative flex flex-col md:flex-row md:items-center justify-between border-b border-slate-50 py-4 hover:bg-slate-50/50 transition-colors rounded-xl px-4"
        style={{ paddingLeft: `${node.depth * 1.5 + 1}rem` }}
        id={`group-row-${node.id}`}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center space-x-2">
            {node.children.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}

            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleRenameGroup(node.id)}
                  className="rounded-lg bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingGroupId(null)}
                  className="rounded-lg bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-slate-800 text-sm">{node.name}</span>
                <button
                  onClick={() => {
                    setEditingGroupId(node.id);
                    setEditingGroupName(node.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity"
                  title={t('organization.groups.renameTooltip')}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Temporary / Expiration Pill Indicator */}
            {node.isTemporary && (
              <span className="inline-flex items-center space-x-1 rounded-md bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5">
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {t('organization.groups.membersCount', { count: members.length })}
                </span>
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center space-x-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 font-medium">
                    <span>{m.user?.username || m.user?.email || t('organization.groups.anonymousUser')}</span>
                    <button
                      onClick={() => handleRemoveMember(node.id, m.userId)}
                      className="text-slate-400 hover:text-rose-600 ml-1 rounded-full hover:bg-rose-50 p-0.5 shrink-0"
                      title={t('organization.groups.removeMemberTooltip')}
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic">{t('organization.groups.noMembers')}</span>
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
            className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100 transition-all font-semibold"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{t('organization.groups.addMemberBtn')}</span>
          </button>

          <button
            onClick={() => {
              setMovingGroup(node);
              setTargetParentId(node.parentGroupId || '');
            }}
            className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-all font-semibold"
            title={t('organization.groups.nestTooltip')}
          >
            <span>{t('organization.groups.nestGroupBtn')}</span>
          </button>

          <button
            onClick={() => handleDeleteGroup(node.id)}
            className="flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('organization.groups.title')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('organization.groups.subtitle')}</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-800 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeGroups.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">{t('organization.groups.noCohortsTitle')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('organization.groups.noCohortsDesc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2">
              {flatTreeList.map(renderGroupRow)}
            </div>
          )}
        </div>

        {/* Recently Deleted Learning Groups Restore Panel */}
        {deletedGroups.length > 0 && (
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-slate-600" />
              <span>{t('organization.groups.deletedTitle')}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {t('organization.groups.deletedDesc')}
            </p>

            <div className="mt-4 space-y-2.5">
              {deletedGroups.map((group) => {
                const daysLeft = group.permanentDeleteAt 
                  ? Math.max(0, Math.ceil((new Date(group.permanentDeleteAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                  : 14;

                return (
                  <div key={group.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-800 truncate">{group.name}</p>
                      <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                        {t('organization.groups.daysLeftPurge', { count: daysLeft })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreGroup(group.id)}
                      className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Plus className="h-4 w-4 text-indigo-600" />
            <span>{t('organization.groups.createTitle')}</span>
          </h3>
          <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t('organization.groups.cohortNameLabel')}</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t('organization.groups.cohortNamePlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t('organization.groups.parentCohortLabel')}</label>
              <select
                value={newGroupParentId}
                onChange={(e) => setNewGroupParentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
              >
                <option value="">{t('organization.groups.noneTopLevel')}</option>
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-indigo-600 leading-normal font-medium bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/30">
                {t('organization.groups.parentNote')}
              </p>
            </div>

            {/* Temporary Group Expiration Toggles */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-3.5">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-700">{t('organization.groups.tempCohortCheckbox')}</span>
              </label>

              {isTemporary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('organization.groups.expirationDateLabel')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-semibold text-slate-700"
                      required={isTemporary}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={!newGroupName.trim() || (isTemporary && !expiresAt)}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
            className="bg-indigo-50/20 border border-indigo-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-indigo-600" />
                <span>{t('organization.groups.addMemberTitle')}</span>
              </h3>
              <button onClick={() => setSelectedGroupForMember('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {t('organization.groups.assignUserText', { name: activeGroups.find(g => g.id === selectedGroupForMember)?.name })}
            </p>
            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t('organization.groups.selectUserLabel')}</label>
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none font-semibold text-slate-700"
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
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
            className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">{t('organization.groups.nestTitle')}</h3>
              <button onClick={() => setMovingGroup(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {t('organization.groups.moveText', { name: movingGroup.name })}
            </p>
            <form onSubmit={handleMoveGroup} className="mt-4 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t('organization.groups.parentCohortLabel')}</label>
                <select
                  value={targetParentId}
                  onChange={(e) => setTargetParentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none font-semibold text-slate-700"
                >
                  <option value="">{t('organization.groups.noneTopLevel')}</option>
                  {activeGroups
                    .filter((g) => g.id !== movingGroup.id) // Cannot parent to itself
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
                <p className="mt-1.5 text-[11px] text-indigo-600 leading-normal font-medium bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/30">
                  {t('organization.groups.nestingClarityNote')}
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-950 transition-colors"
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
