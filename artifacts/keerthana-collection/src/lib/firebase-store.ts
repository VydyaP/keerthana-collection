import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  firestore,
  storage,
  type FileSlot,
  type Keerthana,
  type Language,
} from "./firebase";

function songsCollection(uid: string) {
  if (!firestore) throw new Error("Firebase Firestore is not configured.");
  return collection(firestore, "users", uid, "keerthanas");
}

export function subscribeToKeerthanas(
  uid: string,
  onData: (songs: Keerthana[]) => void,
  onError: (error: Error) => void,
) {
  const songsQuery = query(songsCollection(uid));
  return onSnapshot(
    songsQuery,
    (snapshot) => {
      const songs = snapshot.docs
        .map((item) => item.data() as Keerthana)
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(songs);
    },
    (error) => onError(error),
  );
}

export async function syncKeerthanas(
  uid: string,
  previous: Keerthana[],
  next: Keerthana[],
) {
  const batch = writeBatch(firestore!);
  const previousIds = new Set(previous.map((song) => song.id));
  const nextIds = new Set(next.map((song) => song.id));

  for (const song of next) {
    batch.set(doc(songsCollection(uid), song.id), song);
  }
  for (const id of previousIds) {
    if (!nextIds.has(id)) batch.delete(doc(songsCollection(uid), id));
  }
  await batch.commit();
}

export async function uploadNotation(
  uid: string,
  songId: string,
  language: Language,
  file: File,
): Promise<FileSlot> {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  const storagePath = `users/${uid}/keerthanas/${songId}/${language}/${crypto.randomUUID()}-${file.name}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(fileRef);
  return {
    name: file.name,
    url,
    bytes: file.size,
    size: formatBytes(file.size),
    uploadedAt: "Just now",
    storagePath,
  };
}

export async function removeNotation(storagePath?: string) {
  if (!storage || !storagePath) return;
  await deleteObject(ref(storage, storagePath));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function deleteSong(uid: string, id: string) {
  await deleteDoc(doc(songsCollection(uid), id));
}