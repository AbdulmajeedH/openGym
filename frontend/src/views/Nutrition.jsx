// The food log: one day at a time, its target, its meals, and the weight trend underneath.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import {
  MEALS, nState, ensureN, dayItems, mealItems, totals, itemKcal, dayTarget, addDays, weekdayOf,
  planDayItems, mealForHour, weightTrend, adaptiveTdee
} from '../lib/nutrition.js'
import { effectiveRoutines } from '../lib/history.js'
import { L, n0, n1, MEAL_LABEL, DAY_LABEL } from '../lib/nutrition-i18n.js'
import { todayISO, fmtDate, uid } from '../lib/format.js'
import { bwSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import LineChart from '../components/LineChart.jsx'
import { Button } from '../components/ui.jsx'
import {
  addFoodSheet, addItems, itemSheet, targetsSheet, checkInSheet, nutritionMenuSheet, saveMealSheet
} from '../components/NutritionSheets.jsx'
import '../nutrition.css'

const update = fn => useStore.getState().update(fn)

export function isTrainingDay(S, iso) {
  try { return effectiveRoutines(S, iso).some(r => r.ex && r.ex.length) } catch { return false }
}

/** Bar for one macro: grams eaten against the target. */
export function MacroBar({ label, value, target, color }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  return <div className="nt-macro">
    <div className="nt-macro-h"><span>{label}</span><span><b>{n0(value)}</b>{target ? <span className="muted"> / {n0(target)}</span> : null}</span></div>
    <div className="nt-bar"><i style={{ width: pct + '%', background: color }} /></div>
  </div>
}

/** One meal: its items and a + button. `target` says where adds and edits go. */
export function MealCard({ meal, items, target, onSave }) {
  const tot = totals(items)
  return <div className="card nt-meal">
    <div className="nt-meal-h">
      <div><b>{MEAL_LABEL[meal]()}</b>{items.length > 0 && <span className="muted small"> · {n0(tot.kcal)} {L('kcal', 'سعرة')}</span>}</div>
      <div className="row" style={{ gap: 2 }}>
        {onSave && items.length > 1 && <button className="iconbtn" onClick={() => onSave(items)} aria-label={L('Save meal', 'احفظ الوجبة')}><Icon name="star" /></button>}
        <button className="iconbtn nt-add" onClick={() => addFoodSheet({ ...target, meal })} aria-label={L('Add', 'أضف')}><Icon name="plus" /></button>
      </div>
    </div>
    {items.map(it => <button key={it.id} className="nt-item" onClick={() => itemSheet({ ...target, meal }, it)}>
      <span className="nt-food-m">
        <span className="nt-food-t">{it.src === 'ai' && <Icon name="sparkles" className="nt-ai-ic" />}{it.name}</span>
        <span className="nt-food-s">{it.qty !== 1 ? n1(it.qty) + ' × ' : ''}{it.unit || ''}{it.unit ? ' · ' : ''}{L('P', 'ب')} {n0(it.p * it.qty)} · {L('C', 'ك')} {n0(it.c * it.qty)} · {L('F', 'د')} {n0(it.f * it.qty)}</span>
      </span>
      <span className="nt-food-k">{n0(itemKcal(it))}</span>
    </button>)}
  </div>
}

function dayLabel(iso) {
  const today = todayISO()
  if (iso === today) return L('Today', 'اليوم')
  if (iso === addDays(today, -1)) return L('Yesterday', 'أمس')
  if (iso === addDays(today, 1)) return L('Tomorrow', 'بكرة')
  return DAY_LABEL[weekdayOf(iso)]() + ' · ' + fmtDate(iso, true)
}

export default function Nutrition() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const n = nState(S)
  const today = todayISO()
  const [date, setDate] = useState(today)
  const items = dayItems(n, date)
  const tot = totals(items)
  const training = isTrainingDay(S, date)
  const target = dayTarget(n.goal, { training, bonus: n.profile.trainingBonus })
  const logTarget = { kind: 'log', date }
  const planned = planDayItems(n, weekdayOf(date))

  // Items set to repeat land on today once, the first time today's log is opened.
  useEffect(() => {
    if (!n.repeat.length || n.applied[today]) return
    update(S => {
      const n = ensureN(S)
      if (n.applied[today]) return
      n.log[today] = [...(n.log[today] || []), ...n.repeat.map(r => ({ ...r.item, id: uid(), meal: r.meal, src: 'repeat' }))]
      const keep = Object.keys(n.applied).filter(d => d >= addDays(today, -60))
      n.applied = Object.fromEntries([...keep, today].map(d => [d, true]))
    })
  }, [today, n.repeat.length])

  const copyYesterday = () => {
    const prev = dayItems(n, addDays(date, -1))
    for (const m of MEALS) { const its = mealItems(prev, m); if (its.length) addItems(logTarget, its, m) }
  }
  // Logged from the plan they are marked 'plan', which is also how the banner knows it is done.
  const logPlan = () => {
    for (const m of MEALS) { const its = planned.filter(x => x.meal === m).map(x => ({ ...x, src: 'plan' })); if (its.length) addItems(logTarget, its, m) }
  }

  const remaining = target ? target.kcal - tot.kcal : null
  const pct = target ? Math.min(100, (tot.kcal / target.kcal) * 100) : 0
  const over = remaining != null && remaining < 0

  return <div className="narrow nt">
    <div className="hdr">
      <div><h1>{L('Food', 'الأكل')}</h1><div className="sub">{L('Calories, macros and your meal plan', 'السعرات والماكروز وخطة وجباتك')}</div></div>
      <div className="hdr-actions">
        <button className="iconbtn" onClick={() => nav('/nutrition/plan')} aria-label={L('Meal plan', 'خطة الوجبات')}><Icon name="calendar" /></button>
        <button className="iconbtn" onClick={nutritionMenuSheet} aria-label={L('Settings', 'الإعدادات')}><Icon name="gear" /></button>
      </div>
    </div>

    <div className="nt-datebar">
      <button className="iconbtn" onClick={() => setDate(addDays(date, -1))} aria-label={L('Previous day', 'اليوم السابق')}><Icon name="chevronLeft" className="nt-flip" /></button>
      <button className="nt-date" onClick={() => setDate(today)}>{dayLabel(date)}</button>
      <button className="iconbtn" onClick={() => setDate(addDays(date, 1))} aria-label={L('Next day', 'اليوم التالي')}><Icon name="chevronRight" className="nt-flip" /></button>
    </div>

    <div className="card nt-sum">
      {target ? <>
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="muted small">{over ? L('Over target', 'فوق الهدف') : L('Remaining', 'المتبقي')}</div>
            <div className="nt-big" style={over ? { color: 'var(--orange)' } : null}>{n0(Math.abs(remaining))} <span>{L('kcal', 'سعرة')}</span></div>
          </div>
          <div className="nt-eaten">
            <div><b>{n0(tot.kcal)}</b> <span className="muted">/ {n0(target.kcal)}</span></div>
            {target.training && <div className="nt-badge"><Icon name="dumbbell" /> {L('Training day', 'يوم تمرين')}</div>}
          </div>
        </div>
        <div className="nt-bar nt-bar-big"><i style={{ width: pct + '%', background: over ? 'var(--orange)' : 'var(--acc)' }} /></div>
        <div className="nt-macros">
          <MacroBar label={L('Protein', 'بروتين')} value={tot.p} target={target.p} color="var(--red)" />
          <MacroBar label={L('Carbs', 'كارب')} value={tot.c} target={target.c} color="var(--blue)" />
          <MacroBar label={L('Fat', 'دهون')} value={tot.f} target={target.f} color="var(--yellow)" />
        </div>
      </> : <div className="nt-empty">
        <Icon name="target" style={{ fontSize: 28, color: 'var(--orange)' }} />
        <p>{L('Set your daily calorie and protein targets to start.', 'حدد هدفك اليومي من السعرات والبروتين عشان تبدأ.')}</p>
        <div className="nt-today-eaten">{tot.kcal > 0 && L('{0} kcal logged', 'سجلت {0} سعرة', n0(tot.kcal))}</div>
        <Button variant="tinted" onClick={targetsSheet}>{L('Set targets', 'حدد أهدافك')}</Button>
      </div>}
      <div style={{ height: 12 }} />
      <Button variant="primary" icon="plus" onClick={() => addFoodSheet({ ...logTarget, meal: date === today ? mealForHour(new Date().getHours()) : 'lunch' })}>{L('Log food', 'سجّل أكل')}</Button>
    </div>

    {planned.length > 0 && !items.some(x => x.src === 'plan') && <div className="card nt-planbar">
      <div><b>{L('Planned for {0}', 'خطة {0}', DAY_LABEL[weekdayOf(date)]())}</b><div className="small muted">{planned.length} {L('items', 'أصناف')} · {n0(totals(planned).kcal)} {L('kcal', 'سعرة')}</div></div>
      <Button size="sm" variant="tinted" onClick={logPlan}>{L('Log it', 'سجّلها')}</Button>
    </div>}

    {MEALS.map(m => <MealCard key={m} meal={m} items={mealItems(items, m)} target={logTarget}
      onSave={its => saveMealSheet(its, MEAL_LABEL[m]() + ' ' + fmtDate(date, true))} />)}

    {!items.length && dayItems(n, addDays(date, -1)).length > 0 && <Button variant="tinted" icon="copy" onClick={copyYesterday}>{L('Copy yesterday\'s meals', 'انسخ أكل أمس')}</Button>}

    <WeightCard S={S} n={n} today={today} />
  </div>
}

function WeightCard({ S, n, today }) {
  const unit = S.unit === 'lb' ? 'lb' : L('kg', 'كجم')
  const trend = useMemo(() => weightTrend(S.bodyweight), [S.bodyweight])
  const recent = trend.filter(p => p.d >= addDays(today, -90))
  const toT = d => Date.parse(d + 'T12:00:00')
  const raw = recent.map(p => ({ t: toT(p.d), y: p.w, d: p.d }))
  const line = recent.map(p => ({ t: toT(p.d), y: p.trend, d: p.d, note: L('Trend {0}', 'الاتجاه {0}', n1(p.trend)) }))
  const last = trend.at(-1)
  const weekAgo = trend.filter(p => p.d <= addDays(today, -7)).at(-1)
  const change = last && weekAgo ? last.trend - weekAgo.trend : null
  const adaptive = adaptiveTdee(n, S.bodyweight, S.unit, today)
  return <div className="card">
    <div className="row between" style={{ marginBottom: 8 }}>
      <h2 style={{ margin: 0 }}>{L('Weight trend', 'اتجاه الوزن')}</h2>
      <Button size="sm" icon="plus" onClick={() => bwSheet()}>{L('Weigh in', 'سجّل وزن')}</Button>
    </div>
    {last ? <>
      <div className="row" style={{ gap: 14, alignItems: 'baseline' }}>
        <div className="big">{n1(last.trend)} <span className="muted" style={{ fontSize: '1rem' }}>{unit}</span></div>
        {change != null && Math.abs(change) >= 0.05 && <span className="small" style={{ color: 'var(--label-2)' }}>{change > 0 ? '+' : ''}{n1(change)} {unit} {L('this week', 'هالأسبوع')}</span>}
      </div>
      <div className="small muted" style={{ marginTop: 2 }}>{L('Smoothed: daily water and food swings filtered out', 'متوسط مُنعّم: يتجاهل تذبذب الماء والأكل اليومي')}</div>
      {recent.length > 1 && <div className="chart" style={{ marginTop: 8 }}>
        <LineChart points={line} h={130} unit={S.unit} series={[{ points: raw, color: 'var(--label-4)' }, { points: line, color: 'var(--acc)' }]} />
      </div>}
    </> : <div className="muted small">{L('No weigh-ins yet. Weigh yourself in the morning a few times a week.', 'ما فيه أوزان مسجلة. قِس وزنك الصبح كم مرة بالأسبوع.')}</div>}
    <div className="nt-tdee">
      <div><div className="small muted">{L('Your expenditure', 'احتياجك اليومي')}</div>
        <b>{adaptive.tdee ? n0(adaptive.tdee) + ' ' + L('kcal', 'سعرة') : L('{0}/{1} days logged', '{0}/{1} أيام مسجلة', adaptive.loggedDays, adaptive.needDays)}</b></div>
      <Button size="sm" variant="tinted" icon="chartLine" onClick={checkInSheet}>{L('Weekly review', 'المراجعة الأسبوعية')}</Button>
    </div>
  </div>
}
