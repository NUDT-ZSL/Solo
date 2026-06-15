class RecordingProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.chunkCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length === 0) return true;

    const channelData = input[0];
    if (!channelData) return true;

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      if (this.bufferIndex >= this.bufferSize) {
        const chunk = new Float32Array(this.buffer);
        this.port.postMessage({
          type: 'chunk',
          samples: chunk.buffer,
          index: this.chunkCount++,
        }, [chunk.buffer]);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('recording-processor', RecordingProcessor);
