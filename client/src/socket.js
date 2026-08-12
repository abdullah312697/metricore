import { io } from "socket.io-client";

 const SOCKET_URL = process.env.REACT_APP_API_URL_SOCKET || "https://api.metricore.app"

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket"],
});
