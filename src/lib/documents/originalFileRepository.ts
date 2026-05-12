import { adminDb } from "@/lib/firebase/admin";

const FILES_COLLECTION = "documentFiles";
const CHUNKS_COLLECTION = "chunks";

const BASE64_CHUNK_SIZE = 500_000;

type SaveOriginalFileInput = {
  documentId: string;
  fileName: string;
  fileType: string;
  buffer: Buffer;
};

function fileRef(documentId: string) {
  return adminDb.collection(FILES_COLLECTION).doc(documentId);
}

function chunkRef(documentId: string, index: number) {
  return fileRef(documentId)
    .collection(CHUNKS_COLLECTION)
    .doc(String(index).padStart(5, "0"));
}

export async function saveOriginalFile({
  documentId,
  fileName,
  fileType,
  buffer,
}: SaveOriginalFileInput) {
  const base64 = buffer.toString("base64");
  const chunks = base64.match(new RegExp(`.{1,${BASE64_CHUNK_SIZE}}`, "g")) ?? [];

  await fileRef(documentId).set({
    documentId,
    fileName,
    fileType,
    size: buffer.length,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  });

  let batch = adminDb.batch();
  let operationCount = 0;

  for (const [index, chunk] of chunks.entries()) {
    batch.set(chunkRef(documentId, index), {
      index,
      data: chunk,
    });

    operationCount += 1;

    if (operationCount >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return {
    fileName,
    fileType,
    size: buffer.length,
    chunkCount: chunks.length,
  };
}

export async function getOriginalFile(documentId: string) {
  const metadataSnapshot = await fileRef(documentId).get();

  if (!metadataSnapshot.exists) {
    return null;
  }

  const metadata = metadataSnapshot.data();

  if (!metadata) {
    return null;
  }

  const chunksSnapshot = await fileRef(documentId)
    .collection(CHUNKS_COLLECTION)
    .orderBy("index", "asc")
    .get();

  const base64 = chunksSnapshot.docs
    .map((doc) => doc.data().data as string)
    .join("");

  return {
    fileName: metadata.fileName as string,
    fileType: metadata.fileType as string,
    size: metadata.size as number,
    buffer: Buffer.from(base64, "base64"),
  };
}

export async function deleteOriginalFile(documentId: string) {
  const chunksSnapshot = await fileRef(documentId)
    .collection(CHUNKS_COLLECTION)
    .get();

  let batch = adminDb.batch();
  let operationCount = 0;

  for (const doc of chunksSnapshot.docs) {
    batch.delete(doc.ref);
    operationCount += 1;

    if (operationCount >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      operationCount = 0;
    }
  }

  batch.delete(fileRef(documentId));
  operationCount += 1;

  if (operationCount > 0) {
    await batch.commit();
  }
}