import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('admissions_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.data.user);
          setStudent(response.data.data.student);
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        localStorage.removeItem('admissions_auth_token');
        setUser(null);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token, user: userData, student: studentData } = response.data.data;
      localStorage.setItem('admissions_auth_token', token);
      setUser(userData);
      setStudent(studentData);
      return { user: userData, student: studentData };
    }
  };

  const register = async (registrationData) => {
    const response = await api.post('/auth/register', registrationData);
    if (response.data.success) {
      const { token, user: userData, student: studentData } = response.data.data;
      localStorage.setItem('admissions_auth_token', token);
      setUser(userData);
      setStudent(studentData);
      return { user: userData, student: studentData };
    }
  };

  const logout = () => {
    localStorage.removeItem('admissions_auth_token');
    setUser(null);
    setStudent(null);
  };

  const refreshStudentProfile = async () => {
    try {
      const res = await api.get('/students/me');
      if (res.data.success) {
        setStudent(res.data.data);
      }
    } catch (err) {
      console.error('Failed to refresh student profile', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        loading,
        login,
        register,
        logout,
        refreshStudentProfile,
        isAuthenticated: Boolean(user),
        isStudent: user?.role === 'STUDENT',
        isCounselor: user?.role === 'COUNSELOR',
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
