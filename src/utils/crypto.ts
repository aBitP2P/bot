import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptData(text: string, password: string): string {
  const salt = crypto.randomBytes(16);

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptData(encryptedString: string, password: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 4) throw new Error('Formato inválido');
  
  const [saltHex, ivHex, authTagHex, encryptedHex] = parts as [string, string, string, string];
  const key = crypto.pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function generateVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}