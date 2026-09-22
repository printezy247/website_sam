// Cron entrypoint for a long-running host (Railway cron service): `npm run jobs`.
// On Vercel the same work runs through GET /api/cron/jobs, called by cron-job.org.
import { runJobs } from "@/lib/jobs";

runJobs().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
