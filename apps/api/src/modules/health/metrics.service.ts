import { Injectable } from "@nestjs/common";

interface HttpMetricRecord {
  method: string;
  route: string;
  status: number;
  durationMs: number;
}

@Injectable()
export class MetricsService {
  private readonly startTime = Date.now();
  private readonly records: HttpMetricRecord[] = [];
  private readonly maxRecords = 1000;

  /**
   * Records an HTTP transaction for metrics aggregation.
   */
  public recordHttpRequest(
    method: string,
    route: string,
    status: number,
    durationMs: number
  ): void {
    if (this.records.length >= this.maxRecords) {
      this.records.shift();
    }
    this.records.push({ method, route, status, durationMs });
  }

  /**
   * Resets recorded metrics (useful for testing).
   */
  public resetMetrics(): void {
    this.records.length = 0;
  }

  /**
   * Generates standard Prometheus text exposition format (version 0.0.4).
   */
  public formatPrometheusMetrics(): string {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptime = (Date.now() - this.startTime) / 1000;

    const lines: string[] = [
      "# HELP process_uptime_seconds The process uptime in seconds.",
      "# TYPE process_uptime_seconds gauge",
      `process_uptime_seconds ${uptime.toFixed(3)}`,
      "",
      "# HELP process_resident_memory_bytes Resident memory size in bytes.",
      "# TYPE process_resident_memory_bytes gauge",
      `process_resident_memory_bytes ${mem.rss}`,
      "",
      "# HELP process_heap_bytes Process heap size in bytes.",
      "# TYPE process_heap_bytes gauge",
      `process_heap_bytes ${mem.heapTotal}`,
      "",
      "# HELP process_heap_used_bytes Process heap used in bytes.",
      "# TYPE process_heap_used_bytes gauge",
      `process_heap_used_bytes ${mem.heapUsed}`,
      "",
      "# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.",
      "# TYPE process_cpu_seconds_total counter",
      `process_cpu_seconds_total ${(cpu.user / 1e6 + cpu.system / 1e6).toFixed(3)}`,
      "",
    ];

    // Aggregate HTTP Requests by method, route, status
    const counts = new Map<string, number>();
    const durations: number[] = [];

    for (const r of this.records) {
      durations.push(r.durationMs);
      const key = `method="${r.method}",route="${r.route}",status="${r.status}"`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    lines.push("# HELP http_requests_total Total number of HTTP requests processed.");
    lines.push("# TYPE http_requests_total counter");
    if (counts.size === 0) {
      lines.push('http_requests_total{method="GET",route="/health/live",status="200"} 0');
    } else {
      for (const [labels, count] of counts.entries()) {
        lines.push(`http_requests_total{${labels}} ${count}`);
      }
    }
    lines.push("");

    // Calculate p95 latency if records exist
    let p95Latency = 0;
    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      const index = Math.ceil(0.95 * durations.length) - 1;
      p95Latency = durations[Math.max(0, index)];
    }

    lines.push("# HELP http_request_duration_ms_p95 95th percentile latency of HTTP requests in milliseconds.");
    lines.push("# TYPE http_request_duration_ms_p95 gauge");
    lines.push(`http_request_duration_ms_p95 ${p95Latency.toFixed(2)}`);
    lines.push("");

    return lines.join("\n");
  }
}
