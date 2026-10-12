// Nutrition: the food log, the daily targets, the weight trend and the weekly meal plan.
//
// Pure helpers only — no React, no store. Everything that decides a number the user eats by
// (a target, an estimated expenditure, a shopping total) lives here with a test beside it.
//
// The state lives in S.nutrition (null until first used; nState() fills the defaults):
//   profile  { sex, age, heightCm, activity, goalType, rateKgWk, proteinPerKg, trainingBonus }
//   goal     { kcal, p, c, f } | null        — the target the day screen measures against
//   log      { 'YYYY-MM-DD': Item[] }        — what was eaten, per day
//   foods    Food[]                          — the user's own saved foods
//   favs     { id, name, items: Item[] }[]   — saved meals, logged again in one tap
//   repeat   { id, meal, item }[]            — items added to every new day by themselves
//   applied  { 'YYYY-MM-DD': true }          — days the repeats were already added to
//   plan     { '0'..'6': { breakfast: Item[], lunch, dinner, snack } }  — by weekday, 0 = Sunday
//   shopChecked { [name]: true }
//   aiModel  string | null
//
// An Item is one line of a meal: { id, name, unit, qty, k, p, c, f, src } where k/p/c/f are the
// calories and grams of protein/carbs/fat for ONE unit and qty is how many units were eaten.
// Keeping the per-unit values means a portion can be changed later without asking anyone again.

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
export const KCAL_PER_KG = 7700   // energy in a kilogram of body-weight change (mixed tissue)
const LB = 0.45359237

export const ACTIVITY = Object.freeze({
  sedentary: 1.2,   // desk job, little walking
  light: 1.375,     // on your feet some of the day
  moderate: 1.55,   // active job or a lot of walking
  active: 1.725,    // physical job
  very: 1.9         // physical job and more on top
})

export const GOAL_RATES = Object.freeze({ cut: -0.5, maintain: 0, bulk: 0.25 })   // kg per week

export const DEFAULT_PROFILE = Object.freeze({
  sex: 'male', age: 30, heightCm: 175, activity: 'light', goalType: 'cut',
  rateKgWk: -0.5, proteinPerKg: 2, trainingBonus: 150
})

export function nState(S) {
  const n = S && S.nutrition && typeof S.nutrition === 'object' ? S.nutrition : {}
  return {
    profile: { ...DEFAULT_PROFILE, ...(n.profile || {}) },
    goal: n.goal && n.goal.kcal > 0 ? n.goal : null,
    log: n.log && typeof n.log === 'object' ? n.log : {},
    foods: Array.isArray(n.foods) ? n.foods : [],
    favs: Array.isArray(n.favs) ? n.favs : [],
    repeat: Array.isArray(n.repeat) ? n.repeat : [],
    applied: n.applied && typeof n.applied === 'object' ? n.applied : {},
    plan: n.plan && typeof n.plan === 'object' ? n.plan : {},
    shopChecked: n.shopChecked && typeof n.shopChecked === 'object' ? n.shopChecked : {},
    aiModel: n.aiModel || null
  }
}

/** Makes S.nutrition a full object (in place, inside a store update) and returns it. */
export function ensureN(S) {
  S.nutrition = nState(S)
  return S.nutrition
}

/* ---------------------------------------------------------------- items -- */

const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0)
const r1 = v => Math.round(v * 10) / 10

/** A clean Item from anything item-shaped; null if it has no name and no calories. */
export function cleanItem(x, id) {
  if (!x || typeof x !== 'object') return null
  const name = String(x.name || '').trim().slice(0, 80)
  const item = {
    id: x.id || id,
    name,
    unit: String(x.unit || '').trim().slice(0, 40),
    qty: num(x.qty) || 1,
    k: num(x.k), p: num(x.p), c: num(x.c), f: num(x.f),
    src: x.src || 'quick'
  }
  if (x.ref) item.ref = x.ref
  if (!item.name && !item.k) return null
  return item
}

export const itemKcal = it => Math.round(num(it.k) * num(it.qty))

/** Sums a list of items: { kcal, p, c, f } rounded for display (kcal whole, grams one decimal). */
export function totals(items) {
  let k = 0, p = 0, c = 0, f = 0
  for (const it of items || []) {
    const q = num(it.qty)
    k += num(it.k) * q; p += num(it.p) * q; c += num(it.c) * q; f += num(it.f) * q
  }
  return { kcal: Math.round(k), p: r1(p), c: r1(c), f: r1(f) }
}

export const dayItems = (n, iso) => (Array.isArray(n.log[iso]) ? n.log[iso] : [])
export const mealItems = (items, meal) => items.filter(it => (it.meal || 'snack') === meal)

/** The meal a new entry most likely belongs to, from the hour of the day. */
export function mealForHour(h) {
  if (h >= 4 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 18 && h < 24) return 'dinner'
  return 'snack'
}

/** Items logged in the last `days` days, newest first, one per name — the "recent" list. */
export function recentItems(n, today, days = 21, limit = 30) {
  const seen = new Set(), out = []
  const keys = Object.keys(n.log).filter(d => d <= today && d >= addDays(today, -days)).sort().reverse()
  for (const d of keys) {
    for (const it of [...n.log[d]].reverse()) {
      const key = (it.name || '').trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key); out.push(it)
      if (out.length >= limit) return out
    }
  }
  return out
}

/* ---------------------------------------------------------------- dates -- */

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}
export const weekdayOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)

/* -------------------------------------------------------------- targets -- */

/** Basal metabolic rate, Mifflin-St Jeor. */
export function bmr({ sex, age, heightCm }, weightKg) {
  if (!(weightKg > 0) || !(heightCm > 0) || !(age > 0)) return null
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5)
}

/** Expenditure estimated from the profile alone — the starting point before any data. */
export function formulaTdee(profile, weightKg) {
  const b = bmr(profile, weightKg)
  return b == null ? null : Math.round(b * (ACTIVITY[profile.activity] || ACTIVITY.light))
}

/**
 * Daily targets from an expenditure: calories move by the weekly rate, protein is per kilogram
 * of body weight, fat a quarter of the calories, carbs whatever is left. Never below 1,200 kcal
 * or the basal rate, whichever is higher — a rate that asks for less is not followed.
 */
export function targetsFor({ tdee, rateKgWk = 0, weightKg, proteinPerKg = 2, floor = 1200 }) {
  if (!(tdee > 0) || !(weightKg > 0)) return null
  const kcal = Math.round(Math.max(floor, tdee + (rateKgWk * KCAL_PER_KG) / 7) / 10) * 10
  const p = Math.round(weightKg * proteinPerKg)
  const f = Math.round((kcal * 0.25) / 9)
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4))
  return { kcal, p, c, f }
}

/** The day's target: the goal, plus the training-day bonus (all of it carbs) on a training day. */
export function dayTarget(goal, { training = false, bonus = 0 } = {}) {
  if (!goal) return null
  if (!training || !(bonus > 0)) return { ...goal, training: false }
  return { ...goal, kcal: goal.kcal + bonus, c: goal.c + Math.round(bonus / 4), training: true }
}

/* --------------------------------------------------------- weight trend -- */

export const toKg = (w, unit) => (unit === 'lb' ? w * LB : w)
export const fromKg = (kg, unit) => (unit === 'lb' ? kg / LB : kg)

/**
 * The weigh-ins with a smoothed trend beside each one: an exponential moving average that moves
 * 10% of the way toward each new reading per day (so a gap of several days moves it more). One
 * reading per day — the last of the day. Returns [{ d, w, trend }] oldest first, in the input unit.
 */
export function weightTrend(bodyweight, alpha = 0.1) {
  const byDay = new Map()
  for (const b of Array.isArray(bodyweight) ? bodyweight : []) {
    if (!b?.d || !(Number(b.w) > 0)) continue
    const prev = byDay.get(b.d)
    if (!prev || (b.t || 0) >= (prev.t || 0)) byDay.set(b.d, b)
  }
  const days = [...byDay.keys()].sort()
  const out = []
  let trend = null, last = null
  for (const d of days) {
    const w = Number(byDay.get(d).w)
    if (trend == null) trend = w
    else {
      const gap = Math.max(1, daysBetween(last, d))
      const a = 1 - Math.pow(1 - alpha, gap)
      trend = trend + a * (w - trend)
    }
    last = d
    out.push({ d, w, trend: Math.round(trend * 100) / 100 })
  }
  return out
}

/** The trend's value on a given day (the last point on or before it), or null. */
export function trendOn(trend, iso) {
  let v = null
  for (const p of trend) { if (p.d <= iso) v = p.trend; else break }
  return v
}

/**
 * Expenditure measured from the user's own data, the way MacroFactor-style apps do it: what was
 * eaten minus what the body stored. Over the last `window` days ending yesterday (today is not
 * finished): the average of the logged days' calories, less the change in trend weight turned
 * into calories per day. Needs enough logged days and weigh-ins to mean anything; otherwise
 * answers why not. `minDays` days logged, two weigh-ins at least a week apart.
 */
export function adaptiveTdee(n, bodyweight, unit, today, { window = 21, minDays = 10 } = {}) {
  const end = addDays(today, -1)
  const start = addDays(end, -(window - 1))
  const logged = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const items = dayItems(n, d)
    const k = totals(items).kcal
    if (items.length && k >= 600) logged.push(k)   // a day with almost nothing in it was not logged fully
  }
  const trend = weightTrend(bodyweight)
  const inWin = trend.filter(p => p.d >= start && p.d <= end)
  const result = { loggedDays: logged.length, needDays: minDays, weighIns: inWin.length, window }
  if (logged.length < minDays || inWin.length < 2 || daysBetween(inWin[0].d, inWin.at(-1).d) < 7) return { ...result, tdee: null }
  const avgIntake = logged.reduce((a, b) => a + b, 0) / logged.length
  const span = daysBetween(inWin[0].d, inWin.at(-1).d)
  const changeKg = toKg(inWin.at(-1).trend - inWin[0].trend, unit)
  const stored = (changeKg * KCAL_PER_KG) / span
  return {
    ...result,
    tdee: Math.round((avgIntake - stored) / 10) * 10,
    avgIntake: Math.round(avgIntake),
    changeKgPerWeek: Math.round((changeKg / span) * 7 * 100) / 100
  }
}

/** The latest weigh-in in kg, or null. */
export function latestKg(bodyweight, unit) {
  const t = weightTrend(bodyweight)
  return t.length ? toKg(t.at(-1).w, unit) : null
}

/* ------------------------------------------------------------- weekly check-in -- */

/**
 * What the weekly review shows: the last seven finished days against the goal, the trend's move
 * over them, and the target the data now suggests (the adaptive expenditure if there is one,
 * the formula's otherwise), with the profile's rate applied.
 */
export function weeklyReview(S, today) {
  const n = nState(S)
  const unit = S.unit || 'kg'
  const end = addDays(today, -1), start = addDays(end, -6)
  const days = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const items = dayItems(n, d)
    days.push({ d, kcal: totals(items).kcal, p: totals(items).p, logged: items.length > 0 })
  }
  const logged = days.filter(d => d.logged)
  const avg = key => (logged.length ? Math.round(logged.reduce((a, d) => a + d[key], 0) / logged.length) : null)
  const trend = weightTrend(S.bodyweight)
  const tStart = trendOn(trend, addDays(start, -1)) ?? trendOn(trend, start)
  const tEnd = trendOn(trend, end)
  const weightKg = latestKg(S.bodyweight, unit)
  const adaptive = adaptiveTdee(n, S.bodyweight, unit, today)
  const formula = weightKg ? formulaTdee(n.profile, weightKg) : null
  const tdee = adaptive.tdee || formula
  const suggested = tdee && weightKg ? targetsFor({ tdee, rateKgWk: n.profile.rateKgWk, weightKg, proteinPerKg: n.profile.proteinPerKg }) : null
  return {
    days, loggedDays: logged.length, avgKcal: avg('kcal'), avgP: avg('p'),
    trendEnd: tEnd, trendChange: tStart != null && tEnd != null ? Math.round((tEnd - tStart) * 100) / 100 : null,
    adaptive, formula, tdee, source: adaptive.tdee ? 'adaptive' : formula ? 'formula' : null,
    suggested, current: n.goal
  }
}

/* -------------------------------------------------------------- meal plan -- */

export const planDay = (n, wd) => {
  const d = n.plan[String(wd)] || {}
  const out = {}
  for (const m of MEALS) out[m] = Array.isArray(d[m]) ? d[m] : []
  return out
}
export const planDayItems = (n, wd) => { const d = planDay(n, wd); return MEALS.flatMap(m => d[m].map(it => ({ ...it, meal: m }))) }

/**
 * The shopping list for the week's plan: every planned item summed by name, with how many
 * units and in which unit. Different units of the same food stay separate lines.
 */
export function shoppingList(n) {
  const map = new Map()
  for (let wd = 0; wd < 7; wd++) {
    for (const it of planDayItems(n, wd)) {
      const name = (it.name || '').trim()
      if (!name) continue
      const key = name.toLowerCase() + '|' + (it.unit || '')
      const cur = map.get(key) || { name, unit: it.unit || '', qty: 0, days: new Set() }
      cur.qty += num(it.qty) || 1
      cur.days.add(wd)
      map.set(key, cur)
    }
  }
  return [...map.values()]
    .map(x => ({ name: x.name, unit: x.unit, qty: r1(x.qty), days: x.days.size }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
}
