import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants/routes';
import { getStoredToken } from '../../services/auth';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const token = getStoredToken();

  if (!token) {
    return <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default RequireAuth;

