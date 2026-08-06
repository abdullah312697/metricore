// import { Server as SocketIOServer } from "socket.io";
// import { decryptUserData } from "../verifyuser.js";
// import registerMessageEvents from "./message.socket.js";
// import registerCallEvents from "./call.socket.js";

// let io;

// const onlineUsers = new Map();

// export const initSocket = (server, allowedOrigins) => {
//     io = new SocketIOServer(server, {
//     cors: {
//       origin: allowedOrigins,
//       credentials: true
//     }
//   });

//     io.use((socket, next) => {
//   try{
//   const cookies = socket.handshake.headers.cookie;
//   if (!cookies) return next(new Error("No cookies found"));

//   const parsed = Object.fromEntries(
//     cookies.split(";").map(c => c.trim().split("="))
//   );

//   const employeeCookie = parsed.employeeId;
//   const companyCookie = parsed.companyId;
//   if (!employeeCookie || !companyCookie) {
//    console.error("❌ Cannot decrypt: value is missing");
//     return next(new Error("Unauthorized"));
// }

//   const employeeSession = decryptUserData(employeeCookie);
//   const companySession = decryptUserData(companyCookie);

//   if (!employeeSession || !companySession) {
//     console.log("❌ No employee id from cookie");
//     return next(new Error("Unauthorized"));
//   }

//   socket.employeeId = employeeSession;
//   socket.companyId = companySession || null;

//   // Mark online
//   onlineUsers.set(socket.employeeId, socket.id);

//   next();
// }catch {
//     next(new Error("Auth failed"));
//   }
// });

// const socketIdForEmployee = (employeeId) => {
//   return onlineUsers.get(String(employeeId));
// };

// //soket (io) end</>
// io.on("connection", (socket) => {
//   console.log("socket connected:", socket.id);

//    registerMessageEvents(io, socket);
//     registerCallEvents(io, socket, socketIdForEmployee);

//   // Disconnect
//   socket.on("disconnect", () => {
//     // remove from onlineUsers
//     if (socket.employeeId) {
//       for (const [empId, sid] of onlineUsers.entries()) {
//         if (sid === socket.id) {
//           onlineUsers.delete(empId);
//           break;
//         }
//       }
//       io.emit("onlineUsers", Array.from(onlineUsers.keys()));
//     }
//     console.log("socket disconnected:", socket.id);
//   });
// });
//  return io;
// }

// export const getIO = () => {
//   if (!io) throw new Error("Socket not initialized");
//   return io;
// };


// // soket (io) end</>
import { Server as SocketIOServer } from "socket.io";
import { decryptUserData }          from "../verifyuser.js";
import registerMessageEvents        from "./message.socket.js";
import registerCallEvents           from "./call.socket.js";

let io;

// { employeeId(string) → Set of socketIds } — supports multiple tabs
const onlineUsers = new Map();

// ── Add socket for employee ──────────────────────────────────────
const addOnline = (employeeId, socketId) => {
  const id = String(employeeId);
  if (!onlineUsers.has(id)) onlineUsers.set(id, new Set());
  onlineUsers.get(id).add(socketId);
};

// ── Remove socket for employee ───────────────────────────────────
const removeOnline = (employeeId, socketId) => {
  const id = String(employeeId);
  if (!onlineUsers.has(id)) return;
  onlineUsers.get(id).delete(socketId);
  if (onlineUsers.get(id).size === 0) {
    onlineUsers.delete(id); // no more tabs open → truly offline
  }
};

// ── Get list of online employee IDs ─────────────────────────────
const getOnlineList = () => Array.from(onlineUsers.keys());

// ── Broadcast to ALL clients ─────────────────────────────────────
const broadcastOnlineUsers = () => {
  io.emit("onlineUsers", getOnlineList());
};

export const initSocket = (server, allowedOrigins) => {
  io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // ── Auth middleware ────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) return next(new Error("No cookies"));

      const parsed = Object.fromEntries(
        cookies.split(";").map((c) => {
          const [key, ...val] = c.trim().split("=");
          return [key, val.join("=")]; // handle = inside value
        })
      );

      const employeeSession = decryptUserData(parsed.employeeId);
      const companySession  = decryptUserData(parsed.companyId);

      if (!employeeSession || !companySession)
        return next(new Error("Unauthorized"));

      socket.employeeId = String(employeeSession); // 👈 always string
      socket.companyId  = String(companySession);
      next();
    } catch {
      next(new Error("Auth failed"));
    }
  });

  const socketIdForEmployee = (employeeId) => {
    const sockets = onlineUsers.get(String(employeeId));
    return sockets ? [...sockets][0] : undefined; // return first socket
  };

  // ── Connection ─────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`✅ Connected: ${socket.id} | Employee: ${socket.employeeId}`);

    // 👇 Add to online map HERE (not in middleware)
    addOnline(socket.employeeId, socket.id);

    // 👇 Broadcast updated list to ALL (including this new socket)
    broadcastOnlineUsers();

    registerMessageEvents(io, socket);
    registerCallEvents(io, socket, socketIdForEmployee);

    // 👇 Handle client requesting current online list
    // (called by frontend on mount)
    socket.on("getOnlineUsers", () => {
      socket.emit("onlineUsers", getOnlineList());
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`❌ Disconnected: ${socket.id} | Reason: ${reason}`);
      removeOnline(socket.employeeId, socket.id);
      broadcastOnlineUsers(); // 👈 broadcast after removal
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};