/**
 * Mirror-sync scheduler for the xhostd deployment.
 *
 * Replaces the three GitHub Actions that kept the mirrors fresh while the
 * database lived on Render (rulings-mirror-sync, guidelines-mirror-sync,
 * ca-sync). launch.sh starts it next to the web server when
 * SYNC_SCHEDULER=true. Each job still runs as its own child process with its
 * own heap — the reason the syncs left the web process in the first place
 * (see src/instrumentation.ts). The schedule is the workflows' cron, in UTC:
 *
 *   rulings incremental   every 15 minutes
 *   rulings full          00:10 daily
 *   guidelines            01:20 daily
 *   conditional arr.      04:30 Thursday
 *
 * One job runs at a time, to keep the container's memory predictable. A job
 * that comes due while another runs waits in a queue that holds each job at
 * most once — the workflows' `cancel-in-progress: false` concurrency groups.
 * Child output is prefixed and written to stdout, so get_runtime_log shows
 * every run.
 *
 * Env: SYNC_JOBS=name,name limits which jobs are scheduled (default: all).
 */
import { spawn } from "node:child_process";

interface Job {
  name: string;
  args: string[];
  heapMb: number;
  timeoutMin: number;
  due: (now: Date) => boolean;
}

const ALL_JOBS: Job[] = [
  {
    name: "rulings-full",
    args: ["scripts/rulings-mirror-sync.ts", "--mode", "full"],
    heapMb: 1024,
    timeoutMin: 120,
    due: (d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 10,
  },
  {
    name: "guidelines",
    args: ["scripts/guidelines-mirror-sync.ts"],
    heapMb: 768,
    timeoutMin: 45,
    due: (d) => d.getUTCHours() === 1 && d.getUTCMinutes() === 20,
  },
  {
    name: "ca-sync",
    args: ["scripts/ca-sync-local.ts"],
    heapMb: 768,
    timeoutMin: 30,
    due: (d) => d.getUTCDay() === 4 && d.getUTCHours() === 4 && d.getUTCMinutes() === 30,
  },
  {
    name: "rulings-incremental",
    args: ["scripts/rulings-mirror-sync.ts", "--mode", "auto"],
    heapMb: 512,
    timeoutMin: 120,
    due: (d) => d.getUTCMinutes() % 15 === 0,
  },
];

const only = (process.env.SYNC_JOBS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const JOBS = only.length ? ALL_JOBS.filter((j) => only.includes(j.name)) : ALL_JOBS;

const queue: Job[] = [];
let running: string | null = null;

const log = (msg: string) => console.log(`[sync-scheduler] ${new Date().toISOString()} ${msg}`);

function enqueue(job: Job) {
  if (running === job.name || queue.some((q) => q.name === job.name)) {
    log(`${job.name} is due but already ${running === job.name ? "running" : "queued"}; skipping this tick`);
    return;
  }
  queue.push(job);
}

function pipe(stream: NodeJS.ReadableStream, name: string) {
  let buf = "";
  stream.on("data", (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) console.log(`[sync:${name}] ${line}`);
  });
  stream.on("end", () => {
    if (buf) console.log(`[sync:${name}] ${buf}`);
  });
}

function runNext() {
  if (running || queue.length === 0) return;
  const job = queue.shift() as Job;
  running = job.name;
  const started = Date.now();
  log(`${job.name} starting`);

  const child = spawn(process.execPath, [`--max-old-space-size=${job.heapMb}`, "--import", "tsx", ...job.args], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_OPTIONS: "" },
  });
  if (child.stdout) pipe(child.stdout, job.name);
  if (child.stderr) pipe(child.stderr, job.name);

  const timer = setTimeout(() => {
    log(`${job.name} exceeded ${job.timeoutMin} min; sending SIGTERM`);
    child.kill("SIGTERM");
  }, job.timeoutMin * 60_000);

  child.on("exit", (code, signal) => {
    clearTimeout(timer);
    const secs = Math.round((Date.now() - started) / 1000);
    log(`${job.name} finished in ${secs}s with ${signal ? `signal ${signal}` : `exit ${code}`}`);
    running = null;
    runNext();
  });
}

let lastMinute = -1;

function tick() {
  const now = new Date();
  const minute = Math.floor(now.getTime() / 60_000);
  if (minute !== lastMinute) {
    lastMinute = minute;
    for (const job of JOBS) if (job.due(now)) enqueue(job);
    runNext();
  }
  // Wake just after the next minute boundary.
  setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 500);
}

log(`scheduling ${JOBS.map((j) => j.name).join(", ")}`);
tick();

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    log(`received ${sig}; exiting`);
    process.exit(0);
  });
}
