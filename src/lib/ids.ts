import { randomBytes } from "node:crypto";

const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
// No 0/O/1/I so codes are easy to read out loud in a classroom.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function fromAlphabet(alphabet: string, length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Short, URL-safe primary key. */
export function newId() {
  return fromAlphabet(ID_ALPHABET, 14);
}

/** Human-friendly join code, e.g. "K7PQ2M". */
export function newJoinCode(length = 6) {
  return fromAlphabet(CODE_ALPHABET, length);
}
