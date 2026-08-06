import { io } from "socket.io-client";

// const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
const SOCKET_URL = "https://10.21.177.23:5000";
// console.log(SOCKET_URL);
// const SOCKET_URL =
//   process.env.REACT_APP_API_URL_SOCKET ||
//   `${window.location.protocol}//${window.location.hostname}:5000`;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket"],
});
