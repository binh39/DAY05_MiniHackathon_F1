import { GoogleAuth } from "google-auth-library";

interface SynthesizeResponse {
  audioContent?: string;
}

interface ListVoicesResponse {
  voices?: Array<{
    name?: string;
    languageCodes?: string[];
    naturalSampleRateHertz?: number;
  }>;
}

export interface SpeechSynthesisRequest {
  ssml: string;
  languageCode: string;
  voiceId: string;
  speakingRate: number;
  sampleRateHertz: number;
}

export interface TtsAdapter {
  readonly provider: string;
  assertVoiceAvailable(
    languageCode: string,
    voiceId: string,
  ): Promise<void>;
  synthesize(request: SpeechSynthesisRequest): Promise<Buffer>;
}

export class GoogleCloudTtsAdapter implements TtsAdapter {
  readonly provider = "google-cloud-text-to-speech";
  private readonly auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  async assertVoiceAvailable(
    languageCode: string,
    voiceId: string,
  ): Promise<void> {
    const client = await this.auth.getClient();
    const response = await client.request<ListVoicesResponse>({
      url: "https://texttospeech.googleapis.com/v1/voices",
      method: "GET",
      params: { languageCode },
    });
    const names = new Set(
      (response.data.voices ?? [])
        .map((voice) => voice.name)
        .filter((name): name is string => Boolean(name)),
    );
    if (!names.has(voiceId)) {
      throw new Error(
        `Voice ${voiceId} không khả dụng cho ${languageCode}. Available: ${[...names].join(", ")}.`,
      );
    }
  }

  async synthesize(request: SpeechSynthesisRequest): Promise<Buffer> {
    const client = await this.auth.getClient();
    const response = await client.request<SynthesizeResponse>({
      url: "https://texttospeech.googleapis.com/v1/text:synthesize",
      method: "POST",
      data: {
        input: { ssml: request.ssml },
        voice: {
          languageCode: request.languageCode,
          name: request.voiceId,
        },
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: request.sampleRateHertz,
          speakingRate: request.speakingRate,
        },
      },
    });
    if (!response.data.audioContent) {
      throw new Error("Google Cloud TTS không trả audioContent.");
    }
    return Buffer.from(response.data.audioContent, "base64");
  }
}
