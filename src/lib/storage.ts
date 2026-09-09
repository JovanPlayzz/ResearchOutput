import fs from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

/**
 * Where uploaded files live.
 *  - on a PC: the uploads/ folder next to the app
 *  - on Vercel: Vercel Blob (private), switched on by the BLOB_READ_WRITE_TOKEN Vercel sets
 * Keys are the relative paths already stored in the database, such as
 * "announcements/<id>-photo.jpg" or "<id>-report.pdf".
 */
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export type StoredFile = {
  body: ReadableStream<Uint8Array> | Blob;
  contentType: string | null;
  size: number | null;
};

function localPath(key: string) {
  const file = path.resolve(UPLOAD_ROOT, key);
  if (!file.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Bad file key.");
  return file;
}

export async function putFile(key: string, data: Buffer, contentType: string): Promise<void> {
  if (blobEnabled()) {
    await put(key, data, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType });
    return;
  }
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function getFile(key: string): Promise<StoredFile | null> {
  if (blobEnabled()) {
    const res = await get(key, { access: "private" }).catch(() => null);
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType, size: res.blob.size };
  }
  try {
    const data = await fs.readFile(localPath(key));
    return { body: new Blob([new Uint8Array(data)]), contentType: null, size: data.byteLength };
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (blobEnabled()) {
    await del(key).catch(() => {});
    return;
  }
  await fs.rm(localPath(key), { force: true }).catch(() => {});
}
