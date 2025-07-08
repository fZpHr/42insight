"use client";
import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Student, PoolUser, UserIntraInfo } from '@/types';
import { parseCookies } from 'nookies';

export interface AuthContextProps {
    user: Student | null;
    loading?: boolean;
    isPoolUser?: boolean;
    isStaff?: boolean;
    isAuthenticated: () => Promise<boolean>;
    fetchCampusStudents: (campus: string) => Promise<Student[]>;
    fetchQueryResults: (query: string) => Promise<any>;
    fetchUserIntraInfo: (login: string) => Promise<UserIntraInfo | null>;
    fetchPoolStudents: () => Promise<PoolUser[]>;
    getCampusRank: (campus: string) => Promise<any>;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<Student | null>(null);
    const [isPoolUser, setIsPoolUser] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [isStaff, setIsStaff] = useState<boolean>(false);


    const isAuthenticated = async () => {
        const cookies = parseCookies();
        const token = cookies.token;
        if (!token) return false;

        try {
            const response = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 401) {
                setUser(null);
                return false;
            }

            return response.status === 200;
        } catch (error) {
            console.warn('Network error during auth check:', error);
            return user !== null;
        }
    };

    const fetchCampusStudents = async (campus: string): Promise<Student[]> => {
        try {
            const cookies = parseCookies();
            const token = cookies.token;

            if (!token) { throw new Error('No authentication token found'); }
            const response = await fetch(`/api/users/campus/${campus}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch students')
            }
            return response.json()
        } catch (error) {
            console.error('Error fetching students:', error)
            throw error
        }
    }


    const fetchPoolStudents = async (): Promise<PoolUser[]> => {
        try {
            const cookies = parseCookies();
            const token = cookies.token;
            if (!token) { throw new Error('No authentication token found'); }
            const response = await fetch('/api/users/pool', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch pool students');
            }
            return response.json();
        } catch (error) {
            console.error('Error fetching pool students:', error);
            return [];
        }
    }

    const fetchUserIntraInfo = async (login: string): Promise<UserIntraInfo | null> => {
        try {
            const cookies = parseCookies();
            const token = cookies.token;

            if (!token) { throw new Error('No authentication token found'); }
            const response = await fetch(`/api/users/${login}/intra`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            const data = await response.json();
            if (!data || !data.id) {
                throw new Error('Invalid user data received');
            }
            setLoading(false);
            return data
        } catch (error) {
            console.error('Error fetching user intra info:', error);
            return null;
        }
    }

    const fetchQueryResults = async (query: string) => {
        try {
            const cookies = parseCookies();
            const token = cookies.token;

            if (!token) { throw new Error('No authentication token found'); }
            const response = await fetch(`/api/proxy/${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch query results');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching query results:', error);
            return [];
        }
    }

    const getCampusRank = async (campus: string): Promise<any> => {
        try {
            const cookies = parseCookies();
            const token = cookies.token;
            if (!token) { throw new Error('No authentication token found'); }
            const response = await fetch(`/api/users/${user?.name}/rank`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch campus rank');
            }
            const data = await response.json();
            return data.rank || null;
        } catch (error) {
            console.error('Error fetching campus rank:', error);
            throw error;
        }
    }


    useEffect(() => {
        const fetchUser = async () => {
            const cookies = parseCookies();
            const token = cookies.token;
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                    setIsPoolUser(data.isPoolUser || false);
                    setIsStaff(data.isStaff || false);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated, fetchCampusStudents, fetchQueryResults, fetchUserIntraInfo, fetchPoolStudents, isPoolUser, isStaff, getCampusRank }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};