// Claude for the food log: turns a description or a photo of a meal into log items, and drafts
// a week of meals for the plan. The phone talks to the Anthropic API directly with the user's
// own key — no server in between, the same way the Coach's "bring your own key" mode works.
//
// The key is kept in the platform's secure storage (coach-secrets.js), never in S, so it does
// not ride along in a backup or an export. Answers are forced through a tool call, so they come
// back as JSON in a known shape, and everything is cleaned again here before it reaches S.
import { nativeFetch } from './capacitor-fetch.js'
import { secureGet, secureSet } from './coach-secrets.js'
import { foodsReference } from './foods-sa.js'
import { MEALS, cleanItem } from './nutrition.js'

const KEY = 'food.anthropicKey'
const API = 'https://api.anthropic.com'
export const DEFAULT_MODEL = 'claude-sonnet-5-5'
export const MODEL_CHOICES = ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5']
const TIMEOUT_MS = 120000

export const getFoodKey = () => secureGet(KEY)
export const setFoodKey = v => secureSet(KEY, v)

export class FoodAiError extends Error {
  constructor(code, message) { super(message || code); this.code = code }
}

const headers = key => ({
  'content-type': 'application/json',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
})

async function request(path, init, key) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const tm = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null
  let res
  try {
    res = await nativeFetch(API + path, { ...init, headers: headers(key), signal: ctl?.signal })
  } catch (e) {
    throw new FoodAiError(e?.name === 'AbortError' ? 'timeout' : 'network', String(e?.message || e))
  } finally { if (tm) clearTimeout(tm) }
  let data = null
  try { data = await res.json() } catch { /* not JSON */ }
  if (!res.ok) {
    const msg = data?.error?.message || 'HTTP ' + res.status
    const code = res.status === 401 ? 'auth' : res.status === 403 ? 'forbidden' : res.status === 404 ? 'model'
      : res.status === 429 ? 'rate' : res.status === 529 || res.status >= 500 ? 'overloaded'
        : res.status === 400 && /credit|billing/i.test(msg) ? 'billing' : 'api'
    throw new FoodAiError(code, msg)
  }
  return data
}

/** Checks the key and lists the Claude models it can use. */
export async function listModels(key) {
  const k = key || await getFoodKey()
  if (!k) throw new FoodAiError('nokey')
  const data = await request('/v1/models?limit=100', { method: 'GET' }, k)
  return (data?.data || []).map(m => m.id).filter(id => /^claude/.test(id))
}

async function callTool({ model, system, content, tool, maxTokens = 2000 }) {
  const key = await getFoodKey()
  if (!key) throw new FoodAiError('nokey')
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
    tools: [tool],
    // 'auto', not a forced tool: some models reject tool_choice "tool"/"any" outright. The system
    // prompt asks for the tool, and a plain-JSON answer is read as a fallback (inputFromResponse).
    tool_choice: { type: 'auto' }
  }
  body.system[0].text += `\n\nAlways answer by calling the ${tool.name} tool exactly once. Do not write any other text.`
  const data = await request('/v1/messages', { method: 'POST', body: JSON.stringify(body) }, key)
  if (data?.stop_reason === 'refusal') throw new FoodAiError('refusal')
  const input = inputFromResponse(data, tool.name)
  if (!input) throw new FoodAiError('format', 'no structured answer')
  return input
}

/** The tool call's input, or a JSON object written as text instead of a tool call. Exported for tests. */
export function inputFromResponse(data, name) {
  const blocks = Array.isArray(data?.content) ? data.content : []
  const call = blocks.find(b => b?.type === 'tool_use' && b.name === name && b.input && typeof b.input === 'object')
  if (call) return call.input
  const text = blocks.filter(b => b?.type === 'text').map(b => b.text || '').join('\n')
  const start = text.indexOf('{'), end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try { const v = JSON.parse(text.slice(start, end + 1)); return v && typeof v === 'object' ? v : null } catch { return null }
}

/* ------------------------------------------------------------ meal estimate -- */

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Food name, in the language the user wrote in (Arabic if unsure).' },
    grams: { type: 'number', description: 'Estimated eaten weight in grams.' },
    kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }
  },
  required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat']
}

const MEAL_TOOL = {
  name: 'log_meal',
  description: 'Record every food in the meal with its estimated portion and nutrition for that whole portion.',
  input_schema: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ITEM_SCHEMA, maxItems: 15 },
      note: { type: 'string', description: 'One short sentence, in the user\'s language, on anything uncertain (portion size, hidden oil). Empty if nothing.' }
    },
    required: ['items']
  }
}

const MEAL_SYSTEM = `You estimate the nutrition of meals for a personal food log. The user is in Saudi Arabia and usually eats Saudi and Gulf food.

Rules:
- Split the meal into its separate foods. Estimate each portion's weight in grams, then its calories, protein, carbs and fat for that whole portion.
- If a food matches one in the reference list below, base your numbers on it and scale by the portion.
- Saudi restaurant portions are large; home portions are moderate. Count cooking oil and ghee in rice dishes.
- If the user gives a quantity ("نص صحن", "2 eggs", "200g"), use it exactly.
- Name each food in the language the user used. For a photo with no text, use Arabic.
- Numbers only for nutrition, no ranges. Be realistic, not optimistic.

Reference foods (per serving):
${foodsReference()}`

const n0 = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 10) / 10 : 0)

/** Cleans the tool's answer into log Items (qty 1 of "<grams> g" each). Exported for tests. */
export function itemsFromMeal(input, gramsLabel = 'g') {
  const list = Array.isArray(input?.items) ? input.items : []
  return list.slice(0, 15).map((x, i) => {
    const g = n0(x?.grams)
    return cleanItem({
      name: x?.name, unit: g ? Math.round(g) + ' ' + gramsLabel : '', qty: 1,
      k: Math.round(n0(x?.kcal)), p: n0(x?.protein), c: n0(x?.carbs), f: n0(x?.fat), src: 'ai'
    }, 'ai' + i)
  }).filter(Boolean)
}

/**
 * Estimates a meal from text and/or a photo. `image` is { data (base64, no prefix), mediaType }.
 * Returns { items, note }.
 */
export async function estimateMeal({ text, image, model, gramsLabel }) {
  const content = []
  if (image?.data) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType || 'image/jpeg', data: image.data } })
  const words = String(text || '').trim().slice(0, 1000)
  content.push({ type: 'text', text: words || 'What is in this meal? Estimate the portions shown.' })
  const input = await callTool({ model, system: MEAL_SYSTEM, content, tool: MEAL_TOOL, maxTokens: 1500 })
  const items = itemsFromMeal(input, gramsLabel)
  if (!items.length) throw new FoodAiError('empty')
  return { items, note: String(input.note || '').slice(0, 300) }
}

/* ---------------------------------------------------------------- week plan -- */

const PLAN_ITEM = {
  type: 'object',
  properties: {
    name: { type: 'string' }, unit: { type: 'string', description: 'Portion, e.g. "صحن", "200 g", "2 حبة".' },
    kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }
  },
  required: ['name', 'unit', 'kcal', 'protein', 'carbs', 'fat']
}
const DAY_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(MEALS.map(m => [m, { type: 'array', items: PLAN_ITEM, maxItems: 6 }])),
  required: MEALS
}
const PLAN_TOOL = {
  name: 'week_plan',
  description: 'A seven-day meal plan. days[0] is Sunday, days[6] is Saturday.',
  input_schema: {
    type: 'object',
    properties: { days: { type: 'array', items: DAY_SCHEMA, minItems: 7, maxItems: 7 } },
    required: ['days']
  }
}

const PLAN_SYSTEM = `You plan a week of meals for one person in Saudi Arabia who tracks calories and macros.

Rules:
- Use foods that are easy to find and cook in Saudi Arabia; mix home dishes with simple high-protein options.
- Each day should land within about 5% of the calorie target and reach the protein target. Carbs and fat roughly as given.
- A training day may have more carbs if the user says so; otherwise keep days similar.
- Repeat breakfasts and snacks across days when it makes shopping simpler; vary lunch and dinner.
- Every item's nutrition is for its whole stated portion. Use "snack" for anything between meals; leave a meal empty if the user eats fewer meals.
- Write food names and portions in Arabic unless the user writes in English.

Reference foods (per serving):
${foodsReference()}`

/** Cleans the plan answer into { '0'..'6': { breakfast: Item[], … } }. Exported for tests. */
export function planFromAnswer(input) {
  const days = Array.isArray(input?.days) ? input.days.slice(0, 7) : []
  const plan = {}
  days.forEach((day, wd) => {
    const out = {}
    for (const m of MEALS) {
      out[m] = (Array.isArray(day?.[m]) ? day[m] : []).slice(0, 6).map((x, i) => cleanItem({
        name: x?.name, unit: x?.unit, qty: 1, k: Math.round(n0(x?.kcal)), p: n0(x?.protein), c: n0(x?.carbs), f: n0(x?.fat), src: 'plan'
      }, `p${wd}${m[0]}${i}`)).filter(Boolean)
    }
    plan[String(wd)] = out
  })
  return plan
}

export async function generateWeekPlan({ target, prefs, meals, model, ar }) {
  const lines = [
    `Daily target: ${target.kcal} kcal, protein ${target.p} g, carbs ${target.c} g, fat ${target.f} g.`,
    `Meals per day: ${meals || 3} main meals plus snacks as needed.`,
    prefs ? `Preferences and notes from the user: ${String(prefs).slice(0, 800)}` : '',
    `Language for names: ${ar ? 'Arabic' : 'English'}.`
  ].filter(Boolean)
  const input = await callTool({ model, system: PLAN_SYSTEM, content: [{ type: 'text', text: lines.join('\n') }], tool: PLAN_TOOL, maxTokens: 8000 })
  const plan = planFromAnswer(input)
  if (Object.keys(plan).length < 7) throw new FoodAiError('format', 'incomplete plan')
  return plan
}

/* ------------------------------------------------------------------- images -- */

/** Reads a picked image file into a downscaled JPEG: { data, mediaType, preview }. */
export function readImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * s); canvas.height = Math.round(img.height * s)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const preview = canvas.toDataURL('image/jpeg', 0.82)
      resolve({ data: preview.split(',')[1], mediaType: 'image/jpeg', preview })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}
