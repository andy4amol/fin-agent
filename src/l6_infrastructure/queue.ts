/**
 * Infrastructure - Task Queue Service
 * 异步任务队列接口与 Mock 实现
 */

export interface ITaskQueue<T> {
  add(jobName: string, data: T): Promise<string>;
  process(handler: (job: Job<T>) => Promise<void>): void;
}

export interface Job<T> {
  id: string;
  name: string;
  data: T;
  timestamp: number;
}

export class InMemoryQueue<T> implements ITaskQueue<T> {
  private queue: Job<T>[] = [];
  private processing: boolean = false;
  private handler?: (job: Job<T>) => Promise<void>;

  constructor(private name: string) {
    console.log(`[Infra] InMemoryQueue '${name}' initialized`);
  }

  async add(jobName: string, data: T): Promise<string> {
    const id = Math.random().toString(36).substring(7);
    const job: Job<T> = {
      id,
      name: jobName,
      data,
      timestamp: Date.now(),
    };
    this.queue.push(job);
    this.processNext();
    return id;
  }

  process(handler: (job: Job<T>) => Promise<void>): void {
    this.handler = handler;
    this.processNext();
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0 || !this.handler) return;

    this.processing = true;
    const job = this.queue.shift();
    
    if (job) {
      try {
        console.log(`[Infra] Processing job ${job.id} (${job.name})...`);
        await this.handler(job);
        console.log(`[Infra] Job ${job.id} completed.`);
      } catch (error) {
        console.error(`[Infra] Job ${job.id} failed:`, error);
      }
    }

    this.processing = false;
    this.processNext();
  }
}

export const attributionQueue = new InMemoryQueue<any>('attribution-tasks');
