/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

export interface EmailTemplateVariable {
  key: string;
  token: string;
  labelKey: string;
  typesKey: string;
}

export const EMAIL_TEMPLATE_VARIABLES: EmailTemplateVariable[] = [
  {
    key: 'lessonTitle',
    token: '{{lessonTitle}}',
    labelKey: 'emailTemplates.variables.lessonTitle',
    typesKey: 'emailTemplates.variables.lessonTitleTypes',
  },
  {
    key: 'dueDate',
    token: '{{dueDate}}',
    labelKey: 'emailTemplates.variables.dueDate',
    typesKey: 'emailTemplates.variables.dueDateTypes',
  },
  {
    key: 'learnerName',
    token: '{{learnerName}}',
    labelKey: 'emailTemplates.variables.learnerName',
    typesKey: 'emailTemplates.variables.learnerNameTypes',
  },
  {
    key: 'actionUrl',
    token: '{{actionUrl}}',
    labelKey: 'emailTemplates.variables.actionUrl',
    typesKey: 'emailTemplates.variables.actionUrlTypes',
  },
];

interface EmailTemplateVariableHelperProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

export const EmailTemplateVariableHelper: React.FC<EmailTemplateVariableHelperProps> = ({
  textareaRef,
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  const handleInsert = (variableToken: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + variableToken);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = value.substring(0, start) + variableToken + value.substring(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variableToken.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  return (
    <div className="space-y-2 rounded-xl bg-card-header-bg/60 p-3 border border-card-border" id="email-template-variable-helper">
      <div className="flex items-center space-x-2 text-xs font-semibold text-text-heading font-sans">
        <Sparkles className="h-3.5 w-3.5 text-link-primary" />
        <span>{t('emailTemplates.variables.helperTitle', 'Insert Template Variables (Click to Insert at Cursor)')}:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {EMAIL_TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => handleInsert(v.token)}
            id={`btn-insert-var-${v.key}`}
            className="group flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-lg border border-card-border bg-card-bg hover:bg-card-header-bg text-left hover:border-link-primary transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20"
            title={`${t('emailTemplates.variables.insertTooltip', { token: v.token })} • ${t(v.typesKey)}`}
          >
            <span className="font-mono text-xs font-bold text-link-primary group-hover:underline">
              {v.token}
            </span>
            <span className="text-[11px] text-text-muted font-sans border-t sm:border-t-0 sm:border-l border-card-border sm:pl-2 pt-0.5 sm:pt-0">
              {t(v.typesKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
