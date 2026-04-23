const { execSync } = require("child_process")

const env = { ...process.env }
env.NODE_ENV = "production"
if (!env.DATABASE_URL && env.TURSO_DATABASE_URL) {
  env.DATABASE_URL = env.TURSO_DATABASE_URL
}

const databaseUrl = env.DATABASE_URL || ""
const shouldPushSchema = databaseUrl.startsWith("file:")

execSync("npx prisma generate", { stdio: "inherit", env })

if (shouldPushSchema) {
  try {
    execSync("npx prisma db push --skip-generate", {
      stdio: "inherit",
      env,
    })
  } catch (error) {
    console.error("[vercel-build] prisma db push failed")
    throw error
  }
} else {
  console.log("[vercel-build] skipping prisma db push for remote database URL")
}

execSync("npx next build --webpack", { stdio: "inherit", env })
