import IORedis from "ioredis"

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379"

let connection: IORedis | null = null

export const getRedis = (): IORedis => {
  if (!connection) {
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}
