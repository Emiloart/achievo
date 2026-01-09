/**
 * Metrics interceptor for HTTP request timing and status counts.
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { finalize } from "rxjs";
import { MetricsService } from "../../metrics/metrics.service";

@Injectable()
/** Records HTTP request metrics for the metrics registry. */
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    const start = Date.now();
    const method = req?.method || "UNKNOWN";
    const baseUrl = req?.baseUrl || "";
    const path = req?.route?.path || req?.originalUrl || req?.url || "unknown";
    const route = `${baseUrl}${path}`;

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - start;
        const statusCode = res?.statusCode || 0;
        this.metrics.recordHttpRequest(method, route, statusCode, durationMs);
      }),
    );
  }
}
