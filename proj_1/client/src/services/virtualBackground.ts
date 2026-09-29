import { SelfieSegmentation, Results } from "@mediapipe/selfie_segmentation";

export type BackgroundPreset = "none" | "blur" | "mint" | "sunset" | "lavender";

export interface ProcessedMedia {
  stream: MediaStream;
  dispose: () => void;
}

const drawBackground = (
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  preset: BackgroundPreset,
) => {
  const width = video.videoWidth;
  const height = video.videoHeight;
  context.save();

  if (preset === "blur") {
    context.filter = "blur(18px)";
    context.drawImage(video, -24, -24, width + 48, height + 48);
    context.restore();
    return;
  }

  const colors: Record<
    Exclude<BackgroundPreset, "none" | "blur">,
    [string, string]
  > = {
    mint: ["#123b3a", "#80b7a2"],
    sunset: ["#4b263d", "#e8a36d"],
    lavender: ["#2d3155", "#a79bd4"],
  };
  const gradient = context.createLinearGradient(0, 0, width, height);
  const [start, end] = colors[preset as keyof typeof colors];
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
};

export const createVirtualBackgroundStream = async (
  sourceStream: MediaStream,
  preset: Exclude<BackgroundPreset, "none">,
): Promise<ProcessedMedia> => {
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = sourceStream;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error("Không thể đọc video camera để áp dụng nền."));
  });
  await video.play();

  const canvas = document.createElement("canvas");
  const outputContext = canvas.getContext("2d");
  const maskCanvas = document.createElement("canvas");
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  const foregroundCanvas = document.createElement("canvas");
  const foregroundContext = foregroundCanvas.getContext("2d");
  if (!outputContext || !maskContext || !foregroundContext) {
    throw new Error("Trình duyệt không hỗ trợ xử lý nền video.");
  }

  const segmenter = new SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
  });
  segmenter.setOptions({ modelSelection: 1, selfieMode: false });

  let active = true;
  let processing = false;
  const renderResults = (results: Results) => {
    const width =
      results.image instanceof HTMLVideoElement
        ? results.image.videoWidth
        : video.videoWidth;
    const height =
      results.image instanceof HTMLVideoElement
        ? results.image.videoHeight
        : video.videoHeight;
    if (!width || !height) return;

    canvas.width = maskCanvas.width = foregroundCanvas.width = width;
    canvas.height = maskCanvas.height = foregroundCanvas.height = height;
    maskContext.clearRect(0, 0, width, height);
    maskContext.drawImage(results.segmentationMask, 0, 0, width, height);
    const mask = maskContext.getImageData(0, 0, width, height);
    for (let offset = 0; offset < mask.data.length; offset += 4) {
      const confidence = mask.data[offset];
      mask.data[offset] = 255;
      mask.data[offset + 1] = 255;
      mask.data[offset + 2] = 255;
      mask.data[offset + 3] = confidence;
    }
    maskContext.putImageData(mask, 0, 0);

    foregroundContext.clearRect(0, 0, width, height);
    foregroundContext.drawImage(results.image, 0, 0, width, height);
    foregroundContext.globalCompositeOperation = "destination-in";
    foregroundContext.drawImage(maskCanvas, 0, 0);
    foregroundContext.globalCompositeOperation = "source-over";

    outputContext.clearRect(0, 0, width, height);
    drawBackground(outputContext, video, preset);
    outputContext.drawImage(foregroundCanvas, 0, 0);
  };

  segmenter.onResults(renderResults);
  try {
    await segmenter.initialize();
  } catch (error) {
    await segmenter.close();
    throw error;
  }

  const timerId = window.setInterval(() => {
    if (
      !active ||
      processing ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    )
      return;
    processing = true;
    void segmenter
      .send({ image: video })
      .catch((error: unknown) =>
        console.error("Background segmentation failed:", error),
      )
      .finally(() => {
        processing = false;
      });
  }, 1000 / 20);

  const outputStream = canvas.captureStream(20);
  const combinedStream = new MediaStream([
    ...outputStream.getVideoTracks(),
    ...sourceStream.getAudioTracks(),
  ]);

  return {
    stream: combinedStream,
    dispose: () => {
      active = false;
      window.clearInterval(timerId);
      void segmenter.close();
      video.pause();
      video.srcObject = null;
      outputStream.getTracks().forEach((track) => track.stop());
    },
  };
};
