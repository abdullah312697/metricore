// hooks/useOnlineUsers.js
import { useEffect, useState, useCallback } from "react";
import { socket } from "../socket";

export const useOnlineUsers = () => {
  const [onlineIds, setOnlineIds] = useState(new Set());

  const handleOnlineUsers = useCallback((ids) => {
    // 👇 Normalise ALL ids to strings
    setOnlineIds(new Set(ids.map(String)));
  }, []);

  useEffect(() => {
    // 👇 Register listener BEFORE requesting
    socket.on("onlineUsers", handleOnlineUsers);

    // 👇 Request current list on mount
    if (socket.connected) {
      socket.emit("getOnlineUsers");
    }

    // 👇 Also request when socket reconnects after reload
    socket.on("connect", () => {
      socket.emit("getOnlineUsers");
    });

    return () => {
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("connect");
    };
  }, [handleOnlineUsers]);

  // 👇 Always compare as strings — fixes ObjectId vs string mismatch
  const isOnline = useCallback(
    (employeeId) => onlineIds.has(String(employeeId)),
    [onlineIds]
  );

  return { onlineIds, isOnline };
};