// PM2 config (alternative to Docker). Run after `npm run build`:
//   pm2 start ecosystem.config.js && pm2 save
//
// One instance on purpose: the ISR cache and rate limiter live in-process, and
// revalidatePath() on publish only clears the instance that handled it.
// To run a cluster, add a shared cache handler (Redis) first.
module.exports = {
  apps: [
    {
      name: "linkdeck",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: 3000, HOSTNAME: "127.0.0.1" },
      // .env is loaded by deploy/scripts/deploy-pm2.sh via --update-env
      max_memory_restart: "600M",
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true,
    },
  ],
};
