import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './db/schema'
import { eq } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { Google, generateState, generateCodeVerifier } from 'arctic'
import { sign, verify } from 'hono/jwt'
import { setCookie, getCookie } from 'hono/cookie'

const app = new Hono().basePath('/api')
const sqlite = new Database('sqlite.db')
const db = drizzle(sqlite, { schema })

const google = new Google(
  process.env.GOOGLE_CLIENT_ID || '',
  process.env.GOOGLE_CLIENT_SECRET || '',
  process.env.GOOGLE_REDIRECT_URI || ''
)

const JWT_SECRET = process.env.JWT_SECRET || 'pixel-fallback-secret'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.path}`)
  await next()
})

app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3333',
  credentials: true
}))

app.onError((err, c) => {
  console.error(`${err}`)
  return c.json({ error: err.message }, 500)
})

app.get('/hello', (c) => c.json({ message: 'Pixel API is running' }))
app.get('/ping', (c) => c.json({ message: 'pong' }))

// Update Profile
app.post('/v1/profile', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const body = await c.req.json()
    const { name, address, contact } = body
    console.log('Profile update request:', { userId: payload.id, name, address, contact })

    await db.update(schema.users)
      .set({ 
        name, 
        address, 
        contact, 
        profileComplete: true 
      })
      .where(eq(schema.users.id, payload.id as string))
      .run()

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Auth Routes
app.get('/auth/google', async (c) => {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"])
  
  setCookie(c, 'google_oauth_state', state, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'Lax',
  })

  setCookie(c, 'google_oauth_code_verifier', codeVerifier, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'Lax',
  })

  return c.redirect(url.toString())
})

app.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const storedState = getCookie(c, 'google_oauth_state')
  const storedCodeVerifier = getCookie(c, 'google_oauth_code_verifier')

  if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
    return c.json({ error: 'Invalid state or code' }, 400)
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier)
    console.log('Tokens received:', !!tokens.accessToken())
    
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Userinfo fetch failed:', errorText)
      throw new Error(`Failed to fetch user info: ${errorText}`)
    }

    const user: any = await response.json()
    console.log('User info received:', user.email)

    // Determine role
    const isAdmin = user.email === 'the.real.ferilee@gmail.com'
    
    // Upsert user in DB
    await db.insert(schema.users).values({
      id: user.sub,
      email: user.email,
      name: user.name,
      avatar: user.picture,
      role: isAdmin ? 'admin' : 'user'
    }).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        name: user.name,
        avatar: user.picture,
        email: user.email,
        ...(isAdmin ? { role: 'admin' } : {})
      }
    }).run()

    // Create JWT
    const token = await sign({
      id: user.sub,
      email: user.email,
      name: user.name,
      role: isAdmin ? 'admin' : 'user',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    }, JWT_SECRET, "HS256")

    // Redirect to frontend with token
    return c.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${token}`)
  } catch (e: any) {
    console.error('OAuth callback failed:', e.message || e)
    return c.json({ error: 'Authentication failed', details: e.message }, 500)
  }
})

// Current User
app.get('/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = await verify(token, JWT_SECRET, "HS256")
    const user = await db.select().from(schema.users).where(eq(schema.users.id, payload.id as string)).get()
    if (!user) {
      console.error('User not found in DB for ID:', payload.id)
      return c.json({ error: 'User not found' }, 404)
    }

    // Count usage in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const usage = await db.select().from(schema.prompts)
      .where(eq(schema.prompts.userId, user.id))
      .all()
    
    const recentUsage = usage.filter(p => p.timestamp >= sevenDaysAgo)
    const usageCount = recentUsage.length
    
    let nextResetDate = null
    if (usageCount > 0) {
      // First (oldest) prompt in the 7-day window
      const oldestPrompt = recentUsage.sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0]
      const oldestDate = new Date(oldestPrompt.timestamp)
      nextResetDate = new Date(oldestDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    return c.json({
      ...user,
      usageCount: usageCount,
      limit: user.role === 'admin' ? Infinity : 3,
      profileComplete: !!user.profileComplete,
      resetDate: nextResetDate
    })
  } catch (e: any) {
    console.error('JWT Verification failed:', e.message)
    return c.json({ error: 'Invalid token', details: e.message }, 401)
  }
})

// Admin Stats
app.get('/admin/stats', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const user = await db.select().from(schema.users).where(eq(schema.users.id, payload.id as string)).get()
    
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const allUsers = await db.select().from(schema.users).all()
    const allPrompts = await db.select().from(schema.prompts).all()

    return c.json({
      totalUsers: allUsers.length,
      totalGenerations: allPrompts.length,
      users: allUsers,
      recentPrompts: allPrompts.slice(-10).reverse()
    })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Create User (Admin Only)
app.post('/admin/users', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const admin = await db.select().from(schema.users).where(eq(schema.users.id, payload.id as string)).get()
    if (!admin || admin.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

    const body = await c.req.json()
    const { email, name, role } = body

    if (!email) return c.json({ error: 'Email is required' }, 400)

    const id = `manual-${Math.random().toString(36).substring(7)}`
    await db.insert(schema.users).values({
      id,
      email,
      name: name || email.split('@')[0],
      role: role || 'user',
      avatar: `https://ui-avatars.com/api/?name=${name || email}&background=random`
    }).run()

    return c.json({ message: 'User created successfully', id })
  } catch (e) {
    return c.json({ error: 'Invalid token or request' }, 401)
  }
})

// Delete User (Admin Only)
app.delete('/admin/users/:id', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const admin = await db.select().from(schema.users).where(eq(schema.users.id, payload.id as string)).get()
    if (!admin || admin.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

    const id = c.req.param('id')
    
    // Check if trying to delete self
    if (id === admin.id) return c.json({ error: 'Cannot delete yourself' }, 400)

    await db.delete(schema.users).where(eq(schema.users.id, id)).run()
    // Optionally delete their prompts too
    await db.delete(schema.prompts).where(eq(schema.prompts.userId, id)).run()

    return c.json({ message: 'User deleted successfully' })
  } catch (e) {
    return c.json({ error: 'Invalid token or request' }, 401)
  }
})

// Get all history
app.get('/history', async (c) => {
  const authHeader = c.req.header('Authorization')
  let userId: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
      userId = payload.id as string
    } catch (e) {}
  }

  const query = db.select().from(schema.prompts)
  if (userId) {
    const result = await query.where(eq(schema.prompts.userId, userId)).all()
    return c.json(result)
  }
  
  const result = await query.all()
  return c.json(result)
})

// Generate Prompt
app.post('/generate', async (c) => {
  const authHeader = c.req.header('Authorization')
  let userId: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
      userId = payload.id as string
    } catch (e) {}
  }

  const body = await c.req.json()
  
  // Limit Check
  if (userId) {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get()
    if (user && user.role === 'user') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const usage = await db.select().from(schema.prompts)
          .where(eq(schema.prompts.userId, userId))
          .all()
        const recentUsage = usage.filter(p => p.timestamp >= sevenDaysAgo).length
        
        if (recentUsage >= 3) {
            return c.json({ 
                error: 'Limit reached', 
                message: 'Anda telah mencapai batas 3 generate dalam 7 hari. Tunggu hari ke-8 atau berlangganan PRO.' 
            }, 403)
        }
    }
  }

  const { content, type, style, layout, design, icon, tone, template, platform, aspectRatio, negativePrompt, enhance } = body

  // Step 1: Base Prompt Constructor
  let basePrompt = `Ilustrasi ${style} untuk infografis ${template} bertema ${content || type}, dengan tata letak ${layout}, desain ${design}, menampilkan ikon ${icon}, dalam suasana ${tone}.`
  
  // Step 2: AI Enhancement (Gemini)
  let finalPrompt = basePrompt
  let suggestedPalette = "[]"
  let suggestedIcons = "[]"

  if (enhance) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `You are a professional prompt engineer and designer. Enrich the following prompt with technical details about lighting, texture, artistic composition, and specific visual elements. 
      
      Also, suggest a professional color palette (5 hex codes) and 3 relevant icons for this infographic theme.
      
      Respond ONLY in the following JSON format:
      {
        "enrichedPrompt": "...",
        "palette": ["#...", "#...", "#...", "#...", "#..."],
        "icons": ["IconName1", "IconName2", "IconName3"]
      }
      
      Theme to enrich: ${basePrompt}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text() || "{}";
      
      try {
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        finalPrompt = parsed.enrichedPrompt || basePrompt;
        suggestedPalette = JSON.stringify(parsed.palette || []);
        suggestedIcons = JSON.stringify(parsed.icons || []);
      } catch (jsonErr) {
        finalPrompt = text || basePrompt;
      }
    } catch (e: any) {
      console.error('Gemini Enhancement failed:', e.message)
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        console.warn('Gemini API Quota Exceeded. Using base prompt as fallback.')
      }
    }
  }

  // Step 3: Platform & Aspect Ratio Optimization
  if (platform === 'Midjourney v6') {
    const mjRatio = aspectRatio.replace(':', '/')
    finalPrompt += ` --ar ${mjRatio} --v 6.0 --stylize 250`
  } else if (platform === 'DALL-E 3') {
    finalPrompt += ` Rendert dalam detail tinggi, 4k, kualitas fotografi. Aspect ratio ${aspectRatio}.`
  } else if (platform === 'Stable Diffusion') {
    finalPrompt += ` mahakarya, sangat detail, sangat fokus, resolusi 8k, aspect ratio ${aspectRatio}`
  }

  // Step 4: Negative Prompt Injection
  if (negativePrompt && Array.isArray(negativePrompt) && negativePrompt.length > 0) {
    const joinedNegative = negativePrompt.join(', ')
    finalPrompt += ` [Negative Prompt: ${joinedNegative}, low resolution, distorted]`
  }

  const projectId = `INF-2026-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

  const newEntry = {
    projectId,
    timestamp: new Date().toISOString(),
    content: content || type,
    promptText: finalPrompt,
    aspectRatio: aspectRatio || "1:1",
    negativePrompt: Array.isArray(negativePrompt) ? negativePrompt.join(', ') : (negativePrompt || "none"),
    imageUrl: '', 
    model: enhance ? "Gemini 2.0 Flash" : "Constructor Engine",
    llmEnhanced: !!enhance,
    category: type,
    style,
    tone,
    userId,
    suggestedPalette,
    suggestedIcons
  }

  // Save to DB
  await db.insert(schema.prompts).values(newEntry).run()

  return c.json(newEntry)
})

// Preset Management
app.get('/presets', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const result = await db.select().from(schema.presets).where(eq(schema.presets.userId, payload.id as string)).all()
    return c.json(result)
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

app.post('/presets', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const { name, config } = await c.req.json()
    const newPreset = {
      name,
      userId: payload.id as string,
      config: JSON.stringify(config),
      createdAt: new Date().toISOString()
    }
    await db.insert(schema.presets).values(newPreset).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

app.delete('/presets/:id', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const id = parseInt(c.req.param('id'))
    await db.delete(schema.presets).where(eq(schema.presets.id, id)).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Gallery & Visibility
app.get('/gallery', async (c) => {
  const result = await db.select().from(schema.prompts).where(eq(schema.prompts.isPublic, true)).all()
  return c.json(result.reverse())
})

app.post('/prompts/:id/visibility', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const id = parseInt(c.req.param('id'))
    const { isPublic } = await c.req.json()
    
    // Check ownership
    const prompt = await db.select().from(schema.prompts).where(eq(schema.prompts.id, id)).get()
    if (!prompt || prompt.userId !== payload.id) return c.json({ error: 'Forbidden' }, 403)

    await db.update(schema.prompts).set({ isPublic }).where(eq(schema.prompts.id, id)).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Summarize Source Content
// Image-to-Prompt (Vision)
app.post('/analyze-image', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const formData = await c.req.formData()
    const image = formData.get('image') as File
    
    if (!image) return c.json({ error: 'Image is required' }, 400)

    console.log('Analyzing image:', image.name, 'Size:', image.size, 'Type:', image.type)

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      "Describe this image in detail as an AI Image Generation prompt. Focus on the subject, style, lighting, color palette, and composition. Format it as a single paragraph of descriptive prompt.",
      {
        inlineData: {
          data: base64,
          mimeType: image.type || 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const promptText = response.text()
    
    if (!promptText) throw new Error('Empty response from Gemini')

    return c.json({ prompt: promptText })
  } catch (e: any) {
    console.error('Image analysis error:', e)
    return c.json({ error: `Failed to analyze image: ${e.message}` }, 500)
  }
})

// Folder & Tagging
app.get('/folders', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const result = await db.select().from(schema.folders).where(eq(schema.folders.userId, payload.id as string)).all()
    return c.json(result)
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

app.post('/folders', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const { name } = await c.req.json()
    const newFolder = {
      name,
      userId: payload.id as string,
      createdAt: new Date().toISOString()
    }
    await db.insert(schema.folders).values(newFolder).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

app.patch('/prompts/:id/meta', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
    const id = parseInt(c.req.param('id'))
    const { tags, folderId } = await c.req.json()
    
    // Check ownership
    const prompt = await db.select().from(schema.prompts).where(eq(schema.prompts.id, id)).get()
    if (!prompt || prompt.userId !== payload.id) return c.json({ error: 'Forbidden' }, 403)

    await db.update(schema.prompts).set({ tags, folderId }).where(eq(schema.prompts.id, id)).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

app.post('/summarize', async (c) => {
  const authHeader = c.req.header('Authorization')
  let userId: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verify(authHeader.split(' ')[1], JWT_SECRET, "HS256")
      userId = payload.id as string
    } catch (e) {}
  }

  // Limit Check for Gemini usage
  if (userId) {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get()
    if (user && user.role === 'user') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const usage = await db.select().from(schema.prompts)
          .where(eq(schema.prompts.userId, userId))
          .all()
        const recentUsage = usage.filter(p => p.timestamp >= sevenDaysAgo).length
        
        if (recentUsage >= 3) {
            return c.json({ 
                error: 'Limit reached', 
                message: 'Anda telah mencapai batas pemakaian AI Gemini. Silakan tunggu reset atau upgrade ke PRO.' 
            }, 403)
        }
    }
  }

  const { text } = await c.req.json()
  if (!text) return c.json({ error: 'Text is required' }, 400)

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Summarize the following text into a very concise subject for an infographic. Keep it under 20 words. Focus on the core topic.
    
    Text: ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text() || text;
    
    return c.json({ summary: summary.trim() })
  } catch (e: any) {
    console.error('Summarization failed:', e.message)
    if (e.message?.includes('429') || e.message?.includes('quota')) {
        return c.json({ 
            error: 'Quota Exceeded', 
            message: 'Server sedang sibuk (Limit Gemini API tercapai). Silakan coba lagi beberapa saat lagi atau gunakan teks asli.',
            fallback: text
        }, 429)
    }
    return c.json({ error: 'Failed to summarize' }, 500)
  }
})

export default {
  port: 3334,
  fetch: app.fetch,
}
