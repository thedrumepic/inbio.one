import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '../utils/api';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally {
                // Имитация небольшой задержки для плавности, если нужно, или просто снятие флага
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        // Если пользователь не авторизован, перенаправляем на логин
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Если роль не подходит
        if (user.role === 'user') {
            // Обычного юзера кидаем в дашборд
            return <Navigate to="/dashboard" replace />;
        }
        // В остальных случаях (или если мы хотим жестко) - 404
        return <Navigate to="/404" replace />;
    }

    // Если всё ок
    return children;
};

export default ProtectedRoute;
