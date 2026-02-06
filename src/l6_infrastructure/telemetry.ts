/**
 * Infrastructure - Telemetry (OpenTelemetry Mock)
 * 全链路追踪与监控接口
 */

export interface Span {
  end(): void;
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(error: Error): void;
}

export interface Tracer {
  startSpan(name: string): Span;
}

export class MockTracer implements Tracer {
  startSpan(name: string): Span {
    const startTime = Date.now();
    console.log(`[Trace] Start Span: ${name}`);
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        console.log(`[Trace] End Span: ${name} (${duration}ms)`);
      },
      setAttribute: (key, value) => {
        // console.log(`[Trace] Set Attribute: ${key}=${value}`);
      },
      recordException: (error) => {
        console.error(`[Trace] Exception in ${name}:`, error);
      }
    };
  }
}

export const tracer = new MockTracer();

export function trace(operationName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const span = tracer.startSpan(operationName);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}
