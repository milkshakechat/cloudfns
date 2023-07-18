# GCP IAM

Make sure you give GCP service account `dairyfarm` permission to manage Firebase. Create a new IAM permission in GCP with:


```
Principle:
- dairyfarm-sockets-server@milkshake-dev-faf77.iam.gserviceaccount.com

Roles:
- Firebase Admin
- Firestore Service Agent
```