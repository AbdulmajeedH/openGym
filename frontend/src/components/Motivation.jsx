// The encouraging message that pops up when the app is opened, and the sheet that sets the name
// Home greets you by. Which message, and its words, is lib/motivation.js; this is when it shows.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { effectiveRoutines, streakWeeks } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { L, isAr } from '../lib/nutrition-i18n.js'
import { greetingText, displayNameOf, sexOf, pickMessage, messageText } from '../lib/motivation.js'
import { Button, Segmented, TextField } from './ui.jsx'
import '../motivation.css'

// Back after this long away counts as opening the app again. A quick look at another app and
// back is not: a message every time you switch apps would stop being encouraging.
export const AWAY_MS = 10 * 60 * 1000
const LAST_KEY = 'gym_motivation_last'   // the message shown last, so the next one differs (this device only)
let shownThisLaunch = false

const readLast = () => { try { return localStorage.getItem(LAST_KEY) } catch { return null } }
const writeLast = id => { try { localStorage.setItem(LAST_KEY, id) } catch { /* storage blocked: repeats are harmless */ } }

/** What today looks like for the message: planned, already trained, the streak. */
export function motivationContext(S, now = new Date()) {
  const today = todayISO()
  let training = false, streak = 0
  try { training = effectiveRoutines(S, today).some(r => r.ex && r.ex.length) } catch { /* a malformed plan reads as rest */ }
  try { streak = streakWeeks(S) } catch { /* no streak */ }
  const done = (S.workouts || []).some(w => w.d === today)
  return { hour: now.getHours(), training, done, streak }
}

/** Opens the message now, unless it is switched off or something else has the screen. */
export function showMotivation() {
  const { S } = useStore.getState()
  if (S.motivation === false) return false
  // Mid-workout the sets come first; a sheet already open (a device-link code, a sync question)
  // is asking something that matters more.
  if (S.active && !S.active.editingWorkoutId) return false
  if (useUI.getState().sheets.length) return false
  const ctx = motivationContext(S)
  const msg = pickMessage(ctx, { lastId: readLast() })
  if (!msg) return false
  writeLast(msg.id)
  useUI.getState().openSheet(close => <MotivationCard msg={msg} ctx={ctx} close={close} />, { kind: 'center' })
  return true
}

/**
 * Shows the message once per launch, as soon as the app is in (signed in or a guest, past the
 * first-launch card), and again whenever it comes back after AWAY_MS in the background.
 */
export function useMotivationOnOpen(inApp) {
  useEffect(() => {
    if (!inApp) return
    let tm = null
    // A moment after the first screen has drawn, so the card lands on the app, not a blank page.
    if (!shownThisLaunch) { shownThisLaunch = true; tm = setTimeout(showMotivation, 700) }
    let hiddenAt = null
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return }
      if (hiddenAt != null && Date.now() - hiddenAt >= AWAY_MS) showMotivation()
      hiddenAt = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearTimeout(tm); document.removeEventListener('visibilitychange', onVisibility) }
  }, [inApp])
}

function MotivationCard({ msg, ctx, close }) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const name = displayNameOf(S, user)
  const hi = greetingText(ctx.hour)
  return <div className="mot">
    <div className="mot-emoji" aria-hidden="true">{msg.emoji}</div>
    <div className="mot-hi">{name ? hi + L(', {0}', '، {0}', name) : hi}</div>
    <p className="mot-text">{messageText(msg, { sex: sexOf(S), streak: ctx.streak })}</p>
    <Button variant="primary" onClick={close}>{L('Let’s go', 'يلا!')}</Button>
    {!name && <>
      <div style={{ height: 6 }} />
      <Button variant="ghost" className="dim" onClick={() => { close(); nameSheet() }}>{L('Add your name', 'أضف اسمك')}</Button>
    </>}
  </div>
}

/* ------------------------------------------------------------- the name -- */

export function nameSheet() {
  return useUI.getState().openSheet(close => <NameSheet close={close} />)
}

function NameSheet({ close }) {
  const S = useStore(s => s.S)
  const [name, setName] = useState(S.displayName || '')
  const [body, setBody] = useState(S.body === 'female' ? 'female' : 'male')
  const save = () => {
    useStore.getState().update(s => { s.displayName = name.trim().slice(0, 30); if (isAr()) s.body = body })
    useUI.getState().toast(L('Saved', 'انحفظ'))
    close()
  }
  return <>
    <h3>{L('Your name', 'اسمك')}</h3>
    <TextField value={name} maxLength={30} autoComplete="given-name" onChange={e => setName(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') save() }} placeholder={L('What should we call you?', 'وش نناديك؟')} />
    <div className="small muted" style={{ margin: '6px 2px 0' }}>{L('Home greets you with it, and so do the encouraging messages.', 'تظهر بالترحيب في الرئيسية وبالرسائل التشجيعية.')}</div>
    {/* Arabic speaks to a man and a woman differently. The setting is the body one (Look &
        Home → Body diagram), so the muscle map and the exercise drawings follow it too. */}
    {isAr() && <>
      <div className="mot-label">{L('Talk to me as', 'خاطبني بصيغة')}</div>
      <Segmented value={body} onChange={setBody} options={[{ value: 'male', label: 'مذكّر' }, { value: 'female', label: 'مؤنّث' }]} />
    </>}
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{L('Save', 'حفظ')}</Button>
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Cancel', 'إلغاء')}</Button>
  </>
}
