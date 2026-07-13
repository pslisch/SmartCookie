/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Layers,
  Shield,
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface FieldDefinition {
  id: string;
  fieldKey: string | null;
  name: string;
  description: string | null;
  fieldType: string;
  required: boolean;
  visible: boolean;
  editableByUser: boolean;
  isSystemField: boolean;
  displayOrder: number;
  defaultValue: string | null;
  validationRules: any;
  options: any;
  categoryId: string | null;
  editableByRoles: { roleId: string }[];
}

interface Category {
  id: string;
  name: string;
  displayOrder: number;
  fields: FieldDefinition[];
}

export const FieldBuilder: React.FC = () => {
  const { t } = useTranslation();
  
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<FieldDefinition[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal / Form States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  
  // Field Form States
  const [fieldName, setFieldName] = useState('');
  const [fieldDescription, setFieldDescription] = useState('');
  const [fieldCategoryId, setFieldCategoryId] = useState('');
  const [fieldType, setFieldType] = useState('TEXT');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldVisible, setFieldVisible] = useState(true);
  const [fieldEditableByUser, setFieldEditableByUser] = useState(true);
  const [fieldDefaultValue, setFieldDefaultValue] = useState('');
  const [fieldValidationRules, setFieldValidationRules] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');

  // Role Edit Permission State
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [roleFieldTarget, setRoleFieldTarget] = useState<FieldDefinition | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Collapse States for Categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resData, resRoles] = await Promise.all([
        fetch('/api/profile-fields/categories'),
        fetch('/api/profile-fields/roles')
      ]);

      if (!resData.ok || !resRoles.ok) {
        throw new Error('Failed to load Field Builder data from the server.');
      }

      const dataJson = await resData.json();
      const rolesJson = await resRoles.json();

      setCategories(dataJson.categories || []);
      setUnassignedFields(dataJson.unassignedFields || []);
      setRoles(rolesJson || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger Success Alert briefly
  const triggerSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Toggle Category collapse
  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Category Operations
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) return;

    try {
      setError(null);
      const url = editingCategory 
        ? `/api/profile-fields/categories/${editingCategory.id}` 
        : '/api/profile-fields/categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryFormName })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save category.');
      }

      triggerSuccess(t('fieldBuilder.saveSuccess'));
      setShowCategoryModal(false);
      setCategoryFormName('');
      setEditingCategory(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartRenameCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormName(cat.name);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm(t('fieldBuilder.deleteCategoryConfirm'))) return;

    try {
      setError(null);
      const res = await fetch(`/api/profile-fields/categories/${catId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete category.');
      }

      triggerSuccess(t('fieldBuilder.deleteSuccess'));
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMoveCategory = async (cat: Category, direction: 'up' | 'down') => {
    // Find adjacent category
    const index = categories.findIndex(c => c.id === cat.id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const adjacent = categories[targetIndex];

    try {
      setError(null);
      // Swap order on backend by sending PATCH for both
      await Promise.all([
        fetch(`/api/profile-fields/categories/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: adjacent.displayOrder })
        }),
        fetch(`/api/profile-fields/categories/${adjacent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: cat.displayOrder })
        })
      ]);

      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Field Operations
  const handleOpenFieldModal = (field: FieldDefinition | null, targetCatId?: string) => {
    setEditingField(field);
    if (field) {
      setFieldName(field.name);
      setFieldDescription(field.description || '');
      setFieldCategoryId(field.categoryId || '');
      setFieldType(field.fieldType);
      setFieldRequired(field.required);
      setFieldVisible(field.visible);
      setFieldEditableByUser(field.editableByUser);
      setFieldDefaultValue(field.defaultValue || '');
      
      // Handle nested validation rules
      if (field.validationRules && typeof field.validationRules === 'object') {
        setFieldValidationRules(field.validationRules.regex || '');
      } else if (typeof field.validationRules === 'string') {
        setFieldValidationRules(field.validationRules);
      } else {
        setFieldValidationRules('');
      }

      // Handle nested options array
      if (Array.isArray(field.options)) {
        setFieldOptions(field.options.join(', '));
      } else if (field.options && typeof field.options === 'object') {
        setFieldOptions(JSON.stringify(field.options));
      } else {
        setFieldOptions('');
      }
    } else {
      setFieldName('');
      setFieldDescription('');
      setFieldCategoryId(targetCatId || '');
      setFieldType('TEXT');
      setFieldRequired(false);
      setFieldVisible(true);
      setFieldEditableByUser(true);
      setFieldDefaultValue('');
      setFieldValidationRules('');
      setFieldOptions('');
    }
    setShowFieldModal(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    // Build payload
    const validationRulesObj = fieldValidationRules.trim() 
      ? { regex: fieldValidationRules.trim() } 
      : null;

    let optionsObj: string[] | null = null;
    if (fieldType === 'DROPDOWN' || fieldType === 'RADIO') {
      optionsObj = fieldOptions
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);
    }

    const payload = {
      name: fieldName.trim(),
      categoryId: fieldCategoryId || null,
      description: fieldDescription.trim() || null,
      fieldType,
      required: fieldRequired,
      visible: fieldVisible,
      editableByUser: fieldEditableByUser,
      defaultValue: fieldDefaultValue.trim() || null,
      validationRules: validationRulesObj,
      options: optionsObj,
    };

    try {
      setError(null);
      const url = editingField 
        ? `/api/profile-fields/definitions/${editingField.id}` 
        : '/api/profile-fields/definitions';
      const method = editingField ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save field definition.');
      }

      triggerSuccess(t('fieldBuilder.saveSuccess'));
      setShowFieldModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteField = async (field: FieldDefinition) => {
    if (field.isSystemField) {
      alert(t('fieldBuilder.deleteDisabledSystem'));
      return;
    }

    if (!window.confirm(t('fieldBuilder.deleteFieldConfirm'))) return;

    try {
      setError(null);
      const res = await fetch(`/api/profile-fields/definitions/${field.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete field definition.');
      }

      triggerSuccess(t('fieldBuilder.deleteSuccess'));
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMoveField = async (fieldId: string, direction: 'up' | 'down') => {
    try {
      setError(null);
      const res = await fetch(`/api/profile-fields/definitions/${fieldId}/move-${direction}`, {
        method: 'POST'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to move field ${direction}.`);
      }

      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Role Permissions
  const handleOpenRolesModal = (field: FieldDefinition) => {
    setRoleFieldTarget(field);
    setSelectedRoleIds(field.editableByRoles.map(r => r.roleId));
    setShowRolesModal(true);
  };

  const handleToggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!roleFieldTarget) return;

    try {
      setError(null);
      const res = await fetch(`/api/profile-fields/definitions/${roleFieldTarget.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: selectedRoleIds })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save field role permissions.');
      }

      triggerSuccess(t('fieldBuilder.saveSuccess'));
      setShowRolesModal(false);
      setRoleFieldTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8" id="field-builder-root">
      {/* Messages */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-600 flex items-start gap-3 shadow-sm animate-fade-in" id="field-builder-error">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-bold">{t('fieldBuilder.errorSaving')}</p>
            <p className="mt-1 text-red-500/90 font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-700 flex items-start gap-3 shadow-sm animate-fade-in" id="field-builder-success">
          <Shield className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">{t('fieldBuilder.categoriesSection')}</h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Define your organizational profile layout categories.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryFormName('');
              setShowCategoryModal(true);
            }}
            className="inline-flex items-center space-x-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            id="btn-add-category"
          >
            <FolderPlus className="h-4 w-4 text-slate-500" />
            <span>{t('fieldBuilder.createCategory')}</span>
          </button>
          <button
            onClick={() => handleOpenFieldModal(null)}
            className="inline-flex items-center space-x-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
            id="btn-add-custom-field"
          >
            <Plus className="h-4 w-4" />
            <span>{t('fieldBuilder.createField')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24" id="field-builder-loading">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      ) : (
        <div className="space-y-6" id="categories-accordion-list">
          {/* Categories list */}
          {categories.map((cat, catIndex) => {
            const isCollapsed = collapsedCategories[cat.id] || false;
            return (
              <div
                key={cat.id}
                className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                id={`category-card-${cat.id}`}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleCategoryCollapse(cat.id)}
                      className="text-slate-400 hover:text-slate-600"
                      title={isCollapsed ? "Expand" : "Collapse"}
                    >
                      {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>
                    <div>
                      <h3 className="font-bold text-slate-900 font-sans flex items-center gap-2">
                        <span>{cat.name}</span>
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 border px-2 py-0.5 rounded-full">
                          {cat.fields.length} {cat.fields.length === 1 ? 'field' : 'fields'}
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleMoveCategory(cat, 'up')}
                      disabled={catIndex === 0}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                      title={t('fieldBuilder.moveUp')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveCategory(cat, 'down')}
                      disabled={catIndex === categories.length - 1}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                      title={t('fieldBuilder.moveDown')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleStartRenameCategory(cat)}
                      className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                      title={t('fieldBuilder.renameCategory')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50"
                      title={t('fieldBuilder.deleteCategory')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Fields list inside Category */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-6 overflow-x-auto">
                    {cat.fields.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm font-sans flex flex-col items-center justify-center">
                        <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
                        <p>{t('fieldBuilder.noCategories')}</p>
                        <button
                          onClick={() => handleOpenFieldModal(null, cat.id)}
                          className="mt-3 inline-flex items-center space-x-1.5 text-xs text-blue-600 font-bold hover:underline"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{t('fieldBuilder.addFieldBtn')}</span>
                        </button>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="text-slate-400 text-left text-xs font-bold tracking-wider">
                            <th className="pb-3 pr-4">{t('fieldBuilder.fieldName')}</th>
                            <th className="pb-3 px-4">{t('fieldBuilder.fieldType')}</th>
                            <th className="pb-3 px-4">Attributes</th>
                            <th className="pb-3 px-4">Order</th>
                            <th className="pb-3 pl-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cat.fields.map((field, index) => (
                            <tr key={field.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Field Name & Desc */}
                              <td className="py-4 pr-4 max-w-sm">
                                <p className="font-bold text-slate-800 font-sans flex items-center gap-1.5">
                                  <span>{field.name}</span>
                                  {field.isSystemField && (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                      {t('fieldBuilder.systemFieldBadge')}
                                    </span>
                                  )}
                                </p>
                                {field.description && (
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-sans">{field.description}</p>
                                )}
                              </td>
                              {/* Field Type */}
                              <td className="py-4 px-4 font-mono text-xs text-slate-500">
                                {field.fieldType}
                              </td>
                              {/* Attributes */}
                              <td className="py-4 px-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {field.required && (
                                    <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-100">
                                      {t('fieldBuilder.requiredBadge')}
                                    </span>
                                  )}
                                  {!field.visible && (
                                    <span className="text-[10px] bg-slate-150 text-slate-600 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                      <EyeOff className="h-3 w-3" />
                                      <span>{t('fieldBuilder.hiddenBadge')}</span>
                                    </span>
                                  )}
                                  {!field.editableByUser && (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-100 inline-flex items-center gap-1">
                                      <Lock className="h-3 w-3" />
                                      <span>{t('fieldBuilder.readOnlyBadge')}</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Order controls */}
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleMoveField(field.id, 'up')}
                                    disabled={index === 0}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-150 disabled:opacity-20 disabled:pointer-events-none"
                                    title={t('fieldBuilder.moveUp')}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveField(field.id, 'down')}
                                    disabled={index === cat.fields.length - 1}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-150 disabled:opacity-20 disabled:pointer-events-none"
                                    title={t('fieldBuilder.moveDown')}
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                              {/* Actions */}
                              <td className="py-4 pl-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleOpenRolesModal(field)}
                                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                    title="Authorized Role Editors"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenFieldModal(field, cat.id)}
                                    className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    title={t('fieldBuilder.editField')}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  {field.isSystemField ? (
                                    <button
                                      onClick={() => alert(t('fieldBuilder.deleteDisabledSystem'))}
                                      className="p-2 rounded-xl text-slate-300 cursor-not-allowed"
                                      title={t('fieldBuilder.deleteDisabledSystem')}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteField(field)}
                                      className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50"
                                      title={t('fieldBuilder.deleteField')}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned Fields Category */}
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/20 overflow-hidden shadow-sm" id="unassigned-fields-card">
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 bg-slate-100/30 p-5">
              <div className="flex items-center space-x-3">
                <h3 className="font-bold text-slate-800 font-sans flex items-center gap-2">
                  <span>{t('fieldBuilder.unassignedFields')}</span>
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    {unassignedFields.length} {unassignedFields.length === 1 ? 'field' : 'fields'}
                  </span>
                </h3>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-x-auto">
              {unassignedFields.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs font-sans">No unassigned fields exist. All fields are categorized.</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead>
                    <tr className="text-slate-400 text-left text-xs font-bold tracking-wider">
                      <th className="pb-3 pr-4">{t('fieldBuilder.fieldName')}</th>
                      <th className="pb-3 px-4">{t('fieldBuilder.fieldType')}</th>
                      <th className="pb-3 px-4">Attributes</th>
                      <th className="pb-3 px-4">Order</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unassignedFields.map((field, index) => (
                      <tr key={field.id} className="hover:bg-slate-100/40 transition-colors">
                        {/* Field Name */}
                        <td className="py-4 pr-4 max-w-sm">
                          <p className="font-bold text-slate-800 font-sans flex items-center gap-1.5">
                            <span>{field.name}</span>
                            {field.isSystemField && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                {t('fieldBuilder.systemFieldBadge')}
                              </span>
                            )}
                          </p>
                          {field.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-sans">{field.description}</p>
                          )}
                        </td>
                        {/* Type */}
                        <td className="py-4 px-4 font-mono text-xs text-slate-500">
                          {field.fieldType}
                        </td>
                        {/* Attributes */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {field.required && (
                              <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-100">
                                {t('fieldBuilder.requiredBadge')}
                              </span>
                            )}
                            {!field.visible && (
                              <span className="text-[10px] bg-slate-150 text-slate-600 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <EyeOff className="h-3 w-3" />
                                <span>{t('fieldBuilder.hiddenBadge')}</span>
                              </span>
                            )}
                            {!field.editableByUser && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-100 inline-flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                <span>{t('fieldBuilder.readOnlyBadge')}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Order */}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleMoveField(field.id, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-150 disabled:opacity-20 disabled:pointer-events-none"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveField(field.id, 'down')}
                              disabled={index === unassignedFields.length - 1}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-150 disabled:opacity-20 disabled:pointer-events-none"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="py-4 pl-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenRolesModal(field)}
                              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Authorized Role Editors"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenFieldModal(field, '')}
                              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              title={t('fieldBuilder.editField')}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {field.isSystemField ? (
                              <button
                                onClick={() => alert(t('fieldBuilder.deleteDisabledSystem'))}
                                className="p-2 rounded-xl text-slate-300 cursor-not-allowed"
                                title={t('fieldBuilder.deleteDisabledSystem')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteField(field)}
                                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50"
                                title={t('fieldBuilder.deleteField')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="category-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 font-sans mb-4">
              {editingCategory ? t('fieldBuilder.renameCategory') : t('fieldBuilder.createCategory')}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('fieldBuilder.newCategoryName')}
                </label>
                <input
                  type="text"
                  value={categoryFormName}
                  onChange={(e) => setCategoryFormName(e.target.value)}
                  placeholder={t('fieldBuilder.categoryPlaceholder')}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {t('rbac.cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  {t('rbac.saveBtn')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Field Create/Edit Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" id="field-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-xl my-8"
          >
            <h3 className="text-lg font-bold text-slate-900 font-sans mb-4">
              {editingField ? t('fieldBuilder.editField') : t('fieldBuilder.createField')}
            </h3>
            <form onSubmit={handleSaveField} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('fieldBuilder.fieldName')}
                </label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder={t('fieldBuilder.fieldNamePlaceholder')}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('fieldBuilder.fieldDesc')}
                </label>
                <textarea
                  value={fieldDescription}
                  onChange={(e) => setFieldDescription(e.target.value)}
                  placeholder={t('fieldBuilder.fieldDescPlaceholder')}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('fieldBuilder.fieldCategory')}
                </label>
                <select
                  value={fieldCategoryId}
                  onChange={(e) => setFieldCategoryId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm bg-white"
                >
                  <option value="">-- {t('fieldBuilder.unassignedFields')} --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Type - Read Only for System Fields */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('fieldBuilder.fieldType')}
                </label>
                {editingField?.isSystemField ? (
                  <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 font-semibold font-mono flex items-center justify-between">
                    <span>{fieldType}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                      {t('fieldBuilder.fieldTypeReadOnly')}
                    </span>
                  </div>
                ) : (
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm bg-white font-mono"
                  >
                    <option value="TEXT">TEXT (Single Line)</option>
                    <option value="MULTILINE">MULTILINE (Rich Text/Paragraph)</option>
                    <option value="NUMBER">NUMBER</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="PHONE">PHONE</option>
                    <option value="DATE">DATE</option>
                    <option value="CHECKBOX">CHECKBOX (Boolean)</option>
                    <option value="DROPDOWN">DROPDOWN</option>
                    <option value="RADIO">RADIO</option>
                  </select>
                )}
              </div>

              {/* Options for Dropdown/Radio */}
              {(fieldType === 'DROPDOWN' || fieldType === 'RADIO') && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('fieldBuilder.options')}
                  </label>
                  <input
                    type="text"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    placeholder={t('fieldBuilder.optionsPlaceholder')}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              )}

              {/* Validation Rules */}
              {!editingField?.isSystemField && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('fieldBuilder.validationRules')}
                  </label>
                  <input
                    type="text"
                    value={fieldValidationRules}
                    onChange={(e) => setFieldValidationRules(e.target.value)}
                    placeholder={t('fieldBuilder.validationRulesPlaceholder')}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm font-mono"
                  />
                </div>
              )}

              {/* Default Value */}
              {!editingField?.isSystemField && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('fieldBuilder.defaultValue')}
                  </label>
                  <input
                    type="text"
                    value={fieldDefaultValue}
                    onChange={(e) => setFieldDefaultValue(e.target.value)}
                    placeholder={t('fieldBuilder.defaultValuePlaceholder')}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
                  />
                </div>
              )}

              {/* Attributes Checklist */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Field Behaviors</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Required */}
                  <label className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={fieldRequired}
                      onChange={(e) => setFieldRequired(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>{t('fieldBuilder.required')}</span>
                  </label>

                  {/* Visible */}
                  <label className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={fieldVisible}
                      onChange={(e) => setFieldVisible(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>{t('fieldBuilder.visible')}</span>
                  </label>

                  {/* Editable by end-user - Read Only for System Fields */}
                  {editingField?.isSystemField ? (
                    <div className="flex items-center space-x-2.5 text-sm font-medium text-slate-400 cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={fieldEditableByUser}
                        disabled
                        className="rounded border-slate-200 text-slate-300 h-4 w-4"
                      />
                      <span className="flex items-center gap-1">
                        <span>{t('fieldBuilder.editableByUser')}</span>
                        <Lock className="h-3 w-3" />
                      </span>
                    </div>
                  ) : (
                    <label className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={fieldEditableByUser}
                        onChange={(e) => setFieldEditableByUser(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>{t('fieldBuilder.editableByUser')}</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFieldModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {t('rbac.cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  {t('rbac.saveBtn')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Authorized Role Editors Modal */}
      {showRolesModal && roleFieldTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="roles-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">{t('fieldBuilder.rolesHeader')}</h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">{roleFieldTarget.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium mb-4">
              {t('fieldBuilder.rolesDesc')}
            </p>

            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/30 mb-6 p-2 space-y-1">
              {roles.length === 0 ? (
                <p className="text-slate-400 text-xs p-4 text-center">No organizational roles found.</p>
              ) : (
                roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className="flex items-center space-x-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRoleSelection(role.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-sm font-bold text-slate-700">{role.name}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  setRoleFieldTarget(null);
                }}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {t('rbac.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                {t('rbac.saveBtn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
