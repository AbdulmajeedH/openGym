// The sheets of the nutrition screens: adding food (Claude, search, quick), editing an item,
// the targets, the Claude settings, the weekly review, the shopping list and the AI week plan.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  MEALS, ACTIVITY, GOAL_RATES, nState, ensureN, totals, itemKcal, recentItems, cleanItem,
  formulaTdee, targetsFor, latestKg, weeklyReview, shoppingList, fromKg
} from '../lib/nutrition.js'
import { FOODS_SA, foodItem, searchFoods } from '../lib/foods-sa.js'
import {
  DEFAULT_MODEL, MODEL_CHOICES, estimateMeal, generateWeekPlan, getFoodKey, setFoodKey, listModels, readImage
} from '../lib/food-ai.js'
import { L, isAr, n0, n1, MEAL_LABEL, DAY_LABEL, aiErrorText } from '../lib/nutrition-i18n.js'
import { todayISO, uid, fmtDate } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button, NumberField, Section, Row, Segmented, SearchField, Stepper, Switch, TextArea, TextField } from './ui.jsx'

const update = fn => useStore.getState().update(fn)
const toast = m => useUI.getState().toast(m)
const openSheet = render => useUI.getState().openSheet(render)

/* ------------------------------------------------------------------ writes -- */

// A target says where items go: { kind: 'log', date, meal } or { kind: 'plan', wd, meal }.
export function addItems(target, items, meal = target.meal) {
  const clean = items.map(it => cleanItem(it, uid())).filter(Boolean).map(it => ({ ...it, id: uid() }))
  if (!clean.length) return 0
  update(S => {
    const n = ensureN(S)
    if (target.kind === 'plan') {
      const day = n.plan[String(target.wd)] = { ...(n.plan[String(target.wd)] || {}) }
      day[meal] = [...(day[meal] || []), ...clean]
    } else {
      n.log[target.date] = [...(n.log[target.date] || []), ...clean.map(it => ({ ...it, meal }))]
    }
  })
  return clean.length
}

function replaceItem(target, id, next) {
  update(S => {
    const n = ensureN(S)
    if (target.kind === 'plan') {
      // Plan items carry no meal field: the list they sit in is their meal. Same meal keeps its
      // place; a different one drops it from the old list and appends it to the new one.
      const day = { ...(n.plan[String(target.wd)] || {}) }
      const dest = next?.meal || target.meal
      const strip = ({ meal, ...rest }) => rest
      let placed = false
      for (const m of MEALS) {
        day[m] = (day[m] || []).flatMap(it => {
          if (it.id !== id) return [it]
          if (next && m === dest) { placed = true; return [strip(next)] }
          return []
        })
      }
      if (next && !placed) day[dest] = [...(day[dest] || []), strip(next)]
      n.plan[String(target.wd)] = day
    } else {
      n.log[target.date] = (n.log[target.date] || []).flatMap(it => (it.id === id ? (next ? [next] : []) : [it]))
    }
  })
}

/* --------------------------------------------------------------- add food -- */

export function addFoodSheet(target) {
  return openSheet(close => <AddFood target={target} close={close} />)
}

function AddFood({ target, close }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const [tab, setTab] = useState('ai')
  const [meal, setMeal] = useState(target.meal || 'snack')
  const where = target.kind === 'plan' ? DAY_LABEL[target.wd]() : target.date === todayISO() ? L('today', 'اليوم') : fmtDate(target.date, true)
  const done = (items, msg) => {
    const k = addItems(target, items, meal)
    if (k) { toast(msg || L('Added to {0}', 'انضاف لـ{0}', MEAL_LABEL[meal]())); close() }
  }
  return <>
    <h3>{L('Add food', 'أضف أكل')} <span className="muted" style={{ fontWeight: 400, fontSize: 15 }}>· {where}</span></h3>
    <Segmented className="nt-meal-seg" value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: MEAL_LABEL[m]() }))} />
    <div style={{ height: 10 }} />
    <Segmented value={tab} onChange={setTab} options={[
      { value: 'ai', label: L('Claude', 'Claude ✨') },
      { value: 'search', label: L('Search', 'بحث') },
      { value: 'quick', label: L('Quick add', 'سريع') }
    ]} />
    <div style={{ height: 14 }} />
    {tab === 'ai' && <AiTab n={n} onAdd={done} />}
    {tab === 'search' && <SearchTab n={n} onAdd={done} />}
    {tab === 'quick' && <QuickTab onAdd={done} />}
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Cancel', 'إلغاء')}</Button>
  </>
}

function AiTab({ n, onAdd }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)   // { items, note }
  const [hasKey, setHasKey] = useState(null)
  const fileRef = useRef(null)
  useEffect(() => { getFoodKey().then(k => setHasKey(!!k)) }, [])

  const pick = async e => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    try { setImage(await readImage(f)) } catch { setErr(L('Could not read that image.', 'ما قدرت أقرأ الصورة.')) }
  }
  const run = async () => {
    if (!text.trim() && !image) return
    setBusy(true); setErr(null); setResult(null)
    try { setResult(await estimateMeal({ text, image, model: n.aiModel, gramsLabel: L('g', 'جم') })) }
    catch (e) { setErr(aiErrorText(e)); if (e?.code === 'nokey' || e?.code === 'auth') setHasKey(false) }
    finally { setBusy(false) }
  }

  if (hasKey === false) return <div className="nt-empty">
    <Icon name="sparkles" style={{ fontSize: 28, color: 'var(--acc)' }} />
    <p>{L('Describe or photograph a meal and Claude estimates it. Add your Anthropic API key to start.', 'اكتب وجبتك أو صوّرها، وClaude يحسب سعراتها. أضف مفتاح Anthropic API عشان تبدأ.')}</p>
    <Button variant="tinted" onClick={() => aiSettingsSheet(() => setHasKey(true))}>{L('Set up Claude', 'إعداد Claude')}</Button>
  </div>

  if (result) return <AiResult result={result} onAdd={onAdd} onBack={() => setResult(null)} />

  return <>
    <TextArea value={text} onChange={e => setText(e.target.value)} rows={3}
      placeholder={L('e.g. a medium plate of chicken kabsa and a cup of laban', 'مثال: صحن كبسة دجاج وسط وكوب لبن')} />
    <div style={{ height: 10 }} />
    <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={pick} />
    {image ? <div className="nt-photo">
      <img src={image.preview} alt="" />
      <button className="iconbtn" onClick={() => setImage(null)} aria-label={L('Remove photo', 'شيل الصورة')}><Icon name="xmark" /></button>
    </div> : <Button variant="tinted" icon="camera" onClick={() => fileRef.current?.click()}>{L('Add a photo', 'أضف صورة')}</Button>}
    <div style={{ height: 10 }} />
    {err && <div className="nt-err">{err}</div>}
    <Button variant="primary" icon={busy ? null : 'sparkles'} disabled={busy || (!text.trim() && !image)} onClick={run}>
      {busy ? L('Claude is estimating…', 'Claude يحسب…') : L('Estimate', 'احسب')}
    </Button>
  </>
}

function AiResult({ result, onAdd, onBack }) {
  const [items, setItems] = useState(result.items)
  const set = (i, patch) => setItems(list => list.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const tot = totals(items)
  return <>
    {result.note && <div className="nt-note"><Icon name="info" /> {result.note}</div>}
    <div className="nt-ai-list">
      {items.map((it, i) => <div className="nt-ai-item" key={it.id}>
        <div className="row" style={{ gap: 8 }}>
          <TextField value={it.name} onChange={e => set(i, { name: e.target.value })} />
          <button className="iconbtn" style={{ color: 'var(--red)' }} onClick={() => setItems(l => l.filter((_, j) => j !== i))} aria-label={L('Remove', 'حذف')}><Icon name="trash" /></button>
        </div>
        {it.unit && <div className="small muted" style={{ margin: '4px 2px 0' }}>{it.unit}</div>}
        <MacroFields item={it} onChange={patch => set(i, patch)} />
      </div>)}
    </div>
    <div className="nt-total-line"><b>{n0(tot.kcal)} {L('kcal', 'سعرة')}</b> · {L('P', 'بروتين')} {n1(tot.p)} · {L('C', 'كارب')} {n1(tot.c)} · {L('F', 'دهون')} {n1(tot.f)}</div>
    <Button variant="primary" icon="plus" disabled={!items.length} onClick={() => onAdd(items)}>{L('Add to log', 'أضف للسجل')}</Button>
    <div style={{ height: 6 }} />
    <Button variant="ghost" onClick={onBack}>{L('Back', 'رجوع')}</Button>
  </>
}

function MacroFields({ item, onChange }) {
  const f = (key, label) => <label className="nt-mf">
    <span>{label}</span>
    <NumberField value={item[key]} onChange={v => onChange({ [key]: v })} />
  </label>
  return <div className="nt-mfs">
    {f('k', L('kcal', 'سعرات'))}{f('p', L('Protein', 'بروتين'))}{f('c', L('Carbs', 'كارب'))}{f('f', L('Fat', 'دهون'))}
  </div>
}

function SearchTab({ n, onAdd }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(null)   // { item, qty }
  const ar = isAr()
  const today = todayISO()
  const recent = useMemo(() => recentItems(n, today), [n.log])
  const builtIn = useMemo(() => FOODS_SA.map(x => ({ ...foodItem(x, ar), ar: x.ar, en: x.en, key: 'db:' + x.id })), [ar])
  const mine = n.foods.map(x => ({ ...x, key: 'mine:' + x.id }))
  const favs = searchFoods(n.favs, q)
  const lists = q.trim()
    ? [{ title: L('Results', 'النتائج'), items: [...searchFoods(mine, q), ...searchFoods(recent.map(x => ({ ...x, key: 'r:' + x.id })), q), ...searchFoods(builtIn, q)] }]
    : [
      { title: L('Recent', 'الأخيرة'), items: recent.slice(0, 8).map(x => ({ ...x, key: 'r:' + x.id })) },
      { title: L('My foods', 'أكلاتي'), items: mine },
      { title: L('Saudi foods', 'أكلات سعودية'), items: builtIn }
    ]
  const seen = new Set()
  const dedupe = items => items.filter(x => { const k = (x.name || '').toLowerCase() + '|' + (x.unit || ''); if (seen.has(k)) return false; seen.add(k); return true })

  if (picked) {
    const it = picked.item
    return <div>
      <div className="nt-picked">
        <div style={{ fontWeight: 600, fontSize: 17 }}>{it.name}</div>
        <div className="small muted">{it.unit ? L('per {0}', 'لكل {0}', it.unit) + ': ' : ''}{n0(it.k)} {L('kcal', 'سعرة')} · {L('P', 'ب')} {n1(it.p)} · {L('C', 'ك')} {n1(it.c)} · {L('F', 'د')} {n1(it.f)}</div>
        <div style={{ height: 12 }} />
        <Stepper value={picked.qty} step={0.5} min={0.25} onChange={v => setPicked({ ...picked, qty: v })} label={L('Servings', 'الكمية')} unit={it.unit} />
        <div className="nt-total-line"><b>{n0(it.k * picked.qty)} {L('kcal', 'سعرة')}</b> · {L('P', 'بروتين')} {n1(it.p * picked.qty)}</div>
      </div>
      <Button variant="primary" icon="plus" onClick={() => onAdd([{ ...it, qty: picked.qty }])}>{L('Add', 'أضف')}</Button>
      <div style={{ height: 6 }} />
      <Button variant="ghost" onClick={() => setPicked(null)}>{L('Back', 'رجوع')}</Button>
    </div>
  }

  return <>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={L('Search foods', 'ابحث عن أكلة')} />
    <div style={{ height: 8 }} />
    {favs.length > 0 && <div className="nt-group">
      <div className="nt-group-t">{L('Saved meals', 'وجبات محفوظة')}</div>
      {favs.map(f => { const tt = totals(f.items); return <button className="nt-food" key={f.id} onClick={() => onAdd(f.items, L('Meal added', 'انضافت الوجبة'))}>
        <span className="nt-food-m"><span className="nt-food-t"><Icon name="starFill" style={{ color: 'var(--yellow)', fontSize: 13 }} /> {f.name}</span><span className="nt-food-s">{f.items.length} {L('items', 'أصناف')}</span></span>
        <span className="nt-food-k">{n0(tt.kcal)}</span>
      </button> })}
    </div>}
    {lists.map(list => { const items = dedupe(list.items); return items.length > 0 && <div className="nt-group" key={list.title}>
      <div className="nt-group-t">{list.title}</div>
      {items.slice(0, 80).map(x => <button className="nt-food" key={x.key} onClick={() => setPicked({ item: x, qty: x.qty && x.src !== 'db' ? x.qty : 1 })}>
        <span className="nt-food-m"><span className="nt-food-t">{x.name}</span><span className="nt-food-s">{x.unit || ''}</span></span>
        <span className="nt-food-k">{n0(x.k)}</span>
      </button>)}
    </div> })}
    {q.trim() && !lists[0].items.length && !favs.length && <div className="empty small">{L('Nothing found. Try Claude or quick add.', 'ما لقيت شي. جرّب Claude أو الإضافة السريعة.')}</div>}
  </>
}

function QuickTab({ onAdd }) {
  const [it, setIt] = useState({ name: '', unit: '', k: null, p: null, c: null, f: null })
  const [save, setSave] = useState(false)
  const add = () => {
    const item = { ...it, name: it.name.trim() || L('Quick add', 'إضافة سريعة'), qty: 1, src: 'quick' }
    if (save && it.name.trim()) update(S => { const n = ensureN(S); n.foods = [...n.foods, { ...cleanItem(item, uid()), id: uid(), src: 'food' }] })
    onAdd([item])
  }
  return <>
    <TextField value={it.name} onChange={e => setIt({ ...it, name: e.target.value })} placeholder={L('Name (optional)', 'الاسم (اختياري)')} />
    <div style={{ height: 8 }} />
    <TextField value={it.unit} onChange={e => setIt({ ...it, unit: e.target.value })} placeholder={L('Portion, e.g. plate (optional)', 'الكمية، مثل: صحن (اختياري)')} />
    <MacroFields item={it} onChange={patch => setIt({ ...it, ...patch })} />
    <div className="row between nt-switch-row">
      <span>{L('Save to my foods', 'احفظ في أكلاتي')}</span>
      <Switch checked={save} onChange={setSave} />
    </div>
    <Button variant="primary" icon="plus" disabled={!(it.k > 0)} onClick={add}>{L('Add', 'أضف')}</Button>
  </>
}

/* ------------------------------------------------------------- edit an item -- */

export function itemSheet(target, item) {
  return openSheet(close => <ItemEdit target={target} item={item} close={close} />)
}

function ItemEdit({ target, item, close }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const [it, setIt] = useState(item)
  const [meal, setMeal] = useState(item.meal || target.meal || 'snack')
  const repeating = n.repeat.some(r => r.item.name === item.name && r.meal === meal)
  const save = () => {
    replaceItem(target, item.id, { ...it, meal })
    close()
  }
  const remove = () => { replaceItem(target, item.id, null); toast(L('Removed', 'انحذف')); close() }
  const saveFood = () => {
    update(S => { const n = ensureN(S); n.foods = [...n.foods.filter(f => f.name !== it.name || f.unit !== it.unit), { ...cleanItem({ ...it, qty: 1 }, uid()), id: uid(), src: 'food' }] })
    toast(L('Saved to my foods', 'انحفظت في أكلاتي'))
  }
  const toggleRepeat = on => update(S => {
    const n = ensureN(S)
    n.repeat = n.repeat.filter(r => !(r.item.name === it.name && r.meal === meal))
    if (on) n.repeat.push({ id: uid(), meal, item: { ...cleanItem(it, uid()), id: undefined } })
    // today already has it: don't add it a second time when the day screen next opens
    n.applied = { ...n.applied, [todayISO()]: true }
  })
  return <>
    <h3>{L('Edit', 'تعديل')}</h3>
    <TextField value={it.name} onChange={e => setIt({ ...it, name: e.target.value })} />
    <div style={{ height: 10 }} />
    <Stepper value={it.qty} step={0.5} min={0.25} onChange={v => setIt({ ...it, qty: v })} label={L('Servings', 'الكمية')} unit={it.unit} />
    <div className="small muted" style={{ margin: '10px 2px 0' }}>{L('Per serving', 'لكل حصة')}{it.unit ? ' (' + it.unit + ')' : ''}</div>
    <MacroFields item={it} onChange={patch => setIt({ ...it, ...patch })} />
    <div className="nt-total-line"><b>{n0(itemKcal(it))} {L('kcal', 'سعرة')}</b> · {L('P', 'بروتين')} {n1(it.p * it.qty)} · {L('C', 'كارب')} {n1(it.c * it.qty)} · {L('F', 'دهون')} {n1(it.f * it.qty)}</div>
    <Segmented className="nt-meal-seg" value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: MEAL_LABEL[m]() }))} />
    <div style={{ height: 6 }} />
    {target.kind === 'log' && <div className="row between nt-switch-row">
      <span>{L('Add to every day', 'أضفها كل يوم تلقائياً')}</span>
      <Switch checked={repeating} onChange={toggleRepeat} />
    </div>}
    <Button variant="primary" onClick={save}>{L('Save', 'حفظ')}</Button>
    <div style={{ height: 8 }} />
    <div className="row" style={{ gap: 8 }}>
      <Button variant="tinted" size="sm" icon="star" onClick={saveFood}>{L('Save to my foods', 'احفظ في أكلاتي')}</Button>
      <Button variant="danger" size="sm" icon="trash" onClick={remove}>{L('Delete', 'حذف')}</Button>
    </div>
  </>
}

/* ----------------------------------------------------------------- targets -- */

export function targetsSheet() {
  return openSheet(close => <Targets close={close} />)
}

function Targets({ close }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const unit = S.unit || 'kg'
  const [p, setP] = useState(n.profile)
  const [w, setW] = useState(() => { const kg = latestKg(S.bodyweight, unit); return kg ? Math.round(fromKg(kg, unit) * 10) / 10 : null })
  const [manual, setManual] = useState(false)
  const [g, setG] = useState(n.goal || { kcal: 2000, p: 150, c: 200, f: 60 })
  const weightKg = w ? (unit === 'lb' ? w * 0.45359237 : w) : null
  const tdee = weightKg ? formulaTdee(p, weightKg) : null
  const auto = tdee ? targetsFor({ tdee, rateKgWk: p.rateKgWk, weightKg, proteinPerKg: p.proteinPerKg }) : null
  const setGoalType = goalType => setP({ ...p, goalType, rateKgWk: GOAL_RATES[goalType] })
  const save = () => {
    const goal = manual ? g : auto
    if (!goal || !(goal.kcal > 0)) { toast(L('Fill in your weight, height and age.', 'عبّ الوزن والطول والعمر.')); return }
    update(S => { const n = ensureN(S); n.profile = p; n.goal = { kcal: goal.kcal, p: goal.p, c: goal.c, f: goal.f } })
    toast(L('Targets saved', 'انحفظت الأهداف'))
    close()
  }
  const num = (label, value, onChange, suffix) => <label className="nt-mf nt-mf-wide">
    <span>{label}</span>
    <span className="row" style={{ gap: 6 }}><NumberField value={value} onChange={onChange} />{suffix && <span className="muted small">{suffix}</span>}</span>
  </label>
  const rates = p.goalType === 'cut' ? [-0.25, -0.5, -0.75, -1] : p.goalType === 'bulk' ? [0.1, 0.25, 0.5] : [0]
  return <>
    <h3>{L('Daily targets', 'أهدافك اليومية')}</h3>
    <Segmented value={p.sex} onChange={sex => setP({ ...p, sex })} options={[{ value: 'male', label: L('Male', 'ذكر') }, { value: 'female', label: L('Female', 'أنثى') }]} />
    <div className="nt-mfs nt-mfs-3">
      {num(L('Age', 'العمر'), p.age, age => setP({ ...p, age }))}
      {num(L('Height', 'الطول'), p.heightCm, heightCm => setP({ ...p, heightCm }), L('cm', 'سم'))}
      {num(L('Weight', 'الوزن'), w, setW, unit === 'lb' ? 'lb' : L('kg', 'كجم'))}
    </div>
    <div className="nt-label">{L('Activity outside the gym', 'نشاطك اليومي خارج النادي')}</div>
    <div className="chips nt-chips-wrap">
      {Object.keys(ACTIVITY).map(a => <button key={a} className={'chip' + (p.activity === a ? ' on' : '')} onClick={() => setP({ ...p, activity: a })}>{{
        sedentary: L('Desk', 'مكتبي'), light: L('Light', 'خفيف'), moderate: L('Moderate', 'متوسط'), active: L('Active', 'نشيط'), very: L('Very active', 'نشيط جداً')
      }[a]}</button>)}
    </div>
    <div className="nt-label">{L('Goal', 'الهدف')}</div>
    <Segmented value={p.goalType} onChange={setGoalType} options={[
      { value: 'cut', label: L('Lose fat', 'تنشيف') }, { value: 'maintain', label: L('Maintain', 'ثبات') }, { value: 'bulk', label: L('Build', 'تضخيم') }
    ]} />
    {rates.length > 1 && <div className="chips nt-chips-wrap" style={{ marginTop: 8 }}>
      {rates.map(r => <button key={r} className={'chip' + (p.rateKgWk === r ? ' on' : '')} onClick={() => setP({ ...p, rateKgWk: r })}>{r > 0 ? '+' : ''}{r} {L('kg/week', 'كجم/أسبوع')}</button>)}
    </div>}
    <div className="nt-mfs nt-mfs-2">
      {num(L('Protein per kg', 'بروتين لكل كيلو'), p.proteinPerKg, proteinPerKg => setP({ ...p, proteinPerKg }), L('g', 'جم'))}
      {num(L('Extra on training days', 'زيادة أيام التمرين'), p.trainingBonus, trainingBonus => setP({ ...p, trainingBonus }), L('kcal', 'سعرة'))}
    </div>

    {!manual && auto && <div className="nt-preview">
      <div className="small muted">{L('Estimated expenditure: {0} kcal', 'احتياجك التقديري: {0} سعرة', n0(tdee))}</div>
      <div className="nt-preview-k">{n0(auto.kcal)} <span>{L('kcal / day', 'سعرة / يوم')}</span></div>
      <div className="small">{L('Protein', 'بروتين')} {auto.p} · {L('Carbs', 'كارب')} {auto.c} · {L('Fat', 'دهون')} {auto.f} {L('g', 'جم')}</div>
    </div>}
    <div className="row between nt-switch-row">
      <span>{L('Set the numbers myself', 'أحدد الأرقام بنفسي')}</span>
      <Switch checked={manual} onChange={setManual} />
    </div>
    {manual && <MacroFields item={{ k: g.kcal, p: g.p, c: g.c, f: g.f }} onChange={patch => setG({ ...g, ...('k' in patch ? { kcal: patch.k } : patch) })} />}
    <div style={{ height: 10 }} />
    <Button variant="primary" onClick={save}>{L('Save targets', 'احفظ الأهداف')}</Button>
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Cancel', 'إلغاء')}</Button>
  </>
}

/* ---------------------------------------------------------- Claude settings -- */

export function aiSettingsSheet(onSaved) {
  return openSheet(close => <AiSettings close={close} onSaved={onSaved} />)
}

function AiSettings({ close, onSaved }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [model, setModel] = useState(n.aiModel || DEFAULT_MODEL)
  const [models, setModels] = useState(MODEL_CHOICES)
  const [state, setState] = useState(null)   // { ok, text }
  const [busy, setBusy] = useState(false)
  useEffect(() => { getFoodKey().then(k => setSaved(!!k)) }, [])

  const test = async () => {
    setBusy(true); setState(null)
    try {
      const k = key.trim() || await getFoodKey()
      const list = await listModels(k)
      if (key.trim()) { await setFoodKey(key.trim()); setSaved(true); setKey('') }
      if (list.length) {
        setModels(list)
        if (!list.includes(model)) setModel(list.find(x => /sonnet/.test(x)) || list[0])
      }
      setState({ ok: true, text: L('Connected. {0} models available.', 'تم الاتصال. {0} نموذج متاح.', list.length) })
    } catch (e) { setState({ ok: false, text: aiErrorText(e) }) }
    finally { setBusy(false) }
  }
  const save = async () => {
    if (key.trim()) await setFoodKey(key.trim())
    update(S => { ensureN(S).aiModel = model })
    toast(L('Claude settings saved', 'انحفظت إعدادات Claude'))
    if ((key.trim() || saved) && onSaved) onSaved()
    close()
  }
  const remove = async () => { await setFoodKey(''); setSaved(false); toast(L('Key removed', 'انحذف المفتاح')) }

  return <>
    <h3>{L('Claude (Anthropic API)', 'Claude (Anthropic API)')}</h3>
    <p className="small muted" style={{ marginBottom: 12 }}>{L(
      'Your phone talks to Claude directly with your own key. Each meal costs a fraction of a cent to a few cents. The meal text or photo is sent to Anthropic; the rest of your data stays here.',
      'جوالك يتصل بـ Claude مباشرة بمفتاحك. كل وجبة تكلف سنتات بسيطة. نص الوجبة أو صورتها ينرسل لـ Anthropic، وباقي بياناتك تبقى هنا.'
    )}</p>
    <TextField type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)}
      placeholder={saved ? L('Key saved — paste a new one to replace', 'المفتاح محفوظ — الصق مفتاح جديد لاستبداله') : 'sk-ant-…'} />
    <div className="small muted" style={{ margin: '6px 2px 12px' }}>{L('Get a key at console.anthropic.com → API keys.', 'تحصل المفتاح من console.anthropic.com ← API keys.')}</div>
    <div className="nt-label">{L('Model', 'النموذج')}</div>
    <div className="chips nt-chips-wrap">
      {models.map(m => <button key={m} className={'chip nocap' + (model === m ? ' on' : '')} onClick={() => setModel(m)}>{m}</button>)}
    </div>
    <div className="small muted" style={{ margin: '4px 2px 12px' }}>{L('Sonnet is the best balance for food photos. Haiku is cheaper, Opus is the most careful.', 'Sonnet أفضل توازن لصور الأكل. Haiku أرخص، وOpus أدق.')}</div>
    {state && <div className={state.ok ? 'nt-ok' : 'nt-err'}>{state.text}</div>}
    <Button variant="tinted" disabled={busy || (!key.trim() && !saved)} onClick={test}>{busy ? L('Testing…', 'جاري الاختبار…') : L('Test connection', 'اختبر الاتصال')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="primary" onClick={save}>{L('Save', 'حفظ')}</Button>
    {saved && <><div style={{ height: 6 }} /><Button variant="ghost" style={{ color: 'var(--red)' }} onClick={remove}>{L('Remove key', 'احذف المفتاح')}</Button></>}
  </>
}

/* ----------------------------------------------------------- weekly review -- */

export function checkInSheet() {
  return openSheet(close => <CheckInReview close={close} />)
}

function CheckInReview({ close }) {
  const S = useStore(s => s.S)
  const r = weeklyReview(S, todayISO())
  const unit = S.unit === 'lb' ? 'lb' : L('kg', 'كجم')
  const apply = () => {
    update(S => { ensureN(S).goal = { ...r.suggested } })
    toast(L('New targets applied', 'تم تطبيق الأهداف الجديدة'))
    close()
  }
  const diff = r.suggested && r.current ? r.suggested.kcal - r.current.kcal : null
  return <>
    <h3>{L('Weekly review', 'المراجعة الأسبوعية')}</h3>
    <div className="nt-review">
      <div className="nt-rv"><span>{L('Days logged', 'أيام مسجلة')}</span><b>{r.loggedDays} / 7</b></div>
      <div className="nt-rv"><span>{L('Average intake', 'متوسط أكلك')}</span><b>{r.avgKcal != null ? n0(r.avgKcal) + ' ' + L('kcal', 'سعرة') : '–'}</b></div>
      <div className="nt-rv"><span>{L('Average protein', 'متوسط البروتين')}</span><b>{r.avgP != null ? n0(r.avgP) + ' ' + L('g', 'جم') : '–'}</b></div>
      <div className="nt-rv"><span>{L('Trend weight', 'الوزن (الاتجاه)')}</span><b>{r.trendEnd != null ? n1(r.trendEnd) + ' ' + unit : '–'}</b></div>
      <div className="nt-rv"><span>{L('Change this week', 'التغيّر هالأسبوع')}</span><b>{r.trendChange != null ? (r.trendChange > 0 ? '+' : '') + n1(r.trendChange) + ' ' + unit : '–'}</b></div>
      <div className="nt-rv"><span>{r.source === 'adaptive' ? L('Your measured expenditure', 'احتياجك المحسوب من بياناتك') : L('Estimated expenditure', 'احتياجك التقديري')}</span><b>{r.tdee ? n0(r.tdee) + ' ' + L('kcal', 'سعرة') : '–'}</b></div>
    </div>
    {r.source !== 'adaptive' && <p className="small muted" style={{ margin: '10px 2px' }}>{L(
      'Log at least {0} days in three weeks and weigh in regularly, and this switches from the formula to your real expenditure ({1} days so far).',
      'سجّل أكلك {0} أيام على الأقل خلال ٣ أسابيع وقِس وزنك بانتظام، وبيتحوّل الحساب من المعادلة لاحتياجك الحقيقي (سجلت {1} أيام لين الحين).',
      r.adaptive.needDays, r.adaptive.loggedDays)}</p>}
    {r.suggested ? <div className="nt-preview">
      <div className="small muted">{L('Suggested target', 'الهدف المقترح')}</div>
      <div className="nt-preview-k">{n0(r.suggested.kcal)} <span>{L('kcal / day', 'سعرة / يوم')}</span></div>
      <div className="small">{L('Protein', 'بروتين')} {r.suggested.p} · {L('Carbs', 'كارب')} {r.suggested.c} · {L('Fat', 'دهون')} {r.suggested.f} {L('g', 'جم')}</div>
      {diff != null && <div className="small muted" style={{ marginTop: 4 }}>{diff === 0 ? L('Same as now.', 'نفس هدفك الحالي.') : L('{0} kcal vs. now', '{0} سعرة عن الحالي', (diff > 0 ? '+' : '') + n0(diff))}</div>}
    </div> : <div className="empty small">{L('Log your weight and set your profile to get a suggestion.', 'سجّل وزنك وعبّ بياناتك عشان يطلع لك اقتراح.')}</div>}
    <div style={{ height: 10 }} />
    {r.suggested && <Button variant="primary" onClick={apply}>{L('Apply suggested target', 'طبّق الهدف المقترح')}</Button>}
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Close', 'إغلاق')}</Button>
  </>
}

/* ----------------------------------------------------------- shopping list -- */

export function shoppingSheet() {
  return openSheet(close => <Shopping close={close} />)
}

function Shopping({ close }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const list = shoppingList(n)
  const key = x => x.name + '|' + x.unit
  const toggle = x => update(S => { const n = ensureN(S); const k = key(x); n.shopChecked = { ...n.shopChecked }; if (n.shopChecked[k]) delete n.shopChecked[k]; else n.shopChecked[k] = true })
  const clear = () => update(S => { ensureN(S).shopChecked = {} })
  const left = list.filter(x => !n.shopChecked[key(x)]).length
  const share = async () => {
    const text = list.map(x => `${n.shopChecked[key(x)] ? '✓' : '•'} ${x.name}${x.qty ? ' — ' + n1(x.qty) + (x.unit ? ' × ' + x.unit : '') : ''}`).join('\n')
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast(L('Copied', 'انسخت')) } } catch { /* cancelled */ }
  }
  return <>
    <h3>{L('Shopping list', 'قائمة المشتريات')}</h3>
    {list.length ? <>
      <div className="small muted" style={{ marginBottom: 10 }}>{L('From this week\'s meal plan · {0} left', 'من خطة الأسبوع · باقي {0}', left)}</div>
      <div className="nt-shop">
        {list.map(x => { const on = !!n.shopChecked[key(x)]; return <button key={key(x)} className={'nt-shop-row' + (on ? ' on' : '')} onClick={() => toggle(x)}>
          <span className="nt-check">{on && <Icon name="check" />}</span>
          <span className="nt-food-m"><span className="nt-food-t">{x.name}</span><span className="nt-food-s">{L('{0} days', '{0} أيام', x.days)}</span></span>
          <span className="nt-food-k">{x.unit ? n1(x.qty) + ' × ' + x.unit : n1(x.qty)}</span>
        </button> })}
      </div>
      <div style={{ height: 10 }} />
      <div className="row" style={{ gap: 8 }}>
        <Button variant="tinted" size="sm" icon="share" onClick={share}>{L('Share', 'مشاركة')}</Button>
        <Button variant="ghost" size="sm" icon="reset" onClick={clear}>{L('Uncheck all', 'إلغاء التحديد')}</Button>
      </div>
    </> : <div className="empty small">{L('Add meals to the weekly plan and the list builds itself.', 'أضف وجبات لخطة الأسبوع، والقائمة تنبني تلقائياً.')}</div>}
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Close', 'إغلاق')}</Button>
  </>
}

/* ----------------------------------------------------------- AI week plan -- */

export function planAiSheet() {
  return openSheet(close => <PlanAi close={close} />)
}

function PlanAi({ close }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const [prefs, setPrefs] = useState('')
  const [meals, setMeals] = useState(3)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [plan, setPlan] = useState(null)
  const run = async () => {
    if (!n.goal) { setErr(L('Set your daily targets first.', 'حدد أهدافك اليومية أول.')); return }
    setBusy(true); setErr(null)
    try { setPlan(await generateWeekPlan({ target: n.goal, prefs, meals, model: n.aiModel, ar: isAr() })) }
    catch (e) { setErr(aiErrorText(e)) }
    finally { setBusy(false) }
  }
  const apply = () => {
    update(S => { const n = ensureN(S); n.plan = plan; n.shopChecked = {} })
    toast(L('Week plan saved', 'انحفظت خطة الأسبوع'))
    close()
  }
  if (plan) return <>
    <h3>{L('Your week', 'أسبوعك')}</h3>
    <div className="nt-plan-preview">
      {Array.from({ length: 7 }, (_, wd) => { const items = MEALS.flatMap(m => plan[String(wd)]?.[m] || []); const tt = totals(items); return <div key={wd} className="nt-pp-day">
        <div className="row between"><b>{DAY_LABEL[wd]()}</b><span className="small muted">{n0(tt.kcal)} {L('kcal', 'سعرة')} · {L('P', 'ب')} {n0(tt.p)}</span></div>
        <div className="small muted">{items.map(x => x.name).join('، ')}</div>
      </div> })}
    </div>
    <div style={{ height: 10 }} />
    <Button variant="primary" onClick={apply}>{L('Use this plan', 'اعتمد الخطة')}</Button>
    <div style={{ height: 6 }} />
    <Button variant="ghost" onClick={() => setPlan(null)}>{L('Try again', 'جرّب مرة ثانية')}</Button>
  </>
  return <>
    <h3>{L('Plan my week with Claude', 'خطط أسبوعي مع Claude')}</h3>
    <p className="small muted" style={{ marginBottom: 12 }}>{n.goal
      ? L('Aims for {0} kcal and {1} g protein a day. Replaces the current week plan.', 'الهدف {0} سعرة و{1} جم بروتين يومياً. بتستبدل الخطة الحالية.', n0(n.goal.kcal), n0(n.goal.p))
      : L('Set your daily targets first.', 'حدد أهدافك اليومية أول.')}</p>
    <div className="nt-label">{L('Main meals a day', 'عدد الوجبات الرئيسية')}</div>
    <Segmented value={meals} onChange={setMeals} options={[2, 3, 4].map(v => ({ value: v, label: String(v) }))} />
    <div style={{ height: 10 }} />
    <TextArea value={prefs} onChange={e => setPrefs(e.target.value)} rows={3}
      placeholder={L('Anything to know? e.g. no fish, cheap and quick, I train in the evening', 'وش تحب أعرف؟ مثال: ما آكل سمك، أبيها رخيصة وسريعة، أتمرن بالليل')} />
    <div style={{ height: 10 }} />
    {err && <div className="nt-err">{err}</div>}
    <Button variant="primary" icon={busy ? null : 'sparkles'} disabled={busy || !n.goal} onClick={run}>{busy ? L('Claude is planning… (up to a minute)', 'Claude يخطط… (ممكن دقيقة)') : L('Create plan', 'سوّ الخطة')}</Button>
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Cancel', 'إلغاء')}</Button>
  </>
}

/* ------------------------------------------------------------ settings menu -- */

export function nutritionMenuSheet() {
  return openSheet(close => <Menu close={close} />)
}

function Menu({ close }) {
  const S = useStore(s => s.S)
  const n = nState(S)
  const go = fn => () => { close(); setTimeout(fn, 250) }
  const removeRepeat = id => update(S => { const n = ensureN(S); n.repeat = n.repeat.filter(r => r.id !== id) })
  const removeFav = id => update(S => { const n = ensureN(S); n.favs = n.favs.filter(r => r.id !== id) })
  const removeFood = id => update(S => { const n = ensureN(S); n.foods = n.foods.filter(r => r.id !== id) })
  const list = (title, rows, onRemove, sub) => rows.length > 0 && <Section title={title}>
    {rows.map(r => <Row key={r.id} title={r.name || r.item?.name} subtitle={sub(r)}>
      <button className="iconbtn" style={{ color: 'var(--red)' }} onClick={() => onRemove(r.id)} aria-label={L('Delete', 'حذف')}><Icon name="trash" /></button>
    </Row>)}
  </Section>
  return <>
    <h3>{L('Nutrition settings', 'إعدادات الأكل')}</h3>
    <Section>
      <Row icon="target" iconTint="var(--orange)" title={L('Daily targets', 'الأهداف اليومية')} subtitle={n.goal ? `${n0(n.goal.kcal)} ${L('kcal', 'سعرة')} · ${L('P', 'ب')} ${n.goal.p}` : L('Not set', 'غير محددة')} accessory="chevron" onClick={go(targetsSheet)} />
      <Row icon="sparkles" iconTint="var(--purple)" title={L('Claude (AI)', 'Claude (الذكاء الاصطناعي)')} subtitle={n.aiModel || DEFAULT_MODEL} accessory="chevron" onClick={go(() => aiSettingsSheet())} />
      <Row icon="chartLine" iconTint="var(--teal)" title={L('Weekly review', 'المراجعة الأسبوعية')} accessory="chevron" onClick={go(checkInSheet)} />
    </Section>
    {list(L('Added every day', 'تنضاف كل يوم'), n.repeat, removeRepeat, r => MEAL_LABEL[r.meal]?.() + ' · ' + n0(itemKcal(r.item)) + ' ' + L('kcal', 'سعرة'))}
    {list(L('Saved meals', 'وجبات محفوظة'), n.favs, removeFav, r => n0(totals(r.items).kcal) + ' ' + L('kcal', 'سعرة'))}
    {list(L('My foods', 'أكلاتي'), n.foods, removeFood, r => (r.unit ? r.unit + ' · ' : '') + n0(r.k) + ' ' + L('kcal', 'سعرة'))}
    <Button variant="ghost" className="dim" onClick={close}>{L('Close', 'إغلاق')}</Button>
  </>
}

/** Saves a meal's items as a reusable saved meal. */
export function saveMealSheet(items, suggested) {
  return openSheet(close => <SaveMeal items={items} suggested={suggested} close={close} />)
}
function SaveMeal({ items, suggested, close }) {
  const [name, setName] = useState(suggested || '')
  const save = () => {
    update(S => { const n = ensureN(S); n.favs = [...n.favs, { id: uid(), name: name.trim() || suggested, items: items.map(({ meal, ...it }) => ({ ...it, id: uid() })) }] })
    toast(L('Meal saved', 'انحفظت الوجبة'))
    close()
  }
  return <>
    <h3>{L('Save meal', 'احفظ الوجبة')}</h3>
    <div className="small muted" style={{ marginBottom: 10 }}>{items.map(x => x.name).join('، ')} · {n0(totals(items).kcal)} {L('kcal', 'سعرة')}</div>
    <TextField value={name} onChange={e => setName(e.target.value)} placeholder={L('Name', 'الاسم')} />
    <div style={{ height: 10 }} />
    <Button variant="primary" onClick={save}>{L('Save', 'حفظ')}</Button>
    <div style={{ height: 6 }} />
    <Button variant="ghost" className="dim" onClick={close}>{L('Cancel', 'إلغاء')}</Button>
  </>
}
