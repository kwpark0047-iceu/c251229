'use client';

import React, { useEffect, useState } from 'react';
import { getUserRole } from '@/app/lead-manager/auth-service';

type UserRole = 'owner' | 'admin' | 'member';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    fallback?: React.ReactNode;
}

export default function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRole() {
            try {
                const userRole = await getUserRole();
                setRole(userRole);
            } catch (error) {
                console.error('Failed to fetch user role:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRole();
    }, []);

    if (loading) {
        return null; // 또는 로딩 스피너
    }

    if (role && allowedRoles.includes(role)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
