import { afterEach, describe, expect, it } from 'vitest'
import { _setLangState } from './i18n-core.js'
import {
  greetingPart, greetingText, displayNameOf, sexOf, MESSAGES, messagesFor, pickMessage, weeksText, messageText
} from './motivation.js'

afterEach(() => _setLangState('en', {}, null, null))
const ar = () => _setLangState('ar', {}, null, null)
const ids = list => list.map(m => m.id)

describe('greeting', () => {
  it('morning until noon, then afternoon, evening from five', () => {
    expect([4, 11, 12, 16, 17, 23, 0, 3].map(greetingPart))
      .toEqual(['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'evening', 'evening'])
  })
  it('Arabic says صباح الخير in the morning and مساء الخير from noon', () => {
    ar()
    expect(greetingText(8)).toBe('صباح الخير')
    expect(greetingText(13)).toBe('مساء الخير')
    expect(greetingText(21)).toBe('مساء الخير')
  })
  it('English has an afternoon', () => {
    expect(greetingText(8)).toBe('Good morning')
    expect(greetingText(13)).toBe('Good afternoon')
    expect(greetingText(21)).toBe('Good evening')
  })
  it('the name set on this device wins over the account’s, and blanks do not count', () => {
    expect(displayNameOf({ displayName: ' Sara ' }, { name: 'sara42' })).toBe('Sara')
    expect(displayNameOf({ displayName: '  ' }, { name: 'sara42' })).toBe('sara42')
    expect(displayNameOf({}, null)).toBe('')
  })
  it('Arabic addresses the user by the body set in Settings', () => {
    expect(sexOf({ body: 'female' })).toBe('female')
    expect(sexOf({ body: 'male' })).toBe('male')
    expect(sexOf({})).toBe('male')
  })
})

describe('messages', () => {
  it('every message has words in both languages, and both forms where Arabic needs them', () => {
    const seen = new Set()
    for (const m of MESSAGES) {
      expect(seen.has(m.id)).toBe(false); seen.add(m.id)
      expect(m.en).toBeTruthy()
      expect(m.emoji).toBeTruthy()
      if (typeof m.ar !== 'string') { expect(m.ar.m).toBeTruthy(); expect(m.ar.f).toBeTruthy(); expect(m.ar.m).not.toBe(m.ar.f) }
    }
  })
  it('a planned day talks about training until the workout is logged', () => {
    const before = ids(messagesFor({ hour: 14, training: true }).specific)
    expect(before).toContain('train-day')
    expect(before).not.toContain('rest-grow')
    const after = ids(messagesFor({ hour: 14, training: true, done: true }).specific)
    expect(after).toContain('done-win')
    expect(after).not.toContain('train-day')
  })
  it('a day with nothing planned is a rest day', () => {
    const s = ids(messagesFor({ hour: 14 }).specific)
    expect(s).toContain('rest-grow')
    expect(s).not.toContain('train-day')
  })
  it('the streak line needs two weeks; morning and night lines their hours', () => {
    expect(ids(messagesFor({ hour: 14, streak: 1 }).specific)).not.toContain('streak')
    expect(ids(messagesFor({ hour: 14, streak: 2 }).specific)).toContain('streak')
    expect(ids(messagesFor({ hour: 7 }).specific)).toContain('morning')
    expect(ids(messagesFor({ hour: 22 }).specific)).toContain('night')
    expect(ids(messagesFor({ hour: 14 }).specific)).not.toContain('night')
  })
  it('picks about today first, a general one otherwise', () => {
    const ctx = { hour: 14, training: true }
    expect(pickMessage(ctx, { rand: () => 0 }).when).toBe('training')
    expect(pickMessage(ctx, { rand: () => 0.9 }).when).toBe('any')
  })
  it('never shows the same message twice in a row', () => {
    const ctx = { hour: 14, training: true }
    const first = pickMessage(ctx, { rand: () => 0 })
    for (const r of [0, 0.1, 0.3, 0.59]) expect(pickMessage(ctx, { lastId: first.id, rand: () => r }).id).not.toBe(first.id)
  })
  it('counts weeks the Arabic way', () => {
    ar()
    expect([1, 2, 3, 10, 11].map(weeksText)).toEqual(['أسبوع', 'أسبوعين', '3 أسابيع', '10 أسابيع', '11 أسبوع'])
  })
  it('speaks to a woman as a woman in Arabic, and fills in the streak', () => {
    const streak = MESSAGES.find(m => m.id === 'streak')
    ar()
    expect(messageText(streak, { sex: 'female', streak: 2 })).toBe('أسبوعين ورا بعض! لا تكسرين السلسلة.')
    expect(messageText(streak, { sex: 'male', streak: 4 })).toBe('4 أسابيع ورا بعض! لا تكسر السلسلة.')
    _setLangState('en', {}, null, null)
    expect(messageText(streak, { sex: 'female', streak: 3 })).toBe('3 weeks in a row. Don’t break the chain!')
  })
})
