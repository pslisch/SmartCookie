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
      if (!resActive.ok) throw new Error('Failed to fetch organization units');
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
      setError(err.message || 'An error occurred while fetching organization data.');
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
        throw new Error(data.error || 'Failed to create organization unit.');
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
        throw new Error(data.error || 'Failed to rename organization unit.');
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
        throw new Error(data.error || 'Failed to assign user to organization unit.');
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
        throw new Error(data.error || 'Failed to assign manager.');
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
        throw new Error(data.error || 'Failed to remove manager.');
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
        throw new Error(data.error || 'Failed to delete organization unit.');
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
        throw new Error(data.error || 'Failed to restore organization unit.');
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
        className="group relative flex flex-col md:flex-row md:items-center justify-between border-b border-slate-50 py-4 hover:bg-slate-50/50 transition-colors rounded-xl px-4"
        style={{ paddingLeft: `${node.depth * 1.5 + 1}rem` }}
        id={`ou-row-${node.id}`}
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
                  value={editingOUName}
                  onChange={(e) => setEditingOUName(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleRenameOU(node.id)}
                  className="rounded-lg bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  title="Save Name"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingOUId(null)}
                  className="rounded-lg bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-slate-800 text-sm">{node.name}</span>
                <button
                  onClick={() => {
                    setEditingOUId(node.id);
                    setEditingOUName(node.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity"
                  title="Rename Unit"
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Managers</span>
                {managers.map((m) => (
                  <span key={m.id} className="inline-flex items-center space-x-1 rounded-full border border-amber-100 bg-amber-50/30 px-2 py-0.5 text-[11px] text-amber-800 font-medium">
                    <span>{m.user?.username || m.user?.email || 'Anonymous'}</span>
                    <button
                      onClick={() => handleRemoveManager(node.id, m.userId)}
                      className="text-amber-500 hover:text-amber-700 ml-1 rounded-full hover:bg-amber-100/50 p-0.5 shrink-0"
                      title="Remove Manager"
                    >
                      <UserX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {members.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Members</span>
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center space-x-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 font-medium">
                    <span>{m.user?.username || m.user?.email || 'Anonymous'}</span>
                  </span>
                ))}
              </div>
            )}

            {managers.length === 0 && members.length === 0 && (
              <span className="text-slate-400 italic">No assigned members or managers</span>
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
            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100 transition-all font-semibold"
            title="Move/Assign user to this unit"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Assign User</span>
          </button>

          <button
            onClick={() => {
              setSelectedOUForManager(node.id);
              setSelectedUserToManager('');
            }}
            className="flex items-center space-x-1 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50/50 px-2.5 py-1 rounded-lg border border-amber-100 transition-all font-semibold"
            title="Assign manager to this unit"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Assign Mgr</span>
          </button>

          <button
            onClick={() => setDeletingOU(node)}
            className="flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
            title="Delete Organization Unit"
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Organizational Tree</h3>
              <p className="text-xs text-slate-500 mt-1">Hierarchical visualization of your corporate organization divisions.</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-800 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeOUs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <FolderSync className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No organization units defined</p>
              <p className="text-xs text-slate-400 mt-1">Create your first top-level unit using the form on the right.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2">
              {flatTreeList.map(renderUnitRow)}
            </div>
          )}
        </div>

        {/* Recently Deleted / Soft Restore Window */}
        {deletedOUs.length > 0 && (
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-slate-600" />
              <span>Recently Deleted (14-day Restoration Window)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Organization units soft-deleted within the last 14 days can be recovered with all historical memberships.
            </p>

            <div className="mt-4 space-y-2.5">
              {deletedOUs.map((ou) => {
                const daysLeft = ou.permanentDeleteAt 
                  ? Math.max(0, Math.ceil((new Date(ou.permanentDeleteAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                  : 14;

                return (
                  <div key={ou.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-800 truncate">{ou.name}</p>
                      <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                        {daysLeft} days remaining before permanent purge
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreOU(ou.id)}
                      className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                      <span>Restore</span>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Plus className="h-4 w-4 text-blue-600" />
            <span>Create Organization Unit</span>
          </h3>
          <form onSubmit={handleCreateOU} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Unit Name</label>
              <input
                type="text"
                value={newOUName}
                onChange={(e) => setNewOUName(e.target.value)}
                placeholder="e.g. Sales Division, Engineering"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Parent Unit (Optional)</label>
              <select
                value={newOUParentId}
                onChange={(e) => setNewOUParentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
              >
                <option value="">None (Top-Level Unit)</option>
                {activeOUs.map((ou) => (
                  <option key={ou.id} value={ou.id}>{ou.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!newOUName.trim()}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Add Unit
            </button>
          </form>
        </div>

        {/* Move User Form */}
        {selectedOUForUser && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span>Move User to Unit</span>
              </h3>
              <button onClick={() => setSelectedOUForUser('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Move a user to <strong>{activeOUs.find(o => o.id === selectedOUForUser)?.name}</strong>. Moving the user automatically terminates any of their existing primary corporate Division memberships.
            </p>
            <form onSubmit={handleMoveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select User</label>
                <select
                  value={selectedUserToMove}
                  onChange={(e) => setSelectedUserToMove(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
                  required
                >
                  <option value="">-- Choose Active User --</option>
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
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Confirm Move User
              </button>
            </form>
          </motion.div>
        )}

        {/* Assign Manager Form */}
        {selectedOUForManager && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-amber-200 bg-amber-50/10 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <span>Assign Unit Manager</span>
              </h3>
              <button onClick={() => setSelectedOUForManager('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Assign a manager to govern the unit <strong>{activeOUs.find(o => o.id === selectedOUForManager)?.name}</strong>.
            </p>
            <form onSubmit={handleAssignManager} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select User</label>
                <select
                  value={selectedUserToManager}
                  onChange={(e) => setSelectedUserToManager(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
                  required
                >
                  <option value="">-- Choose User --</option>
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
                className="w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                Assign Manager
              </button>
            </form>
          </motion.div>
        )}
      </div>

      {/* Mandatory Soft Deletion Preview Confirmation Modal */}
      <AnimatePresence>
        {deletingOU && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden"
              id="delete-ou-confirmation-modal"
            >
              <div className="flex items-start space-x-3 text-rose-600">
                <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Organization Unit: {deletingOU.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure deletion style behavior and review the real-time affected users list.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Deletion Behavior Radio Option Choice */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Deletion Strategy Option
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      deleteOption === 'REASSIGN' 
                        ? 'border-blue-500 bg-blue-50/10 text-blue-900 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="deleteOption"
                          value="REASSIGN"
                          checked={deleteOption === 'REASSIGN'}
                          onChange={() => setDeleteOption('REASSIGN')}
                          className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="text-xs font-bold">REASSIGN</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        Reassign direct child units to the parent unit. Soft-delete only this target node.
                      </p>
                    </label>

                    <label className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      deleteOption === 'SUBTREE' 
                        ? 'border-rose-500 bg-rose-50/10 text-rose-900 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="deleteOption"
                          value="SUBTREE"
                          checked={deleteOption === 'SUBTREE'}
                          onChange={() => setDeleteOption('SUBTREE')}
                          className="text-rose-600 focus:ring-rose-500 h-4 w-4"
                        />
                        <span className="text-xs font-bold text-rose-700">SUBTREE</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        Soft-delete this unit and all of its nested child units together in a single cascade.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Real Affected-Users List Preview Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Affected Memberships ({loadingPreview ? '...' : affectedUsers.length})</span>
                    {loadingPreview && <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />}
                  </h4>
                  
                  {!loadingPreview && affectedUsers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic mt-2">
                      No active users or manager memberships will be affected by this deletion.
                    </p>
                  ) : (
                    <div className="mt-2.5 max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                      {affectedUsers.map((u) => (
                        <div key={u.id} className="flex items-center space-x-2 text-xs bg-white border border-slate-100 p-1.5 rounded-lg">
                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          <span className="font-semibold text-slate-700">{u.username || u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="mt-6 flex items-center justify-end space-x-2.5 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setDeletingOU(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors flex items-center space-x-1.5"
                >
                  <Trash className="h-4 w-4" />
                  <span>Confirm Deletion</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
