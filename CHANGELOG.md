# Changelog

## [4.0.0] — 2026-05-29

### Breaking changes

**Output format changed to logfmt.** Every log line is now structured key=value pairs:

```
level=info domain=my-service msg="user signed in" user_id=42
```

Previously output was a freeform string like `[my-service] user signed in`.

**`create` renamed to `createLogger`.** The factory function has a new name:

```ts
// before
import { create } from "@loke/logger";
const logger = create();

// after
import { createLogger } from "@loke/logger";
const logger = createLogger();
```

**Logger method signature changed.** Methods now take `(msg: string, ...fields: LogFields[])` instead of variadic `...args`. Multiple field objects are merged:

```ts
// before
logger.info("user %s signed in", userId);

// after
logger.info("user signed in", { user_id: userId });
logger.info("request failed", { status: 500 }, { error: new Error("timeout") });

// for printf-style message formatting, use the exported printf helper
import { createLogger, printf } from "@loke/logger";
logger.info(printf("connected to %s:%d", host, port));
```

**`withPrefix` renamed to `withDomain`.** The `prefix` concept is now `domain` throughout:

```ts
// before
const log = logger.withPrefix("my-service");

// after
const log = logger.withDomain("my-service");
```

**`LogFields` is `Record<string, unknown>`.** The old variadic `any[]` signature is gone — structured fields are fully typed. `null` and `undefined` values are silently omitted from output.

### Added

- `printf(fmt, ...args)` helper exported from the package for explicit sprintf-style formatting
- logfmt value quoting: strings with spaces/special chars are automatically quoted
- `domain=` field appears in output when a domain is set
- `msg=` field wraps the message in all output

---

## [3.5.0] — 2025-12-12

### Added

- Newline escaping in console output — each log call produces exactly one line. Prevents log injection and works correctly with Datadog and Kubernetes log collectors. Literal `\n` in values becomes `\\n`.

---

## [3.4.0] — 2024-09-10

### Changed

- Updated all dependencies to current versions

---

## [3.3.0] — 2023-02-08

### Added

- prom-client 14 added to supported peer dependency range (`>=12 <=14`)

---

## [3.2.0–3.2.4] — 2021-05-25

### Added

- systemd/journald support — when `JOURNAL_STREAM` env var is set, `systemdPrefix` and `escapeNewlines` are automatically enabled
- `systemdPrefix` option: prefixes each line with the syslog priority bracket (e.g. `<6>`) so journald picks up the level
- `escapeNewlines` option: available as an explicit opt-in even outside systemd

### Fixed

- prom-client peer dependency range broadened to work with more installed versions (`>=12 <=15`)

---

## [3.1.0] — 2020-09-10

### Changed

- Codebase migrated to TypeScript. Published types are included — no `@types` package needed.

---

## [3.0.0] — 2018-06-08 (published as 3.0.1 — 2020-03-03)

Package renamed from `loke-logger` to `@loke/logger`.

### Breaking changes

**API rewritten.** The factory signature and method interface both changed.

**Before (v2):**

```js
const logger = require("loke-logger");
const instance = logger.create({ syslog: true, prefix: "my-app" });
instance.info("hello"); // freeform string, winston under the hood
```

**After (v3):**

```js
const { create } = require("@loke/logger");
const logger = create({ syslog: true });
logger.info("hello");

// scoped logger for a subsystem
const sub = logger.withPrefix("my-subsystem");
sub.warn("something happened");
```

**Key differences:**

- `create()` no longer accepts a `prefix` — use `withPrefix(name)` on the returned logger
- Methods match the `console` interface exactly (`debug`, `info`, `log`, `warn`, `error`)
- Winston removed — lightweight stream-based internals (`ConsoleStream`, `SyslogStream`)
- `nullLogger` exported for use in tests

### Added

- `metricsRegistry` option on `create()` — pass a prom-client registry to get log-level counters for free
- `nullLogger` — a no-op logger safe to use in tests without any setup
- `SyslogStream` and `ConsoleStream` exported for custom stream wiring

---

## [2.0.0] — 2015-12-15

### Breaking changes

Complete rewrite. Winston, papertrail, and rollbar dependencies removed.

**Before (v1):**

```js
const Logger = require("loke-logger");
const logger = new Logger(transports, { service: "my-app", system: hostname });
logger.log("hello");
```

**After (v2):**

```js
const logger = require("loke-logger").create({ syslog: true });
logger.info("hello");
```

Direct RFC5424 syslog support replaces the winston-syslog transport. If you were configuring papertrail or rollbar through this library, those integrations need to be handled separately.

---

## [1.2.0] — 2015-08-28

- Updated winston dependency

## [1.1.5] — 2015-04-24

- Fix `merge()` calls mutating base metadata
- Fix max listeners warning
