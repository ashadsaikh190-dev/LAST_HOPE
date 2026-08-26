const { Server } = require('socket.io');

let io = null;

const initializeSocket = (httpServer, clientUrl) => {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room based on role or student tracking ID
    socket.on('join', (data) => {
      if (data?.trackingId) {
        const room = `student:${data.trackingId}`;
        socket.join(room);
        console.log(`[Socket.IO] Socket ${socket.id} joined student room: ${room}`);
      }
      if (data?.role === 'COUNSELOR') {
        socket.join('counselors');
        console.log(`[Socket.IO] Socket ${socket.id} joined counselors room`);
      }
      if (data?.role === 'ADMIN') {
        socket.join('admins');
        console.log(`[Socket.IO] Socket ${socket.id} joined admins room`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    // Return dummy object if not initialized to prevent crashing in unit tests
    return {
      to: () => ({ emit: () => {} }),
      emit: () => {},
    };
  }
  return io;
};

// Real-time broadcast helpers
const emitToStudent = (trackingId, event, data) => {
  getIO().to(`student:${trackingId}`).emit(event, data);
};

const emitToCounselors = (event, data) => {
  getIO().to('counselors').emit(event, data);
};

const emitToAdmins = (event, data) => {
  getIO().to('admins').emit(event, data);
};

const emitBroadcast = (event, data) => {
  getIO().emit(event, data);
};

module.exports = {
  initializeSocket,
  getIO,
  emitToStudent,
  emitToCounselors,
  emitToAdmins,
  emitBroadcast,
};
