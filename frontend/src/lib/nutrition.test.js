import { describe, it, expect } from 'vitest'
import {
  nState, totals, cleanItem, bmr, formulaTdee, targetsFor, dayTarget, weightTrend, trendOn,
  adaptiveTdee, addDays, weekdayOf, shoppingList, recentItems, mealForHour, weeklyReview
} from './nutrition.js'
import { itemsFromMeal, planFromAnswer } from './food-ai.js'
import { FOODS_SA, searchFoods, foodItem } from './foods-sa.js'

const item = (k, qty = 1, extra = {}) => ({ name: 'x', qty, k, p: 10, c: 20, f: 5, ...extra })

describe('items and totals', () => {
  it('sums per-unit values times quantity', () => {
    expect(totals([item(100, 2), item(50, 1)])).toEqual({ kcal: 250, p: 30, c: 60, f: 15 })
  })
  it('ignores junk numbers instead of turning them into NaN', () => {
    expect(totals([{ k: 'abc', qty: 2 }, { k: -50, qty: 1 }, item(100)])).toEqual({ kcal: 100, p: 10, c: 20, f: 5 })
  })
  it('cleanItem keeps a usable item and drops an empty one', () => {
    expect(cleanItem({ name: ' Rice ', k: 200, qty: 0 }, 'a')).toMatchObject({ id: 'a', name: 'Rice', k: 200, qty: 1 })
    expect(cleanItem({ name: '', k: 0 }, 'a')).toBeNull()
  })
  it('nState fills defaults without touching a missing state', () => {
    const n = nState({})
    expect(n.goal).toBeNull()
    expect(n.log).toEqual({})
    expect(n.profile.activity).toBe('light')
  })
})

describe('targets', () => {
  const profile = { sex: 'male', age: 30, heightCm: 180, activity: 'moderate' }
  it('Mifflin-St Jeor', () => {
    expect(bmr(profile, 80)).toBe(10 * 80 + 6.25 * 180 - 5 * 30 + 5)
    expect(bmr({ ...profile, sex: 'female' }, 80)).toBe(10 * 80 + 6.25 * 180 - 5 * 30 - 161)
    expect(bmr(profile, 0)).toBeNull()
  })
  it('formula expenditure applies the activity factor', () => {
    expect(formulaTdee(profile, 80)).toBe(Math.round(1780 * 1.55))
  })
  it('a cut of 0.5 kg a week is 550 kcal a day under, protein per kg, fat a quarter', () => {
    const t = targetsFor({ tdee: 2760, rateKgWk: -0.5, weightKg: 80, proteinPerKg: 2 })
    expect(t.kcal).toBe(2210)
    expect(t.p).toBe(160)
    expect(t.f).toBe(Math.round(2210 * 0.25 / 9))
    expect(t.p * 4 + t.c * 4 + t.f * 9).toBeGreaterThan(2190)
    expect(t.p * 4 + t.c * 4 + t.f * 9).toBeLessThan(2230)
  })
  it('never goes below the floor', () => {
    expect(targetsFor({ tdee: 1400, rateKgWk: -1, weightKg: 60 }).kcal).toBe(1200)
  })
  it('a training day adds the bonus as carbs', () => {
    const g = { kcal: 2000, p: 150, c: 200, f: 55 }
    expect(dayTarget(g, { training: true, bonus: 200 })).toMatchObject({ kcal: 2200, c: 250, training: true })
    expect(dayTarget(g, { training: false, bonus: 200 })).toMatchObject({ kcal: 2000, c: 200, training: false })
  })
})

describe('dates', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('weekday, Sunday = 0', () => {
    expect(weekdayOf('2026-10-11')).toBe(0)
    expect(weekdayOf('2026-10-12')).toBe(1)
  })
  it('meal from the hour', () => {
    expect(mealForHour(8)).toBe('breakfast')
    expect(mealForHour(14)).toBe('lunch')
    expect(mealForHour(21)).toBe('dinner')
    expect(mealForHour(17)).toBe('snack')
  })
})

describe('weight trend', () => {
  it('smooths a noisy series and keeps the last weigh-in of a day', () => {
    const bw = [
      { d: '2026-01-01', w: 80, t: 1 }, { d: '2026-01-02', w: 81, t: 1 }, { d: '2026-01-02', w: 82, t: 2 },
      { d: '2026-01-03', w: 79, t: 1 }
    ]
    const tr = weightTrend(bw)
    expect(tr.map(p => p.d)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
    expect(tr[1].w).toBe(82)
    expect(tr[1].trend).toBeCloseTo(80.2, 5)
    expect(tr[2].trend).toBeCloseTo(80.08, 2)
  })
  it('a longer gap moves the trend further', () => {
    const one = weightTrend([{ d: '2026-01-01', w: 80 }, { d: '2026-01-02', w: 90 }])[1].trend
    const five = weightTrend([{ d: '2026-01-01', w: 80 }, { d: '2026-01-06', w: 90 }])[1].trend
    expect(five).toBeGreaterThan(one)
  })
  it('trendOn reads the last point on or before a day', () => {
    const tr = weightTrend([{ d: '2026-01-01', w: 80 }, { d: '2026-01-05', w: 80 }])
    expect(trendOn(tr, '2025-12-31')).toBeNull()
    expect(trendOn(tr, '2026-01-03')).toBe(80)
  })
})

describe('adaptive expenditure', () => {
  // 21 days eating 2,000 kcal while the weight falls steadily by 0.5 kg a week.
  const today = '2026-03-01'
  const log = {}, bodyweight = []
  for (let i = 1; i <= 28; i++) {
    const d = addDays(today, -i)
    log[d] = [{ name: 'food', qty: 1, k: 2000, p: 0, c: 0, f: 0 }]
    bodyweight.push({ d, w: 80 + (i * 0.5) / 7 })
  }
  it('is intake plus the energy the body gave up', () => {
    const r = adaptiveTdee(nState({ nutrition: { log } }), bodyweight, 'kg', today)
    expect(r.loggedDays).toBe(21)
    // 0.5 kg/week = 550 kcal/day out of storage; the EMA lags a little, so allow a margin.
    expect(r.tdee).toBeGreaterThan(2350)
    expect(r.tdee).toBeLessThan(2600)
    expect(r.changeKgPerWeek).toBeLessThan(0)
  })
  it('asks for more data when too few days are logged', () => {
    const few = Object.fromEntries(Object.entries(log).slice(0, 5))
    const r = adaptiveTdee(nState({ nutrition: { log: few } }), bodyweight, 'kg', today)
    expect(r.tdee).toBeNull()
    expect(r.loggedDays).toBe(5)
  })
  it('converts pounds before turning weight into calories', () => {
    const lb = bodyweight.map(b => ({ ...b, w: b.w / 0.45359237 }))
    const kg = adaptiveTdee(nState({ nutrition: { log } }), bodyweight, 'kg', today).tdee
    const inLb = adaptiveTdee(nState({ nutrition: { log } }), lb, 'lb', today).tdee
    expect(Math.abs(kg - inLb)).toBeLessThanOrEqual(10)
  })
  it('the weekly review suggests a target from it', () => {
    const S = { unit: 'kg', bodyweight, nutrition: { log, profile: { rateKgWk: -0.5 } } }
    const r = weeklyReview(S, today)
    expect(r.loggedDays).toBe(7)
    expect(r.avgKcal).toBe(2000)
    expect(r.source).toBe('adaptive')
    expect(r.suggested.kcal).toBeLessThan(r.tdee)
  })
})

describe('plan and shopping', () => {
  it('sums the week by name and unit', () => {
    const n = nState({ nutrition: { plan: {
      0: { breakfast: [{ name: 'Eggs', unit: 'egg', qty: 3, k: 72 }], lunch: [], dinner: [], snack: [] },
      1: { breakfast: [{ name: 'eggs', unit: 'egg', qty: 2, k: 72 }, { name: 'Bread', unit: 'loaf', qty: 1, k: 165 }] }
    } } })
    const list = shoppingList(n)
    expect(list[0]).toMatchObject({ name: 'Eggs', qty: 5, days: 2 })
    expect(list.find(x => x.name === 'Bread').qty).toBe(1)
  })
  it('recent items are unique by name, newest first', () => {
    const n = nState({ nutrition: { log: {
      '2026-01-01': [{ name: 'Rice', k: 1 }, { name: 'Tea', k: 1 }],
      '2026-01-02': [{ name: 'rice', k: 2 }]
    } } })
    expect(recentItems(n, '2026-01-03').map(x => x.name)).toEqual(['rice', 'Tea'])
  })
})

describe('AI answers are cleaned before they reach the log', () => {
  it('meal items', () => {
    const items = itemsFromMeal({ items: [
      { name: 'كبسة', grams: 400.4, kcal: 720.6, protein: 40, carbs: 80, fat: 25 },
      { name: '', grams: 0, kcal: 0 },
      { name: 'لبن', grams: 'x', kcal: -5, protein: 'a' }
    ] }, 'جم')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ name: 'كبسة', unit: '400 جم', qty: 1, k: 721, p: 40, src: 'ai' })
    expect(items[1]).toMatchObject({ name: 'لبن', k: 0, p: 0, unit: '' })
  })
  it('week plan', () => {
    const day = { breakfast: [{ name: 'بيض', unit: '3 حبات', kcal: 216, protein: 19, carbs: 1, fat: 15 }], lunch: [], dinner: [], snack: 'nope' }
    const plan = planFromAnswer({ days: Array(7).fill(day) })
    expect(Object.keys(plan)).toEqual(['0', '1', '2', '3', '4', '5', '6'])
    expect(plan['3'].breakfast[0]).toMatchObject({ name: 'بيض', k: 216, src: 'plan' })
    expect(plan['3'].snack).toEqual([])
  })
})

describe('built-in foods', () => {
  it('every food is complete and its macros roughly add up to its calories', () => {
    for (const x of FOODS_SA) {
      expect(x.ar && x.en && x.uAr && x.uEn).toBeTruthy()
      const fromMacros = x.p * 4 + x.c * 4 + x.f * 9
      if (x.k > 50) expect(Math.abs(fromMacros - x.k) / x.k).toBeLessThan(0.25)
    }
  })
  it('ids are unique', () => {
    expect(new Set(FOODS_SA.map(x => x.id)).size).toBe(FOODS_SA.length)
  })
  it('search matches Arabic and English', () => {
    expect(searchFoods(FOODS_SA, 'كبسة').length).toBeGreaterThan(1)
    expect(searchFoods(FOODS_SA, 'chicken kabsa')[0].id).toBe('kabsa-chicken')
    expect(foodItem(FOODS_SA[0], true)).toMatchObject({ name: 'كبسة دجاج', unit: 'صحن', qty: 1 })
  })
})
