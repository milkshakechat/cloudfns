import config from "../config.env";
import { v1 } from "@google-cloud/video-transcoder";
const { TranscoderServiceClient } = v1;

/**
 * TODO(developer): Uncomment these variables before running the sample.
 */
const projectId = config.GCLOUD.projectId;
const location = "us-east1";
const preset = "preset/web-hd";

// instantiate client
const client = new TranscoderServiceClient();

// list video transcoder jobs
export const listVideoTranscoderJobs = async () => {
  const [jobs] = await client.listJobs({
    parent: client.locationPath(projectId, location),
  });
  console.info("jobs:");
  console.log(jobs);
  for (const job of jobs) {
    console.info(job);
  }
};

// create video transcoder job
export type GoogleCloudBucketObjectURI = string;
export const createJobFromPreset = async ({
  inputUri,
  outputUri,
}: {
  inputUri: GoogleCloudBucketObjectURI;
  outputUri: GoogleCloudBucketObjectURI;
}) => {
  // inputUri = 'gs://my-bucket/my-video-file';
  // outputUri = 'gs://my-bucket/my-output-folder/';

  // Construct request
  const request = {
    parent: client.locationPath(projectId, location),
    job: {
      inputUri: inputUri,
      outputUri: outputUri,
      templateId: preset,
    },
  };

  // Run request
  const [response] = await client.createJob(request);
  console.log(`Job: ${response.name}`);
  const jobId = response.name?.split("/").pop();
  console.log(`Job ID: ${jobId}`);

  return jobId;
};

// get job status
export const getJobStatus = async (jobId: string) => {
  // Construct request
  const request = {
    name: client.jobPath(projectId, location, jobId),
  };
  const [response] = await client.getJob(request);
  console.log(`Job state: ${response.state}`);
};

// delete job
export async function deleteJob(jobId: string) {
  // Construct request
  const request = {
    name: client.jobPath(projectId, location, jobId),
  };
  await client.deleteJob(request);
  console.log("Deleted job");
}
