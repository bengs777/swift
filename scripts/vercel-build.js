const { execSync } = require("child_process")

const env = { ...process.env }
if (!env.DATABASE_URL && env.TURSO_DATABASE_URL) {
  env.DATABASE_URL = env.TURSO_DATABASE_URL
}

try {
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env,
  })
} catch (error) {
  console.error("[vercel-build] prisma db push failed")
  throw error
}

execSync("next build", { stdio: "inherit", env })
