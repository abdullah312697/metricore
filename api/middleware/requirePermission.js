// middleware/requirePermission.js
import { getRequester } from "../utils/auth.js";

export const requirePermission = (permission) => async (req, res, next) => {
  const ctx = await getRequester(req);
  if (!ctx) {
    return res.status(401).json({ message: "Login/Register please!" });
  }
  if (permission && !ctx.can(permission)) {
    return res.status(403).json({ message: "You don't have permission for this action." });
  }
  req.ctx = ctx;   // attach so the route can use ctx.requester, ctx.companyId, etc.
  next();
};