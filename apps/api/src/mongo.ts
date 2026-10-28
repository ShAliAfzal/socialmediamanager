import { MongoMemoryServer } from 'mongodb-memory-server';

let memory: MongoMemoryServer | null = null;

export async function resolveMongoUri(preferred?: string) {
  if (process.env.USE_MEMORY_MONGO === 'true' || !preferred) {
    memory = await MongoMemoryServer.create();
    const uri = memory.getUri('socialmediamanager');
    console.log(`Using in-memory MongoDB at ${uri}`);
    return uri;
  }
  return preferred;
}

export async function stopMemoryMongo() {
  if (memory) {
    await memory.stop();
    memory = null;
  }
}
