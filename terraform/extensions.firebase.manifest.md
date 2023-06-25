# Firebase Extensions Manifest
A manual note of installed Firebase extensions.

## Storage Resize Images
[Offical Docs](https://extensions.dev/extensions/firebase/storage-resize-images).
Config:

- `yes` Make resized images public (Optional) 
- `resized-media` Cloud Storage path for resized images (Optional)
- Resize to dimensions (Optional)
```
200x200,768x768
```
- Paths that contain images you want to resize (Optional)
```
/users/*/avatars,/users/*/story/IMAGE
```
- `jpeg` Convert image to preferred types
- `yes` GIF and WEBP animated option (Optional)

## Distributed Counter
[Offical Docs](https://extensions.dev/extensions/firebase/firestore-counter).