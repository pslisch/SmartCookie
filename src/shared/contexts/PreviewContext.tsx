import React, { createContext, useContext, useState } from 'react';

interface PreviewContextType {
  previewRoleId: string | null;
  previewRoleName: string | null;
  previewEffectivePermissions: string[] | null;
  enterPreview: (roleId: string, roleName: string) => Promise<void>;
  exitPreview: () => void;
}

export const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return context;
}

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);
  const [previewRoleName, setPreviewRoleName] = useState<string | null>(null);
  const [previewEffectivePermissions, setPreviewEffectivePermissions] = useState<string[] | null>(null);

  const enterPreview = async (roleId: string, roleName: string) => {
    try {
      const res = await fetch(`/api/roles/${roleId}/effective-permissions`);
      if (!res.ok) {
        throw new Error('Failed to fetch effective permissions for preview role.');
      }
      const data: string[] = await res.json();
      setPreviewRoleId(roleId);
      setPreviewRoleName(roleName);
      setPreviewEffectivePermissions(data);
    } catch (err) {
      console.error('Error entering preview:', err);
    }
  };

  const exitPreview = () => {
    setPreviewRoleId(null);
    setPreviewRoleName(null);
    setPreviewEffectivePermissions(null);
  };

  return (
    <PreviewContext.Provider
      value={{
        previewRoleId,
        previewRoleName,
        previewEffectivePermissions,
        enterPreview,
        exitPreview,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}
