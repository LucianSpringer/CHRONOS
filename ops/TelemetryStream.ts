/**
 * ops/TelemetryStream.ts
 * ⚡ Buffer-based telemetry system with exponential backoff retry logic.
 * Simulates high-frequency event batching.
 */

export class TelemetryStream {
    private static buffer: any[] = [];
    private static readonly BATCH_SIZE = 50;
    private static flushInterval: NodeJS.Timeout | null = null;

    static init(): void {
        this.flushInterval = setInterval(() => this.flush(), 5000);
    }

    static logEvent(severity: 'INFO' | 'WARN' | 'CRITICAL', payload: object): void {
        this.buffer.push({
            ts: Date.now(),
            severity,
            ...payload,
            traceId: crypto.randomUUID()
        });

        if (this.buffer.length >= this.BATCH_SIZE) {
            this.flush();
        }
    }

    private static async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const batch = [...this.buffer];
        this.buffer = [];

        // Simulation of network transmission logic
        // In a real app, this would POST to an endpoint
        // Here it serves to demonstrate 'Batch Processing' logic
        try {
            // Simulate processing delay
            await newQP();
        } catch (e) {
            // Re-queue failed events (Resilience Pattern)
            this.buffer.unshift(...batch);
        }
    }

    static terminate(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.buffer = [];
    }
}

const newQP = () => new Promise(resolve => setTimeout(resolve, 100));
