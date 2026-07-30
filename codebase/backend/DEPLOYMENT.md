# Production deployment

## Live resources

- Project: `project-5d300c02-d165-4037-b6f`
- Region: `asia-southeast1`
- Artifact Registry: `ai-lecture-video`
- Image: `asia-southeast1-docker.pkg.dev/project-5d300c02-d165-4037-b6f/ai-lecture-video/backend:c2230b143e76-manual-20260731-r3`
- Cloud Run API: `lecture-api`
- API URL: `https://lecture-api-wadxcpoeza-as.a.run.app`
- Cloud Run Job: `lecture-worker`
- Firebase Hosting: `https://project-5d300c02-d165-4037-b6f.web.app`
- Firestore: `(default)`, `asia-southeast1`
- Storage: `project-5d300c02-d165-4037-b6f.firebasestorage.app`, `asia-southeast1`

## Runtime identities

- API: `lecture-api@project-5d300c02-d165-4037-b6f.iam.gserviceaccount.com`
  - Firestore user, Storage object user, Vertex AI user (Module 7 summary)
    and Service Usage consumer.
  - Custom role `lectureJobDispatcher` containing only
    `run.jobs.run` and `run.jobs.runWithOverrides`.
- Worker: `lecture-worker@project-5d300c02-d165-4037-b6f.iam.gserviceaccount.com`
  - Firestore user, Storage object user, Vertex AI user and Service Usage consumer.

Neither runtime account has Owner or Editor. No service-account JSON key is
stored in the repository or container.

## Runtime sizing

- API: 1 CPU, 1 GiB, concurrency 20, timeout 120 seconds, min 0, max 3.
- Worker: 4 CPU, 8 GiB, timeout 90 minutes, one task per execution,
  parallelism 1 and one retry.

## Release procedure

1. Run `npm test` in `codebase/backend`.
2. Build and smoke-test the Docker image locally.
3. Push an immutable image tag to Artifact Registry.
4. Update `lecture-worker` first, then deploy a new `lecture-api` revision.
5. Set `VITE_API_BASE_URL`, build `codebase/frontend`, then deploy with
   `firebase.hosting.json` from the repository root.
6. Verify API health, unauthenticated rejection, Hosting CORS and a temporary
   Firebase-user PDF smoke job. Remove the smoke job and test user afterward.

Run `npm run smoke:public-ui` in `codebase/frontend` to validate the deployed
login, document library, protected PDF viewer and Gemini summary in headless
Chrome. The script uses a temporary Firebase account and deletes its job and
account in cleanup.

Production smoke validation completed successfully:

- `lecture-worker-jnfv5`: document-only, 29.75 seconds.
- `lecture-worker-mhrhp`: document analysis and lecture plan, 49.8 seconds.
- `lecture-worker-fwfck`: script through MP4 composition, 1 minute 35.69 seconds.
- Final artifact: 50.19 seconds, H.264 1920×1080 with AAC audio.

The test Firestore jobs, Storage objects and temporary Firebase accounts were
deleted afterward.

Revision `lecture-api-00003-s5v` fixes stale local run-directory caches. API
artifact readers now verify their required files and re-sync from Cloud Storage
when a worker has produced newer artifacts, including `02_lecture_plan.json`.
