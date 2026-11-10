import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function protect(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// Reads the role from the database so a demotion applies before the 7-day token expires.
export async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user?.id).select('role');
    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Administrator access required.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
