export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
}

export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  USER: '/api/auth/user',
} as const;

export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

export const isActiveUser = (user: User | null): boolean => {
  return user?.isActive === true;
};

export const getFullName = (user: User): string => {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  return `${firstName} ${lastName}`.trim() || user.email;
};

export const formatLastLogin = (lastLogin: string | undefined): string => {
  if (!lastLogin) return 'Nunca';
  
  return new Date(lastLogin).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getUserRoleLabel = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'user':
      return 'Usuario';
    default:
      return 'Desconocido';
  }
};

export const DEFAULT_USERS = {
  LOGISTICS: {
    email: 'logistica@empresa.com',
    password: '123456',
    role: 'user' as const,
  },
  ADMIN: {
    email: 'admin@empresa.com',
    password: 'admin123',
    role: 'admin' as const,
  },
} as const;
