import { accessLocalGCPKeyFile } from "../utils/secrets";
import { GetSignedUrlConfig, Storage } from "@google-cloud/storage";
import config from "../config.env";

// this is specifically for accessing buckets with the IAM service account "dairyfarm-sockets-server@<PROJECT_ID>.iam.gserviceaccount.com"
// buckets such as "user-stories-social"
// this should be refactored to be a singleton with fine grained access to multiple buckets
export let Storage_GCP: Storage = new Storage({});
export const initStorageBucket_GCP = async () => {
  console.log(`Init storage bucket="${config.VIDEO_TRANSCODER.bucket.name}"`);
  const credentials = await accessLocalGCPKeyFile();
  Storage_GCP = new Storage({
    projectId: config.GCLOUD.projectId,
    credentials,
  });
};

/**
 * await generateSignedUrlForStorageItem({
    bucketName: config.BUCKETS.UserStories.name,
    filename: "folder/file.mp4",
  });
 */
export async function generateSignedUrlForStorageItem({
  bucketName,
  filename,
  duration = Date.now() + 1000 * 60 * 60 * 24, // 24 hours
}: {
  bucketName: string;
  filename: string;
  duration?: number;
}) {
  // These options will allow temporary read access to the file
  const options: GetSignedUrlConfig = {
    version: "v4",
    action: "read",
    expires: duration,
  };

  // Get a v4 signed URL for reading the file
  const [url] = await Storage_GCP.bucket(bucketName)
    .file(filename)
    .getSignedUrl(options);

  console.log("Generated GET signed URL:");
  console.log(url);
  console.log("You can use this URL with any user agent, for the next hour.");
  return url;
}
