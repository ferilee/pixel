import { serveStatic } from 'hono/bun'
import { Hono } from 'hono'
import api from './api/index.js'

const app = new Hono()

// Mount API
app.route('/', api) // wait, api/index.ts does app = new Hono().basePath('/api')
// So we need to just import it? No, api/index.ts exports default { fetch: app.fetch, port: 3334 }. 
// It doesn't export the app instance.
