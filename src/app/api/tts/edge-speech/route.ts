// @ts-ignore
import { EdgeSpeechPayload, createEdgeSpeechComletion } from '@lobehub/tts/server';

export const runtime = 'edge';

export const POST = async (req: Request) => {
  const payload = (await req.json()) as EdgeSpeechPayload;
  const res = await createEdgeSpeechComletion({ payload });
  return res;
};