// src/utils/socket.ts
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket: SocketIOClient.Socket | null = null;

export const getSocket = (): SocketIOClient.Socket => {
  if (!socket) {
    socket = io(SOCKET_URL);
  }
  return socket;
};

export default getSocket;