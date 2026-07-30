import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { GoogleCloudTtsAdapter } from "../modules/module5b_voice_generator/google-tts-adapter.js";
import { buildSceneSsml } from "../modules/module5b_voice_generator/ssml-builder.js";
import { parseWav } from "../modules/module5b_voice_generator/wav.js";

const projectDirectory = process.cwd();
const config = await loadConfig("config.lecture-02.json", projectDirectory);
const adapter = new GoogleCloudTtsAdapter();
await adapter.assertVoiceAvailable("vi-VN", config.voice.voice_id);
const { ssml } = buildSceneSsml(
  "Chào bạn. Đây là bản kiểm tra giọng đọc tiếng Việt cho bài giảng AI.",
  "GROUNDED_CLAIM",
  [],
);
const audio = await adapter.synthesize({
  ssml,
  languageCode: "vi-VN",
  voiceId: config.voice.voice_id,
  speakingRate: config.voice.speaking_rate,
  sampleRateHertz: 24_000,
});
const metadata = parseWav(audio);
const outputDirectory = path.join(projectDirectory, "eval", "voice-smoke");
await mkdir(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "vi-VN-Neural2-A.wav");
await writeFile(outputPath, audio);
process.stdout.write(
  `${path.relative(projectDirectory, outputPath)} | ${metadata.durationSeconds.toFixed(2)}s | ${metadata.sampleRateHertz}Hz\n`,
);
