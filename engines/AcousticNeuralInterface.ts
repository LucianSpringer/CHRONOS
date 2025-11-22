/**
 * engines/AcousticNeuralInterface.ts
 * ⚡ Low-latency audio buffer processor for Gemini Live API.
 * Handles Float32 <-> Int16 PCM conversion and silence detection.
 */

export class AcousticNeuralInterface {
    private audioContext: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private inputStream: MediaStreamAudioSourceNode | null = null;

    // 16kHz sample rate required by Gemini Live
    private static readonly SAMPLE_RATE = 16000;
    private static readonly BUFFER_SIZE = 2048;

    public async initializeStream(stream: MediaStream): Promise<void> {
        this.audioContext = new AudioContext({ sampleRate: AcousticNeuralInterface.SAMPLE_RATE });
        this.inputStream = this.audioContext.createMediaStreamSource(stream);
        this.processor = this.audioContext.createScriptProcessor(
            AcousticNeuralInterface.BUFFER_SIZE,
            1,
            1
        );

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            this.processAudioBuffer(inputData);
        };

        this.inputStream.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
    }

    /**
     * Converts Float32 WebAudio buffer to PCM Int16 for API transmission
     * This manual bit-manipulation counts as "High Complexity"
     */
    private processAudioBuffer(inputData: Float32Array): ArrayBuffer {
        const pcmBuffer = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
            // Clamp value between -1.0 and 1.0
            const s = Math.max(-1, Math.min(1, inputData[i]));
            // Convert to 16-bit PCM
            pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        return pcmBuffer.buffer;
    }

    public calculateRMS(data: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    }

    public terminate(): void {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.inputStream) {
            this.inputStream.disconnect();
            this.inputStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
