import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const SEGMENT_SECONDS = 300;
const FFMPEG_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export async function splitAudio(file, onProgress) {
  const ffmpeg = new FFmpeg();
  const extension = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".audio";
  const input = `input${extension}`;
  const outputPrefix = "part-";
  const outputExt = ".wav";
  const outputs = [];

  ffmpeg.on("progress", ({ progress }) => onProgress?.(progress));
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${FFMPEG_BASE}/ffmpeg-core.js`,
        "text/javascript",
      ),
      wasmURL: await toBlobURL(
        `${FFMPEG_BASE}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });
    await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    const exitCode = await ffmpeg.exec([
      "-i",
      input,
      "-f",
      "segment",
      "-segment_time",
      String(SEGMENT_SECONDS),
      "-reset_timestamps",
      "1",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      `${outputPrefix}%03d${outputExt}`,
    ]);
    if (exitCode !== 0)
      throw new Error(
        "Audio tidak dapat dipotong. Coba format MP3, M4A, atau WAV.",
      );

    for (let index = 0; index < 1000; index += 1) {
      const name = `${outputPrefix}${String(index).padStart(3, "0")}${outputExt}`;
      let bytes;
      try {
        bytes = await ffmpeg.readFile(name);
      } catch {
        break;
      }
      const blob = new Blob([bytes], { type: "audio/wav" });
      if (blob.size > 24 * 1024 * 1024)
        throw new Error("Segmen audio masih terlalu besar.");
      outputs.push({
        file: new File([blob], name, { type: "audio/wav" }),
        offset: index * SEGMENT_SECONDS,
      });
    }

    if (!outputs.length)
      throw new Error("Tidak ada audio yang berhasil dipotong.");
    return outputs;
  } finally {
    ffmpeg.terminate();
  }
}
