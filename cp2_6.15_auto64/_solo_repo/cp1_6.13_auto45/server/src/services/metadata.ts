import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
  codec: string;
}

export function extractMetadata(filePath: string): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) {
        reject(new Error('No audio stream found'));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        sampleRate: audioStream.sample_rate ? parseInt(audioStream.sample_rate as string) : 0,
        channels: audioStream.channels || 0,
        bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate as string) : 0,
        codec: audioStream.codec_name || 'unknown'
      });
    });
  });
}
