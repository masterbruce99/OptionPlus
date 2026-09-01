export type DownloadJobStatus = 'REQUESTED' | 'DOWNLOADING' | 'VALIDATING' | 'CACHED' | 'FAILED' | 'PARTIAL';

export interface DownloadJob {
  id: string;
  status: DownloadJobStatus;
  progress: number;
  message: string;
}

export class HistoricalDownloadManager {
  private static instance: HistoricalDownloadManager;
  private jobs: Map<string, DownloadJob> = new Map();
  
  // Rate limiting simulation config
  private currentRequests = 0;
  private readonly maxConcurrentRequests = 5;

  private constructor() {}

  static getInstance(): HistoricalDownloadManager {
    if (!this.instance) {
      this.instance = new HistoricalDownloadManager();
    }
    return this.instance;
  }

  createJob(id: string): DownloadJob {
    const job: DownloadJob = {
      id,
      status: 'REQUESTED',
      progress: 0,
      message: 'Job requested and waiting in queue.'
    };
    this.jobs.set(id, job);
    return job;
  }

  updateJob(id: string, status: DownloadJobStatus, progress: number, message: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.message = message;
    }
  }

  getJob(id: string): DownloadJob | null {
    return this.jobs.get(id) || null;
  }

  /**
   * Helper to execute a provider fetch with exponential backoff and rate limiting.
   */
  async executeWithBackoff<T>(fetcher: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      if (this.currentRequests >= this.maxConcurrentRequests) {
        // Simple backoff if rate limit hit locally
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
        attempt++;
        continue;
      }

      this.currentRequests++;
      try {
        const result = await fetcher();
        this.currentRequests--;
        return result;
      } catch (error) {
        this.currentRequests--;
        
        // 429 Too Many Requests
        if (typeof error === 'object' && error !== null && 'status' in error && (error as {status: number}).status === 429) {
          attempt++;
          await new Promise(res => setTimeout(res, 2000 * Math.pow(2, attempt)));
        } else {
          throw error; // Fail immediately on non-rate-limit errors
        }
      }
    }
    
    throw new Error('Max retries exceeded for historical download request.');
  }
}
