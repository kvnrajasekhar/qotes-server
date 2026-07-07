"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPrometheus =
  exports.getMetricsSnapshot =
  exports.observeRequest =
    void 0;
const metrics = {
  startedAt: Date.now(),
  requestsTotal: 0,
  responsesByStatus: {},
  responsesByRoute: {},
  totalResponseTimeMs: 0,
};
const observeRequest = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const statusFamily = `${Math.floor(res.statusCode / 100)}xx`;
    const route = req.route ? req.route.path : req.path;
    const routeKey = `${req.method} ${route}`;
    metrics.requestsTotal += 1;
    metrics.totalResponseTimeMs += durationMs;
    metrics.responsesByStatus[statusFamily] =
      (metrics.responsesByStatus[statusFamily] || 0) + 1;
    metrics.responsesByRoute[routeKey] =
      (metrics.responsesByRoute[routeKey] || 0) + 1;
  });
  next();
};
exports.observeRequest = observeRequest;
const getMetricsSnapshot = () => {
  const memory = process.memoryUsage();
  return {
    service: "qotes-api",
    uptimeSeconds: process.uptime(),
    startedAt: new Date(metrics.startedAt).toISOString(),
    requestsTotal: metrics.requestsTotal,
    averageResponseTimeMs: metrics.requestsTotal
      ? Number((metrics.totalResponseTimeMs / metrics.requestsTotal).toFixed(2))
      : 0,
    responsesByStatus: metrics.responsesByStatus,
    responsesByRoute: metrics.responsesByRoute,
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
  };
};
exports.getMetricsSnapshot = getMetricsSnapshot;
const toPrometheus = (snapshot) => {
  const lines = [
    "# HELP qotes_process_uptime_seconds Process uptime in seconds.",
    "# TYPE qotes_process_uptime_seconds gauge",
    `qotes_process_uptime_seconds ${snapshot.uptimeSeconds}`,
    "# HELP qotes_http_requests_total Total HTTP requests handled by the API.",
    "# TYPE qotes_http_requests_total counter",
    `qotes_http_requests_total ${snapshot.requestsTotal}`,
    "# HELP qotes_http_average_response_time_ms Average response time in milliseconds.",
    "# TYPE qotes_http_average_response_time_ms gauge",
    `qotes_http_average_response_time_ms ${snapshot.averageResponseTimeMs}`,
    "# HELP qotes_process_memory_bytes Process memory usage in bytes.",
    "# TYPE qotes_process_memory_bytes gauge",
    `qotes_process_memory_bytes{type="rss"} ${snapshot.memory.rss}`,
    `qotes_process_memory_bytes{type="heap_total"} ${snapshot.memory.heapTotal}`,
    `qotes_process_memory_bytes{type="heap_used"} ${snapshot.memory.heapUsed}`,
    `qotes_process_memory_bytes{type="external"} ${snapshot.memory.external}`,
    "# HELP qotes_http_responses_total Total HTTP responses grouped by status family.",
    "# TYPE qotes_http_responses_total counter",
  ];
  Object.entries(snapshot.responsesByStatus).forEach(
    ([statusFamily, count]) => {
      lines.push(
        `qotes_http_responses_total{status_family="${statusFamily}"} ${count}`,
      );
    },
  );
  lines.push(
    "# HELP qotes_http_route_requests_total Total HTTP requests grouped by method and route.",
    "# TYPE qotes_http_route_requests_total counter",
  );
  Object.entries(snapshot.responsesByRoute).forEach(([route, count]) => {
    lines.push(`qotes_http_route_requests_total{route="${route}"} ${count}`);
  });
  return `${lines.join("\n")}\n`;
};
exports.toPrometheus = toPrometheus;
//# sourceMappingURL=metrics.js.map
