import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET; // Use a strong secret in prod
const JWT_EXPIRY = '7d'; // Adjust as needed

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
