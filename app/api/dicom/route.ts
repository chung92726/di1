import { Buffer } from "buffer";
const google = require("@googleapis/healthcare");
import { createHash } from "crypto";

export async function POST(request: Request): Promise<Response> {
  try {
    const chunks: any[] = [];
    const reader = request.body.getReader();
    const receivedHash = request.headers.get("File-Hash");
    let done, value;
    while ((({ done, value } = await reader.read()), !done)) {
      chunks.push(value);
    }
    const hash = createHash("sha256");
    chunks.forEach((chunk) => hash.update(chunk));
    const calculatedHash = hash.digest("hex");

    if (receivedHash !== calculatedHash) {
      console.error("Hash mismatch: ", receivedHash, calculatedHash);
      return new Response("File integrity check failed.", { status: 400 });
    } else {
      console.log("Hash match: ", receivedHash, calculatedHash);
    }
    const buffer = Buffer.concat(chunks);
    const fileName = request.headers.get("File-Name");
    console.log("Received file", fileName);

    const healthcare = google.healthcare({
      version: "v1",
      auth: new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      }),
    });

    const cloudRegion = "asia-east2";
    const projectId = "dicom-project-399511";
    const datasetId = "test";
    const dicomStoreId = "test123";
    const parent = `projects/${projectId}/locations/${cloudRegion}/datasets/${datasetId}/dicomStores/${dicomStoreId}`;
    const dicomWebPath = "studies";

    const requestConfig = {
      parent,
      dicomWebPath,
      requestBody: buffer,
    };

    console.log("Uploading DICOM file...");

    await healthcare.projects.locations.datasets.dicomStores.storeInstances(
      requestConfig,
      {
        headers: {
          "Content-Type": "application/dicom",
          Accept: "application/dicom+json",
        },
      }
    );

    return new Response("DICOM file uploaded successfully!", {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response("Error uploading DICOM file.", { status: 500 });
  }
}
