# @loke/logger

[![NPM Version](https://img.shields.io/npm/v/@loke/logger.svg)](https://www.npmjs.com/package/@loke/logger)

A structured [logfmt](https://brandur.org/logfmt) logger for LOKE applications. Outputs to console and optionally syslog.

## Output format

All log lines are emitted as logfmt key=value pairs:

```
level=info msg="server started" port=3000
level=error domain=http-server msg="request failed" status=500 error="Error: timeout"
level=debug domain=payments msg=charge amount=4200 currency=aud
```

## Usage

```ts
import { createLogger, printf } from "@loke/logger";

const logger = createLogger();

logger.info("server started", { port: 3000 });
logger.warn("retrying", { attempt: 2, max: 5 });
logger.error(
  "request failed",
  { status: 500 },
  { error: new Error("timeout") },
);
```

Structured field objects merge from left to right. Later values win; null and undefined values, getters, invalid keys, and the reserved keys `level`, `domain`, and `msg` are omitted.

Logging methods return immediately. Slow outputs buffer pending logs in memory; there is no queue limit or automatic dropping.

### Scoped loggers

Use `withDomain` to create a child logger that adds `domain=<name>` to every line:

```ts
const httpLogger = logger.withDomain("http-server");

httpLogger.info("request received", { method: "GET", path: "/health" });
// → level=info domain=http-server msg="request received" method=GET path=/health
```

### Printf-style formatting

Import `printf` when you need to interpolate values into the message string:

```ts
import { createLogger, printf } from "@loke/logger";

logger.info(printf("connected to %s:%d", host, port));
// → level=info msg="connected to db.example.com:5432"
```

## `createLogger` options

### `showDebug`

Type: `boolean`
Default: `false` when `NODE_ENV=production`, otherwise `true`

Whether debug-level logs are emitted.

### `domain`

Type: `string`

Sets a `domain=` field on every log line from this logger instance.

### `syslog`

Type: `boolean`
Default: `false`

Adds RFC5424 syslog over UDP alongside console output, with UTC timestamps and the RFC5424 UTF-8 marker before each message.

When using `SyslogStream` directly, `end()` or `close()` drains pending sends before closing its socket. An injected socket remains owned by the caller. Send failures are emitted as stream errors.

### `pretty`

Type: `boolean`

Default: `false` when `KUBERNETES_SERVICE_HOST` is set, otherwise `true`

Expands newline escapes inside quoted logfmt values, so error stacks are readable in local development. Literal `\n` text stays escaped. Log entries may span multiple lines, which is why pretty output is off under Kubernetes.

### `metricsRegistry`

Type: `Registry` (`@prometheus-io/client` or `prom-client`)

A [@prometheus-io/client](https://github.com/prometheus/client_js) or [prom-client](https://github.com/siimon/prom-client) registry to record log volume metrics into. Adds the counter `log_messages_total` with labels `domain` and `severity`. Whichever of the two packages is installed is used; neither is required unless you pass a registry.

```ts
import { register } from "@prometheus-io/client";
import { createLogger } from "@loke/logger";

const logger = createLogger({ metricsRegistry: register });
```

## Exports

| Export                   | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `createLogger(options?)` | Create a logger instance                             |
| `printf(fmt, ...args)`   | Printf-style string formatting (wraps `util.format`) |
| `LokeLogger`             | Logger class                                         |
| `ConsoleStream`          | Stream that writes to stdout/stderr                  |
| `SyslogStream`           | Stream that sends UDP syslog messages                |
| `nullLogger`             | No-op logger for use in tests                        |
| `LogFields`              | Type for structured field objects                    |
| `Logger`                 | Interface for logger consumers                       |
| `MetricsRegistry`        | Registry interface accepted by `metricsRegistry`     |
