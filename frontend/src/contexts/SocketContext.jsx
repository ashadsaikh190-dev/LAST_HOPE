import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, student } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastSyncEvent, setLastSyncEvent] = useState(null);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket.IO] Connected to server:', newSocket.id);

      // Join appropriate rooms
      if (student?.trackingId) {
        newSocket.emit('join', { trackingId: student.trackingId, role: user?.role });
      } else if (user?.role) {
        newSocket.emit('join', { role: user.role });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket.IO] Disconnected from server');
    });

    // Real-time Notification Listener
    newSocket.on('notification:new', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    // Universal Synchronization Listener for all three roles
    newSocket.on('sync:update', (eventPayload) => {
      console.log('[Socket.IO] Universal Sync Update:', eventPayload);
      setLastSyncEvent(eventPayload);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [student?.trackingId, user?.role]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        setNotifications,
        lastSyncEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
