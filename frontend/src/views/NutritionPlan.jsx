// The weekly meal plan: what to eat on each weekday, its totals against the target, a shopping
// list built from it, and Claude to draft the whole week.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { MEALS, nState, ensureN, planDay, planDayItems, totals, dayTarget, weekdayOf } from '../lib/nutrition.js'
import { L, n0, MEAL_LABEL, DAY_LABEL, DAY_SHORT } from '../lib/nutrition-i18n.js'
import { todayISO, uid } from '../lib/format.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { shoppingSheet, planAiSheet, addItems } from '../components/NutritionSheets.jsx'
import { MealCard, MacroBar } from './Nutrition.jsx'
import '../nutrition.css'

const update = fn => useStore.getState().update(fn)
const toast = m => useUI.getState().toast(m)
// Saturday-first for Arabic weeks would surprise nobody, but the app's own week setting wins.
const order = ws => Array.from({ length: 7 }, (_, i) => (ws + i) % 7)

export default function NutritionPlan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const n = nState(S)
  const [wd, setWd] = useState(weekdayOf(todayISO()))
  const day = planDay(n, wd)
  const all = planDayItems(n, wd)
  const tot = totals(all)
  const target = dayTarget(n.goal)
  const planTarget = { kind: 'plan', wd }
  const filled = d => planDayItems(n, d).length > 0

  const copyToAll = () => confirmSheet({
    title: L('Copy to every day?', 'نسخ لكل الأيام؟'),
    message: L('Replaces the other six days with {0}.', 'بيستبدل باقي الأيام بخطة {0}.', DAY_LABEL[wd]()),
    confirmText: L('Copy', 'انسخ'),
    onConfirm: () => {
      update(S => {
        const n = ensureN(S)
        const src = planDay(n, wd)
        const plan = {}
        for (let d = 0; d < 7; d++) plan[String(d)] = Object.fromEntries(MEALS.map(m => [m, src[m].map(it => ({ ...it, id: uid() }))]))
        n.plan = plan
      })
      toast(L('Copied to every day', 'انسخت لكل الأيام'))
    }
  })
  const clearDay = () => confirmSheet({
    title: L('Clear this day?', 'تمسح هذا اليوم؟'), confirmText: L('Clear', 'امسح'), danger: true,
    onConfirm: () => update(S => { const n = ensureN(S); n.plan = { ...n.plan, [String(wd)]: {} } })
  })
  const logToday = () => {
    const today = todayISO()
    for (const m of MEALS) if (day[m].length) addItems({ kind: 'log', date: today }, day[m].map(x => ({ ...x, src: 'plan' })), m)
    toast(L('Added to today\'s log', 'انضافت لسجل اليوم'))
  }

  return <div className="narrow nt">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/nutrition')} aria-label={L('Food', 'الأكل')}><Icon name="chevronLeft" className="nt-flip" /></button>
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{L('Meal plan', 'خطة الوجبات')}</h1><div className="sub">{L('Your week, day by day', 'أسبوعك يوم بيوم')}</div></div>
      <div className="hdr-actions">
        <button className="iconbtn" onClick={shoppingSheet} aria-label={L('Shopping list', 'قائمة المشتريات')}><Icon name="cart" /></button>
      </div>
    </div>

    <div className="nt-days">
      {order(S.weekStart === 0 ? 0 : 1).map(d => <button key={d} className={'nt-day' + (d === wd ? ' on' : '') + (filled(d) ? ' has' : '')} onClick={() => setWd(d)}>
        <span>{DAY_SHORT[d]()}</span><i />
      </button>)}
    </div>

    <div className="card nt-sum">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div><div className="muted small">{DAY_LABEL[wd]()}</div><div className="nt-big">{n0(tot.kcal)} <span>{target ? '/ ' + n0(target.kcal) + ' ' : ''}{L('kcal', 'سعرة')}</span></div></div>
      </div>
      {target && <div className="nt-macros">
        <MacroBar label={L('Protein', 'بروتين')} value={tot.p} target={target.p} color="var(--red)" />
        <MacroBar label={L('Carbs', 'كارب')} value={tot.c} target={target.c} color="var(--blue)" />
        <MacroBar label={L('Fat', 'دهون')} value={tot.f} target={target.f} color="var(--yellow)" />
      </div>}
    </div>

    <div className="card nt-planbar nt-ai-cta">
      <div><b>{L('Let Claude plan the week', 'خل Claude يخطط أسبوعك')}</b><div className="small muted">{L('Built on your targets, with Saudi food', 'مبنية على أهدافك، بأكلات سعودية')}</div></div>
      <Button size="sm" variant="tinted" icon="sparkles" onClick={planAiSheet}>{L('Plan', 'خطط')}</Button>
    </div>

    {MEALS.map(m => <MealCard key={m} meal={m} items={day[m]} target={planTarget} />)}

    {all.length > 0 && <div className="nt-actions">
      <Button variant="tinted" icon="plus" onClick={logToday}>{L('Add this day to today\'s log', 'أضف هذا اليوم لسجل اليوم')}</Button>
      <div className="row" style={{ gap: 8 }}>
        <Button size="sm" variant="ghost" icon="copy" onClick={copyToAll}>{L('Copy to all days', 'انسخ لكل الأيام')}</Button>
        <Button size="sm" variant="ghost" icon="trash" style={{ color: 'var(--red)' }} onClick={clearDay}>{L('Clear day', 'امسح اليوم')}</Button>
      </div>
    </div>}
    <div style={{ height: 8 }} />
    <Button variant="tinted" icon="cart" onClick={shoppingSheet}>{L('Shopping list', 'قائمة المشتريات')}</Button>
  </div>
}
