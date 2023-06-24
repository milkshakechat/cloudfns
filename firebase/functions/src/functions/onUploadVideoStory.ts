/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import config from "../config.env";
import { createJobFromPreset } from "../services/video-transcoder";

export const onUploadVideoStory = onObjectFinalized(
  { bucket: config.FIREBASE.storageBucket },
  async (event) => {
    console.log(`onUploadVideoStory... ${new Date().toISOString()}}`);

    const outputBucketForTranscoding = config.VIDEO_TRANSCODER.bucket.name;

    //  [START v2storageEventAttributes]
    const fileBucket = event.data.bucket; // Storage bucket containing the file.
    const filePath = event.data.name; // File path in the bucket.
    const contentType = event.data.contentType; // File content type.
    // [END v2storageEventAttributes]
    console.log(`
    fileBucket == ${fileBucket}
    filePath == ${filePath}
    contentType == ${contentType}
  `);
    if (filePath.indexOf("/story/video/") === -1) {
      return logger.log("This is not a story.");
    }
    if (!contentType || !contentType.startsWith("video/")) {
      return logger.log("This is not a video.");
    }

    function transformFilePath(filePath: string) {
      // Example Usage
      // const filePath =
      //   "users/bpSkq4bQFuWYoj7xtGD8pr5gUdD3/story/video/0b640182-7ff9-437a-9401-b01d83515a54.mp4";
      // console.log(transformFilePath(filePath)); // "users/bpSkq4bQFuWYoj7xtGD8pr5gUdD3/story/video/0b640182-7ff9-437a-9401-b01d83515a54/video-streaming/"
      const folderPath = filePath.replace(/(\.mp4)$/, "/video-streaming/");
      return folderPath;
    }

    // create a video transcoding job
    console.log("create a video transcoding job");
    const output = `gs://${outputBucketForTranscoding}/${transformFilePath(
      filePath
    )}`;
    console.log(`const jobId = await createJobFromPreset({
      inputUri: "gs://${fileBucket}/${filePath}",
      outputUri: "${output}",
    });`);
    const jobId = await createJobFromPreset({
      inputUri: `gs://${fileBucket}/${filePath}`,
      outputUri: output,
    });

    console.log(`Got JobID = ${jobId}`);

    return jobId;
  }
);
