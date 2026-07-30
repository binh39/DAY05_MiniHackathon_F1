import { GoogleAuth } from "google-auth-library";
import type { JobRunner } from "./job-runner.js";

export interface JobDispatcher {
  dispatch(jobId: string): Promise<void>;
}

export function localJobDispatcher(runner: JobRunner): JobDispatcher {
  return {
    async dispatch(jobId) {
      runner.enqueue(jobId);
    },
  };
}

export function cloudRunJobDispatcher(options: {
  projectId: string;
  region: string;
  jobName: string;
}): JobDispatcher {
  const auth = new GoogleAuth({
    projectId: options.projectId,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return {
    async dispatch(jobId) {
      const client = await auth.getClient();
      await client.request({
        url:
          `https://run.googleapis.com/v2/projects/${encodeURIComponent(options.projectId)}` +
          `/locations/${encodeURIComponent(options.region)}/jobs/` +
          `${encodeURIComponent(options.jobName)}:run`,
        method: "POST",
        data: {
          overrides: {
            containerOverrides: [
              {
                env: [{ name: "PIPELINE_JOB_ID", value: jobId }],
              },
            ],
          },
        },
      });
    },
  };
}
