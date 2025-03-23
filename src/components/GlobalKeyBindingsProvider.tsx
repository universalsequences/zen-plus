import React from 'react';
import { useGlobalKeyBindings } from '@/hooks/useGlobalKeyBindings';

/**
 * Component that wraps children and provides global keyboard bindings
 * This should be placed below PatchesContext in the component tree
 */
const GlobalKeyBindingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize the global key bindings
  useGlobalKeyBindings();
  
  // This component doesn't render anything itself, just enables the keyboard shortcuts
  return <>{children}</>;
};

export default GlobalKeyBindingsProvider;