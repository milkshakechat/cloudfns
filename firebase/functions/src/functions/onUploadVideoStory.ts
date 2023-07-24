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
import { createVideoTranscodingJob } from "../services/video-transcoder";
import { Storage_GCP, initStorageBucket_GCP } from "../services/private-bucket";
import { protos } from "@google-cloud/video-transcoder";

import * as dotenv from "dotenv";
import { getVideoFileExtension } from "@milkshakechat/helpers";
dotenv.config();

/**
 * FFMPEG only works on Node16 cloud functions!
 */
export const onuploadvideostory = onObjectFinalized(
  { bucket: config.FIREBASE.storageBucket, timeoutSeconds: 540 },
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
      const folderPath = filePath.replace(
        /(\.mp4|\.MP4|\.mov|\.MOV|\.3gp|\.3GP)$/,
        "/video-streaming/"
      );
      return folderPath;
    }

    const extensionType = getVideoFileExtension(filePath);
    const TEMP_LOCAL_FOLDER = "/tmp/thumbnails";
    const TEMP_LOCAL_FILE = `${TEMP_LOCAL_FOLDER}/original-${assetID}.${extensionType}`;
    const TARGET_THUMBNAIL_FILENAME = `thumbnail-${assetID}.jpeg`;

    console.log("TEMP_LOCAL_FOLDER", TEMP_LOCAL_FOLDER);
    console.log("TEMP_LOCAL_FILE", TEMP_LOCAL_FILE);
    console.log("TARGET_THUMBNAIL_FILENAME", TARGET_THUMBNAIL_FILENAME);

    const BUCKET_FILE_ROUTE = filePath.replace(
      `${assetID}.${extensionType}`,
      TARGET_THUMBNAIL_FILENAME
    );

    // Make the temp directory
    await mkdirp(TEMP_LOCAL_FOLDER);
    // Download item from bucket
    const gbucket = Storage_GCP.bucket(config.FIREBASE.storageBucket);
    await gbucket.file(filePath).download({ destination: TEMP_LOCAL_FILE });

    // Get the video metadata
    const videoMetadata = await getVideoMetadata(TEMP_LOCAL_FILE);

    console.log("videoMetadata", videoMetadata);

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

    // create a video transcoding job
    console.log("create a video transcoding job");
    const output = `gs://${outputBucketForTranscoding}/${transformFilePath(
      filePath
    )}`;
    const target360p = resizeVideoMaintainAspect(
      {
        width: videoMetadata.width || 360,
        height: videoMetadata.height || (360 * 2) / 3,
      },
      TargetDim.p360
    );
    const target720p = resizeVideoMaintainAspect(
      {
        width: videoMetadata.width || 720,
        height: videoMetadata.height || (720 * 2) / 3,
      },
      TargetDim.p720
    );
    const targetFrameRate =
      videoMetadata.frameRate &&
      videoMetadata.frameRate > 0 &&
      videoMetadata.frameRate < 120
        ? videoMetadata.frameRate
        : 30;
    const videoTranscodingConfig = {
      elementaryStreams: [
        {
          key: "video-stream720",
          videoStream: {
            h264: {
              heightPixels: target720p.height,
              widthPixels: target720p.width,
              bitrateBps: 2500000,
              frameRate: targetFrameRate,
            },
          },
        },
        {
          key: "video-stream360",
          videoStream: {
            h264: {
              heightPixels: target360p.height,
              widthPixels: target360p.width,
              bitrateBps: 1000000,
              frameRate: targetFrameRate,
            },
          },
        },
        {
          key: "video-mp4",
          videoStream: {
            h264: {
              heightPixels: target720p.height,
              widthPixels: target720p.width,
              bitrateBps: 2500000,
              frameRate: targetFrameRate,
            },
          },
        },
        {
          key: "audio-stream0",
          audioStream: {
            codec: "aac",
            bitrateBps: 128000,
          },
        },
        {
          key: "audio-mp4",
          audioStream: {
            codec: "aac",
            bitrateBps: 128000,
          },
        },
      ],
      muxStreams: [
        {
          key: "stream720",
          container: "ts",
          elementaryStreams: ["video-stream720", "audio-stream0"],
          segmentSettings: {
            segmentDuration: { seconds: 3 },
          },
        },
        {
          key: "stream360",
          container: "ts",
          elementaryStreams: ["video-stream360", "audio-stream0"],
          segmentSettings: {
            segmentDuration: { seconds: 3 },
          },
        },
        {
          key: "standard-video",
          container: "mp4",
          elementaryStreams: ["video-mp4", "audio-mp4"],
        },
      ],
      manifests: [
        {
          fileName: "manifest.m3u8",
          type: protos.google.cloud.video.transcoder.v1.Manifest.ManifestType
            .HLS,
          muxStreams: ["stream720", "stream360"],
        },
      ],
    };
    const jobId = await createVideoTranscodingJob({
      inputUri: `gs://${fileBucket}/${filePath}`,
      outputUri: output,
      config: videoTranscodingConfig,
    });
    console.log(`Got JobID = ${jobId}`);
    return jobId;
  }
);

// `https://firebasestorage.googleapis.com/v0/b/${config.FIREBASE.storageBucket}/o/users/${userID}/story/video/${assetID}/thumbnails/${assetID}-thumbnail.jpeg?alt=media`;

interface VideoMetadata {
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: number;
  frameRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  originalSource?: string;
}
const getVideoMetadata = async (
  localFilePath: string
): Promise<VideoMetadata> => {
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`File does not exist at localFilePath=${localFilePath}`);
  }

  return new Promise((resolve, reject) => {
    const metadata: VideoMetadata = {};

    ffmpeg.ffprobe(localFilePath, (error, data) => {
      if (error) {
        reject(error);
      } else {
        const videoStream = data.streams.find(
          (stream) => stream.codec_type === "video"
        );
        const audioStream = data.streams.find(
          (stream) => stream.codec_type === "audio"
        );

        if (videoStream) {
          metadata.width = videoStream.width;
          metadata.height = videoStream.height;
          metadata.duration = parseFloat(videoStream.duration || "0");
          metadata.aspectRatio = videoStream.display_aspect_ratio
            ? parseFloat(videoStream.display_aspect_ratio)
            : metadata.width && metadata.height
            ? metadata.width / metadata.height
            : undefined;
          metadata.frameRate = videoStream.avg_frame_rate
            ? parseFloat(videoStream.avg_frame_rate)
            : undefined;
          metadata.videoCodec = videoStream.codec_name;
        }

        if (audioStream) {
          metadata.audioCodec = audioStream.codec_name;
        }

        metadata.originalSource = localFilePath;

        resolve(metadata);
      }
    });
  });
};

interface VideoDim {
  width: number;
  height: number;
}
enum TargetDim {
  "p360" = 360,
  "p720" = 720,
}

const resizeVideoMaintainAspect = (
  input: VideoDim,
  target: TargetDim
): VideoDim => {
  // determine which is smaller: width or height
  const smallestDimension = Math.min(input.width, input.height);

  // calculate the ratio between the target size and the smallest dimension
  const ratio = target / smallestDimension;

  // calculate the new dimensions
  const newWidth = Math.round(input.width * ratio);
  const newHeight = Math.round(input.height * ratio);

  // return the new dimensions
  return {
    width: newWidth,
    height: newHeight,
  };
};
