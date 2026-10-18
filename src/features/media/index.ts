// Browser-only media pipeline: frames from video, photo compression, AI photos,
// and where photos are stored. Swap points are documented in each file.
export { generateProductPhoto } from "./generate";
export { squarePhoto, urlToBlob } from "./image";
export { removeImage, saveProductImage, saveStoreLogo, saveStorePaymentQr, type PhotoOwner } from "./storage";
export { shrinkVideo } from "./shrink";
export { useObjectUrl } from "./useObjectUrl";
export { captureFrames, videoDuration } from "./video";
