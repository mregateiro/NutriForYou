import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypts sensitive data (PHI, PII) using AES-256-GCM.
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64')
}

/**
 * Decrypts data encrypted by the encrypt function.
 */
export function decrypt(encryptedData: string): string {
  const key = getKey()
  const buffer = Buffer.from(encryptedData, 'base64')

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Hash a value for indexing (non-reversible).
 * Used for searching encrypted fields without decrypting all records.
 */
export function hashForSearch(value: string): string {
  const salt = process.env.SEARCH_HASH_SALT || 'nutriforyou-search-default-salt'
  const hash = scryptSync(value.toLowerCase(), salt, 32)
  return hash.toString('hex')
}
