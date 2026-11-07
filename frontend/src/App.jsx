import React, { useState, useEffect } from 'react';
import PublicWorkspace from './components/PublicWorkspace';
import AdminApp from './components/AdminApp';
import { ThemeLanguageProvider } from './context/ThemeLanguageContext';

function MainRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');

  if (isAdminRoute) {
    return <AdminApp />;
  }

  return <PublicWorkspace />;
}

export default function App() {
  return (
    <ThemeLanguageProvider>
      <MainRouter />
    </ThemeLanguageProvider>
  );
}
