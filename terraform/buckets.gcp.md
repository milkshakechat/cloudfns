# Cloud Buckets

## default firebase storage bucket
bucket=`milkshake-dev-faf77.appspot.com`
```
GCP bucket for user avatars & file upload
```
Permissions:
- `cloudfns.serviceAccount` can read & write this bucket

## user-stories-social
bucket=`user-stories-social`
```
GCP bucket for user media, such as images and videos. social media
```
Permissions:
- `cloudfns.serviceAccount` can admin this bucket (should be create/read only)
- `fine grained` access control
- `asia-northeast1 (Tokyo)` location
- `allow public` view access (this needs to be private by migrating to GCP MediaCDN. Unfort we cant use firebase storage for this because it doesnt support signed url for an entire folder, which is needed for HLS video streaming. so our temporary solution is to allow public, which is bad because anyone can view a private video if they know the url. as a less optimal patch, we can make the manifest file private & return signed url for it. but ultimately we need to migrate to GCP MediaCDN)
- `cors enabled` by running the below script
```sh
# sample reference
$ gcloud storage buckets update gs://BUCKET_NAME --cors-file=CORS_CONFIG_FILE

# actual code to run
$ cd terraform
$ gcloud storage buckets update gs://user-stories-social --cors-file=user-story-socials.storage-cors.dev.json
```
