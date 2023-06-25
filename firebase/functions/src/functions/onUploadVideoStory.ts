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
import * as ffmpeg from "fluent-ffmpeg";
import { mkdirp } from "mkdirp";
import * as fs from "fs";
import config from "../config.env";
import { createJobFromPreset } from "../services/video-transcoder";
import { Storage_GCP, initStorageBucket_GCP } from "../services/private-bucket";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * FFMPEG only works on Node16 cloud functions!
 */
export const onUploadVideoStory = onObjectFinalized(
  { bucket: config.FIREBASE.storageBucket },
  async (event) => {
    console.log(`onUploadVideoStory... ${new Date().toISOString()}}`);

    const outputBucketForTranscoding = config.VIDEO_TRANSCODER.bucket.name;

    //  [START v2storageEventAttributes]
    const fileBucket = event.data.bucket; // Storage bucket containing the file.
    const filePath = event.data.name; // File path in the bucket.
    // filePath  = /users/m2fb0WWHOBesIAsevvCeNfv1w2Z2/story/VIDEO/463e7540-4466-4caf-bbe1-2bd77217349b/463e7540-4466-4caf-bbe1-2bd77217349b.mp4
    // thumbnail = /users/m2fb0WWHOBesIAsevvCeNfv1w2Z2/story/VIDEO/463e7540-4466-4caf-bbe1-2bd77217349b/thumbnail-463e7540-4466-4caf-bbe1-2bd77217349b.jpeg
    const contentType = event.data.contentType; // File content type.
    // assetID
    const pathParts = filePath.split("/");
    const videoIndex = pathParts.indexOf("VIDEO");
    const assetID = pathParts[videoIndex + 1];

    console.log(`
    fileBucket == ${fileBucket}
    filePath == ${filePath}
    contentType == ${contentType}
    assetID = ${assetID}
  `);
    if (filePath.indexOf("/story/VIDEO/") === -1) {
      return logger.log("This is not a story.");
    }
    if (!contentType || !contentType.startsWith("video/")) {
      return logger.log("This is not a video.");
    }
    await initStorageBucket_GCP();

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
    const jobId = await createJobFromPreset({
      inputUri: `gs://${fileBucket}/${filePath}`,
      outputUri: output,
    });
    console.log(`Got JobID = ${jobId}`);

    // create a thumbnail for this video
    // const TEMP_LOCAL_FOLDER = "/tmp/";
    // console.log("TEMP_LOCAL_FOLDER", TEMP_LOCAL_FOLDER);
    // const filePathSplit = filePath.split("/");
    // console.log("filePathSplit", filePathSplit);
    // const fileName = filePathSplit.pop() || "";
    // console.log("fileName", fileName);
    // const fileNameSplit = fileName.split(".");
    // console.log("fileNameSplit", fileNameSplit);
    // const baseFileName = fileNameSplit.join(".");
    // console.log("baseFileName", baseFileName);
    // const fileDir =
    //   filePathSplit.join("/") +
    //   "/thumbnails" +
    //   (filePathSplit.length > 0 ? "/" : "");
    // const ThumbnailFilePath = `${fileDir}${baseFileName.replace(
    //   ".mp4",
    //   ""
    // )}-thumbnail.jpeg`;
    // console.log("fileDir", fileDir);
    // const tempLocalDir = `${TEMP_LOCAL_FOLDER}${fileDir}`;
    // console.log("tempLocalDir", tempLocalDir);
    // const tempLocalFile = `${tempLocalDir}${fileName}`;
    // console.log("tempLocalFile", tempLocalFile);

    const TEMP_LOCAL_FOLDER = "/tmp/thumbnails";
    const TEMP_LOCAL_FILE = `${TEMP_LOCAL_FOLDER}/original-${assetID}.mp4`;
    const TARGET_THUMBNAIL_FILENAME = `thumbnail-${assetID}.jpeg`;

    console.log("TEMP_LOCAL_FOLDER", TEMP_LOCAL_FOLDER);
    console.log("TEMP_LOCAL_FILE", TEMP_LOCAL_FILE);
    console.log("TARGET_THUMBNAIL_FILENAME", TARGET_THUMBNAIL_FILENAME);

    const BUCKET_FILE_ROUTE = filePath.replace(
      `${assetID}.mp4`,
      TARGET_THUMBNAIL_FILENAME
    );

    // Make the temp directory
    await mkdirp(TEMP_LOCAL_FOLDER);
    // Download item from bucket
    const gbucket = Storage_GCP.bucket(config.FIREBASE.storageBucket);
    await gbucket.file(filePath).download({ destination: TEMP_LOCAL_FILE });

    // Create the screenshot
    ffmpeg({ source: TEMP_LOCAL_FILE })
      .screenshot({
        count: 1,
        filename: TARGET_THUMBNAIL_FILENAME,
        folder: TEMP_LOCAL_FOLDER,
      })
      .on("end", async () => {
        fs.readdir(TEMP_LOCAL_FOLDER, (err, files) => {
          files.forEach((file) => {
            console.log(file);
          });
        });

        const file = await gbucket.upload(
          `${TEMP_LOCAL_FOLDER}/${TARGET_THUMBNAIL_FILENAME}`,
          {
            destination: BUCKET_FILE_ROUTE,
          }
        );
        if (file[0]) {
          file[0].makePublic();
        }

        console.log("Thumbnail jpeg uploaded at", BUCKET_FILE_ROUTE);
      })
      .on("error", (err) => {
        console.log("error", err);
        console.log("---- error occurred");
      });
    return jobId;
  }
);

// `https://firebasestorage.googleapis.com/v0/b/${config.FIREBASE.storageBucket}/o/users/${userID}/story/video/${assetID}/thumbnails/${assetID}-thumbnail.jpeg?alt=media`;
