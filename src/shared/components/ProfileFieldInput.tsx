import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock } from 'lucide-react';

export enum ProfileFieldType {
  TEXT = 'TEXT',
  MULTILINE = 'MULTILINE',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  CHECKBOX = 'CHECKBOX',
  DROPDOWN = 'DROPDOWN',
  RADIO = 'RADIO',
}

export interface ProfileFieldDefinition {
  id: string;
  categoryId?: string | null;
  fieldKey?: string | null;
  name: string;
  description?: string | null;
  fieldType: ProfileFieldType | string;
  required: boolean;
  visible: boolean;
  editableByUser: boolean;
  displayOrder: number;
  defaultValue?: string | null;
  validationRules?: any;
  options?: any;
  isSystemField: boolean;
  editableByRoles?: any[];
}

interface ProfileFieldInputProps {
  field: ProfileFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  isOwner?: boolean;
  userRoles?: string[];
  isSuperuser?: boolean;
  disabled?: boolean;
  onError?: (error: string | null) => void;
}

export function ProfileFieldInput({
  field,
  value,
  onChange,
  isOwner = false,
  userRoles = [],
  isSuperuser = false,
  disabled = false,
  onError,
}: ProfileFieldInputProps) {
  const { t } = useTranslation();
  const [localError, setLocalError] = useState<string | null>(null);

  // Parse Dropdown/Radio options
  const parseOptions = (options: any): { label: string; value: string }[] => {
    if (!options || !Array.isArray(options)) return [];
    return options.map((opt: any) => {
      if (typeof opt === 'string') {
        return { label: opt.trim(), value: opt.trim() };
      }
      if (opt && typeof opt === 'object') {
        const val = opt.value !== undefined ? String(opt.value).trim() : '';
        const lbl = opt.label !== undefined ? String(opt.label).trim() : val;
        return { label: lbl, value: val };
      }
      return { label: String(opt).trim(), value: String(opt).trim() };
    });
  };

  const parsedOptions = parseOptions(field.options);

  // Compute Editability
  const checkIsEditable = (): boolean => {
    if (disabled) return false;

    if (isOwner) {
      return field.editableByUser;
    }

    // Viewing user is editing someone else's profile (Manager/Admin context)
    if (isSuperuser) return true;

    // Check if user has role-based edit permission
    const editableRoleIds = (field.editableByRoles || []).map((r: any) => {
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object') {
        return r.roleId || r.id || (r.role && r.role.id);
      }
      return String(r);
    });

    return userRoles.some((roleId) => editableRoleIds.includes(roleId));
  };

  const isEditable = checkIsEditable();

  // Validate value
  const validate = (val: string): string | null => {
    const trimmed = val.trim();

    if (field.required && !trimmed) {
      return t('profileFields.errors.required');
    }

    if (trimmed) {
      const fType = field.fieldType as ProfileFieldType;
      
      if (fType === ProfileFieldType.EMAIL) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          return t('profileFields.errors.invalidEmail');
        }
      } else if (fType === ProfileFieldType.NUMBER) {
        const num = Number(trimmed);
        if (isNaN(num)) {
          return t('profileFields.errors.invalidNumber');
        }
        const rules = field.validationRules ? (field.validationRules as any) : null;
        if (rules) {
          if (typeof rules.min === 'number' && num < rules.min) {
            return t('profileFields.errors.minNumber', { min: rules.min });
          }
          if (typeof rules.max === 'number' && num > rules.max) {
            return t('profileFields.errors.maxNumber', { max: rules.max });
          }
        }
      } else if (fType === ProfileFieldType.DATE) {
        const timestamp = Date.parse(trimmed);
        if (isNaN(timestamp)) {
          return t('profileFields.errors.invalidDate');
        }
      } else if (
        fType === ProfileFieldType.TEXT ||
        fType === ProfileFieldType.MULTILINE ||
        fType === ProfileFieldType.PHONE
      ) {
        const rules = field.validationRules ? (field.validationRules as any) : null;
        if (rules && rules.pattern) {
          try {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(trimmed)) {
              return rules.errorMessage || t('profileFields.errors.invalidPattern');
            }
          } catch (e) {
            // Ignore invalid regex compilations
          }
        }
      }
    }

    return null;
  };

  // Perform validation on change
  useEffect(() => {
    const err = validate(value || '');
    setLocalError(err);
    if (onError) {
      onError(err);
    }
  }, [value, field]);

  // Compute disabled explanations
  const getDisabledExplanation = (): string | null => {
    if (isEditable) return null;

    if (disabled) {
      return t('profileFields.disabledExplanation.readOnly');
    }

    if (field.isSystemField && !field.editableByUser && isOwner) {
      return t('profileFields.disabledExplanation.systemManaged');
    }

    if (isOwner && !field.editableByUser) {
      return t('profileFields.disabledExplanation.adminOnly');
    }

    if (!isOwner && !isSuperuser) {
      return t('profileFields.disabledExplanation.roleNotPermitted');
    }

    return t('profileFields.disabledExplanation.readOnly');
  };

  const disabledExplanation = getDisabledExplanation();

  const renderInputControl = () => {
    const fType = field.fieldType as ProfileFieldType;
    const commonClass = `w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50/70 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed ${
      localError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-200'
    }`;

    switch (fType) {
      case ProfileFieldType.MULTILINE:
        return (
          <textarea
            id={`field-input-${field.id}`}
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('profileFields.enterValuePlaceholder', { name: field.name })}
            rows={3}
            className={commonClass}
          />
        );

      case ProfileFieldType.NUMBER:
        return (
          <input
            id={`field-input-${field.id}`}
            type="number"
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('profileFields.enterValuePlaceholder', { name: field.name })}
            className={commonClass}
          />
        );

      case ProfileFieldType.EMAIL:
        return (
          <input
            id={`field-input-${field.id}`}
            type="email"
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('profileFields.enterValuePlaceholder', { name: field.name })}
            className={commonClass}
          />
        );

      case ProfileFieldType.PHONE:
        return (
          <input
            id={`field-input-${field.id}`}
            type="tel"
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('profileFields.enterValuePlaceholder', { name: field.name })}
            className={commonClass}
          />
        );

      case ProfileFieldType.DATE:
        return (
          <input
            id={`field-input-${field.id}`}
            type="date"
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            className={commonClass}
          />
        );

      case ProfileFieldType.CHECKBOX:
        return (
          <div className="flex items-center space-x-3 py-1">
            <input
              id={`field-input-${field.id}`}
              type="checkbox"
              checked={value === 'true'}
              disabled={!isEditable}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            />
            <span className="text-sm text-slate-700 font-medium">
              {t('profileFields.selectOption')}
            </span>
          </div>
        );

      case ProfileFieldType.DROPDOWN:
        return (
          <select
            id={`field-input-${field.id}`}
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            className={commonClass}
          >
            <option value="">{t('profileFields.selectOption')}</option>
            {parsedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case ProfileFieldType.RADIO:
        return (
          <div className="space-y-2 mt-1">
            {parsedOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center space-x-3 ${
                  isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                }`}
              >
                <input
                  type="radio"
                  name={`radio-group-${field.id}`}
                  value={opt.value}
                  checked={value === opt.value}
                  disabled={!isEditable}
                  onChange={() => onChange(opt.value)}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case ProfileFieldType.TEXT:
      default:
        return (
          <input
            id={`field-input-${field.id}`}
            type="text"
            value={value || ''}
            disabled={!isEditable}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('profileFields.enterValuePlaceholder', { name: field.name })}
            className={commonClass}
          />
        );
    }
  };

  return (
    <div id={`profile-field-container-${field.id}`} className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700">
          {field.name}
          {field.required && (
            <span className="text-red-500 ml-1" id={`req-marker-${field.id}`}>
              *
            </span>
          )}
        </label>
      </div>

      {field.description && (
        <p className="text-xs text-slate-500 leading-relaxed">{field.description}</p>
      )}

      <div className="relative rounded-xl">{renderInputControl()}</div>

      {localError && (
        <div
          id={`error-msg-${field.id}`}
          className="flex items-center space-x-1.5 text-xs text-red-600 font-medium animate-fadeIn"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {disabledExplanation && (
        <div
          id={`disabled-explanation-${field.id}`}
          className="flex items-start space-x-1.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 border border-slate-100/80"
        >
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          <span>{disabledExplanation}</span>
        </div>
      )}
    </div>
  );
}
