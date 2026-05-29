import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from './Toast';

const ProtectedRoute = ({ children, roleRequired }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const toast = useToast();
    const hasShownToast = useRef(false);

    useEffect(() => {
        if (!hasShownToast.current && userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.remainingDays !== undefined && user.remainingDays !== null && user.email !== 'edwinalvarezvivero@yahoo.com') {
                    // Show for 8 seconds so they can read it
                    toast.info(`⏳ Tienes ${user.remainingDays} días de duración restantes.`, 8000);
                }
            } catch (e) {}
            hasShownToast.current = true;
        }
    }, [userStr]);
    
    // Si no hay token, al login de cabeza
    if (!token || !userStr) {
        return <Navigate to="/" replace />;
    }

    try {
        const user = JSON.parse(userStr);
        
        // Si la ruta requiere ser admin y el usuario no lo es, al login
        if (roleRequired === 'admin' && user.role !== 'admin') {
            console.warn('Acceso denegado: Se requiere rol de administrador');
            return <Navigate to="/" replace />;
        }

        // Si la ruta es para cliente y un admin intenta entrar (o viceversa si se prefiere)
        // Aquí permitimos que el admin vea todo, o podemos restringir.
        
        return children;
    } catch (e) {
        localStorage.clear();
        return <Navigate to="/" replace />;
    }
};

export default ProtectedRoute;
