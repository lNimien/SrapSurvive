import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

type Env = {
  DATABASE_URL: string
  DIRECT_URL: string
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --compiler-options {\"module\":\"CommonJS\"} ./prisma/seed.ts',
  },
  datasource: {
    url: env<Env>('DIRECT_URL'),
  },
})
