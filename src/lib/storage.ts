import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Environment variable ${name} belum diatur`);
  return v;
}

function makeClient(endpoint?: string) {
  return new S3Client({
    endpoint, // kosong = AWS S3 asli
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: env("S3_ACCESS_KEY"),
      secretAccessKey: env("S3_SECRET_KEY"),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    // Banyak storage S3-compatible menolak checksum tambahan bawaan SDK terbaru
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

let internal: S3Client | undefined;
let external: S3Client | undefined;

// Dipakai server di dalam jaringan Docker (http://storage:8333)
const internalClient = () => (internal ??= makeClient(process.env.S3_ENDPOINT));
// Dipakai HANYA untuk menandatangani URL yang dibuka browser (http://localhost:8333)
const publicClient = () =>
  (external ??= makeClient(
    process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
  ));

let bucketReady: Promise<void> | undefined;

/** Pastikan bucket ada (dibuat otomatis jika belum ada) */
export function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const Bucket = env("S3_BUCKET");
    try {
      await internalClient().send(new HeadBucketCommand({ Bucket }));
    } catch {
      await internalClient().send(new CreateBucketCommand({ Bucket }));
    }
  })().catch((e) => {
    bucketReady = undefined;
    throw e;
  });
  return bucketReady;
}

export async function uploadPrivateFile(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await ensureBucket();
  // Tanpa ACL = private secara default
  await internalClient().send(
    new PutObjectCommand({
      Bucket: env("S3_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteFile(key: string) {
  await internalClient().send(
    new DeleteObjectCommand({ Bucket: env("S3_BUCKET"), Key: key }),
  );
}

/** URL sementara (default 5 menit) untuk membuka file private di browser */
export function getPrivateFileUrl(key: string, expiresInSeconds = 300) {
  return getSignedUrl(
    publicClient(),
    new GetObjectCommand({ Bucket: env("S3_BUCKET"), Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

export async function getFileBytes(key: string) {
  const res = await internalClient().send(
    new GetObjectCommand({ Bucket: env("S3_BUCKET"), Key: key }),
  );
  const bytes = await res.Body!.transformToByteArray();
  return { bytes, contentType: res.ContentType ?? "application/octet-stream" };
}