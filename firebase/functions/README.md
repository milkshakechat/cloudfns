# Deployment with Env

Unfort Firebase deploy [doesnt have an easy way](https://github.com/firebase/firebase-tools/issues/5936#issuecomment-1612672434) to add build env vars. Thus we need this manual fix.

Any function that relies on listening to a bucket per env, gcloud resource per env, or etc must require manual updating of the build target.

```ts
// onUploadVideoStory.ts
const _NODE_ENV = BUILD_ENV_TARGET.PRODUCTION;

export const onuploadvideostory = onObjectFinalized(
  {
    bucket: getFirebaseStorageBucketDeployment(_NODE_ENV),
    timeoutSeconds: 540,
  },
  async (event) => {
    // run code
  }
)
```