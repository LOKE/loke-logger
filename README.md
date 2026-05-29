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

Adds syslog UDP output alongside console output.

### `systemdPrefix`

Type: `boolean`
Default: `true` when `JOURNAL_STREAM` is set, otherwise `false`

Prefixes lines with systemd journal severity codes (e.g. `<6>`) so the journal assigns the correct priority.

### `escapeNewlines`

Type: `boolean`
Default: `true` when `JOURNAL_STREAM` or `KUBERNETES_SERVICE_HOST` is set, otherwise `false`

Replaces literal newlines in log output with `\n` so each log entry stays on a single line. Useful for Kubernetes and systemd where multi-line log entries may not parse correctly.

### `metricsRegistry`

Type: `Registry` (prom-client)

A [prom-client](https://github.com/siimon/prom-client) registry to record log volume metrics into. Adds the counter `log_messages_total` with labels `domain` and `severity`.

```ts
import { register } from "prom-client";
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
