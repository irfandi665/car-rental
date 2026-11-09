import { ensureBucket, getPrivateFileUrl, uploadPrivateFile } from "../src/lib/storage";

async function main() {
  await ensureBucket();
  await uploadPrivateFile(
    "healthcheck/hello.txt",
    Buffer.from("storage ok"),
    "text/plain",
  );
  console.log("Upload OK");
  console.log("Signed URL :", await getPrivateFileUrl("healthcheck/hello.txt"));
  console.log(
    "Tanpa tanda tangan:",
    `${process.env.S3_PUBLIC_ENDPOINT}/${process.env.S3_BUCKET}/healthcheck/hello.txt`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});