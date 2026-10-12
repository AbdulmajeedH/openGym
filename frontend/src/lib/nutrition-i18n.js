// Strings for the nutrition screens, in English and Arabic side by side at the call site.
//
// They are kept out of the shared locale packs on purpose: those are checked against each
// other (scripts/check-locales.mjs) and a key in only two of eighteen languages would fail
// that check. Any other language shows the English.
import { getLang, baseLang } from './i18n-core.js'

export const isAr = () => baseLang(getLang()) === 'ar'

export function L(en, ar, ...args) {
  let s = isAr() && ar ? ar : en
  for (let i = 0; i < args.length; i++) s = s.replaceAll('{' + i + '}', args[i])
  return s
}

/** Whole numbers with the locale's grouping (1,250 / ١٬٢٥٠ stays Latin digits like the rest of the app). */
// A left-to-right mark keeps a minus sign in front of its number inside Arabic text.
const ltr = s => (s.startsWith('-') ? '\u200E' + s : s)
export const n0 = v => ltr(Math.round(Number(v) || 0).toLocaleString('en-US'))
export const n1 = v => ltr((Math.round((Number(v) || 0) * 10) / 10).toLocaleString('en-US'))

export const MEAL_LABEL = {
  breakfast: () => L('Breakfast', 'الفطور'),
  lunch: () => L('Lunch', 'الغداء'),
  dinner: () => L('Dinner', 'العشاء'),
  snack: () => L('Snacks', 'سناك')
}
export const DAY_LABEL = [
  () => L('Sunday', 'الأحد'), () => L('Monday', 'الاثنين'), () => L('Tuesday', 'الثلاثاء'),
  () => L('Wednesday', 'الأربعاء'), () => L('Thursday', 'الخميس'), () => L('Friday', 'الجمعة'), () => L('Saturday', 'السبت')
]
export const DAY_SHORT = [
  () => L('Sun', 'أحد'), () => L('Mon', 'اثنين'), () => L('Tue', 'ثلاثاء'),
  () => L('Wed', 'أربعاء'), () => L('Thu', 'خميس'), () => L('Fri', 'جمعة'), () => L('Sat', 'سبت')
]

export function aiErrorText(e) {
  switch (e?.code) {
    case 'nokey': return L('Add your Claude API key first.', 'أضف مفتاح Claude API أول.')
    case 'auth': return L('The API key was rejected. Check it in AI settings.', 'المفتاح مرفوض. تأكد منه في إعدادات الذكاء الاصطناعي.')
    case 'forbidden': return L('This key is not allowed to do that.', 'المفتاح ما عنده صلاحية لهذا الطلب.')
    case 'model': return L('That model is not available to your key. Pick another in AI settings.', 'النموذج غير متاح لمفتاحك. اختر نموذج ثاني من الإعدادات.')
    case 'rate': return L('Too many requests. Try again in a minute.', 'طلبات كثيرة. جرّب بعد دقيقة.')
    case 'overloaded': return L('Claude is busy right now. Try again shortly.', 'Claude مشغول الحين. جرّب بعد شوي.')
    case 'billing': return L('Your Anthropic account is out of credit.', 'رصيد حساب Anthropic خلص.')
    case 'network': return L('No connection to Claude. Check your internet.', 'ما فيه اتصال بـ Claude. تأكد من الإنترنت.')
    case 'timeout': return L('Claude took too long. Try again.', 'Claude طوّل. جرّب مرة ثانية.')
    case 'empty': return L('No food found in that. Try describing it.', 'ما لقيت أكل. جرّب توصف الوجبة.')
    case 'refusal': return L('Claude declined that request.', 'Claude رفض الطلب.')
    default: return L('Something went wrong: {0}', 'صار خطأ: {0}', String(e?.message || e || '').slice(0, 140))
  }
}
