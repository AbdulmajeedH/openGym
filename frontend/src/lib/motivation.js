// The Home greeting ("Good morning, Sara") and the encouraging message the app opens with.
//
// Pure helpers: which greeting fits the hour, which message fits the day, and the message's
// words in the user's language. Arabic addresses a man and a woman differently ("كمّل" /
// "كمّلي"), so an Arabic line that speaks to the user comes in both forms; `sex` picks one.
// The strings sit beside each other here rather than in the shared locale packs, the way the
// nutrition screens do it (lib/nutrition-i18n.js): only English and Arabic have them.
import { L, isAr } from './nutrition-i18n.js'

/** 'morning' 04:00–11:59, 'afternoon' 12:00–16:59, 'evening' otherwise. */
export function greetingPart(hour) {
  const h = Number(hour)
  if (h >= 4 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  return 'evening'
}

/** "Good morning" / "صباح الخير" — Arabic has no afternoon greeting, it is evening from noon. */
export function greetingText(hour) {
  const part = greetingPart(hour)
  if (part === 'morning') return L('Good morning', 'صباح الخير')
  if (part === 'afternoon') return L('Good afternoon', 'مساء الخير')
  return L('Good evening', 'مساء الخير')
}

/** The name the greeting uses: the one set in Settings, else a signed-in account's, else ''. */
export function displayNameOf(S, user) {
  const own = typeof S?.displayName === 'string' ? S.displayName.trim() : ''
  return own || (typeof user?.name === 'string' ? user.name.trim() : '')
}

/** How Arabic speaks to the user: the body set in Settings (also the one the muscle map draws). */
export const sexOf = S => (S?.body === 'female' ? 'female' : 'male')

// when: 'any' fits every day; 'training' a planned workout not done yet; 'rest' nothing planned;
// 'done' a workout logged today; 'streak' two weeks in a row or more ({0} is the streak);
// 'morning' / 'night' only at that time of day (night: 20:00 to 03:59).
// ar: one string when it reads the same to a man and a woman, else { m, f }.
export const MESSAGES = [
  { id: 'steps', when: 'any', emoji: '💪', en: 'Small steps every day add up to big results.', ar: 'الخطوات الصغيرة كل يوم تصنع فرق كبير.' },
  { id: 'stronger', when: 'any', emoji: '🔥', en: 'You’re stronger today than yesterday, and tomorrow you’ll be stronger still.', ar: 'أنت اليوم أقوى من أمس، وبكرة أقوى من اليوم.' },
  { id: 'consistency', when: 'any', emoji: '🎯', en: 'Consistency beats perfection. Just don’t stop.', ar: { m: 'الاستمرارية أهم من الكمال، المهم لا توقف.', f: 'الاستمرارية أهم من الكمال، المهم لا توقفين.' } },
  { id: 'counts', when: 'any', emoji: '🌱', en: 'Every rep counts. Every meal counts.', ar: 'كل تكرار يفرق، وكل وجبة تفرق.' },
  { id: 'proud', when: 'any', emoji: '⭐', en: 'Proud of you for sticking with it.', ar: { m: 'فخورين فيك إنك مستمر.', f: 'فخورين فيك إنك مستمرة.' } },
  { id: 'built', when: 'any', emoji: '🏆', en: 'The body you want is built on days like today.', ar: { m: 'الجسم اللي تبيه ينبني بأيام زي اليوم.', f: 'الجسم اللي تبينه ينبني بأيام زي اليوم.' } },
  { id: 'water', when: 'any', emoji: '💧', en: 'Drink your water, eat your protein, keep going.', ar: { m: 'اشرب مويتك، كُل بروتينك، وكمّل.', f: 'اشربي مويتك، كلي بروتينك، وكمّلي.' } },
  { id: 'discipline', when: 'any', emoji: '🧠', en: 'Discipline is choosing what you want most over what you want now.', ar: { m: 'الانضباط إنك تختار اللي تبيه أكثر، مو اللي تبيه الحين.', f: 'الانضباط إنك تختارين اللي تبينه أكثر، مو اللي تبينه الحين.' } },
  { id: 'yesterday', when: 'any', emoji: '✨', en: 'Your only competition is who you were yesterday.', ar: { m: 'منافسك الوحيد هو أنت أمس.', f: 'منافستك الوحيدة هي أنتِ أمس.' } },
  { id: 'process', when: 'any', emoji: '🚀', en: 'Results take time. Trust the plan.', ar: { m: 'النتايج تبي وقت.. ثق بالخطة وكمّل.', f: 'النتايج تبي وقت.. ثقي بالخطة وكمّلي.' } },

  { id: 'train-day', when: 'training', emoji: '🏋️', en: 'It’s training day! Go make it count.', ar: { m: 'اليوم يوم تمرين! روح وخلّه يستاهل.', f: 'اليوم يوم تمرين! روحي وخلّيه يستاهل.' } },
  { id: 'train-start', when: 'training', emoji: '⚡', en: 'The hardest part is starting. You’ve got this.', ar: { m: 'أصعب شي البداية.. وأنت قدها.', f: 'أصعب شي البداية.. وأنتِ قدها.' } },
  { id: 'train-music', when: 'training', emoji: '🎧', en: 'Headphones on. Make today’s session your best one yet.', ar: { m: 'جهّز سماعتك وخل تمرين اليوم يكون أقوى واحد.', f: 'جهّزي سماعتك وخلي تمرين اليوم يكون أقوى واحد.' } },
  { id: 'train-closer', when: 'training', emoji: '🔥', en: 'Today’s workout is one step closer to your goal.', ar: 'تمرين اليوم يقرّبك خطوة من هدفك.' },

  { id: 'rest-grow', when: 'rest', emoji: '😴', en: 'Rest day. Your muscles grow while you recover.', ar: { m: 'يوم راحة.. عضلاتك تنبني وأنت ترتاح.', f: 'يوم راحة.. عضلاتك تنبني وأنتِ ترتاحين.' } },
  { id: 'rest-food', when: 'rest', emoji: '🥗', en: 'No workout today, so let your food do the work: hit your protein.', ar: { m: 'ما عندك تمرين اليوم، ركّز على أكلك وكمّل بروتينك.', f: 'ما عندك تمرين اليوم، ركّزي على أكلك وكمّلي بروتينك.' } },
  { id: 'rest-walk', when: 'rest', emoji: '🚶', en: 'A walk on a rest day still counts.', ar: 'حتى المشي بيوم الراحة يفرق.' },

  { id: 'done-win', when: 'done', emoji: '🏆', en: 'Workout done! That’s today’s win.', ar: { m: 'خلّصت تمرين اليوم! هذا إنجاز، افتخر بنفسك.', f: 'خلّصتي تمرين اليوم! هذا إنجاز، افتخري بنفسك.' } },
  { id: 'done-refuel', when: 'done', emoji: '✅', en: 'You showed up today. Now refuel and recover.', ar: { m: 'سويتها اليوم 👏 الحين كُل زين وارتاح.', f: 'سويتيها اليوم 👏 الحين كلي زين وارتاحي.' } },

  { id: 'streak', when: 'streak', emoji: '🔥', en: '{0} in a row. Don’t break the chain!', ar: { m: '{0} ورا بعض! لا تكسر السلسلة.', f: '{0} ورا بعض! لا تكسرين السلسلة.' } },

  { id: 'morning', when: 'morning', emoji: '☀️', en: 'A new day and a new chance to be better than yesterday.', ar: { m: 'يوم جديد وفرصة جديدة تكون أحسن من أمس.', f: 'يوم جديد وفرصة جديدة تكونين أحسن من أمس.' } },
  { id: 'night', when: 'night', emoji: '🌙', en: 'Whatever today was, you’re still on track. Sleep well.', ar: { m: 'مهما كان يومك، أنت ماشي صح. نام زين الليلة.', f: 'مهما كان يومك، أنتِ ماشية صح. نامي زين الليلة.' } },
]

const isNight = h => h >= 20 || h < 4

/**
 * The messages that fit the moment, split into the ones about today and the general ones.
 * ctx: { hour, training, done, streak } — training: a workout is planned today, done: one is
 * logged today, streak: weeks in a row.
 */
export function messagesFor({ hour = 12, training = false, done = false, streak = 0 } = {}) {
  const fits = m => {
    switch (m.when) {
      case 'done': return done
      case 'training': return training && !done
      case 'rest': return !training && !done
      case 'streak': return streak >= 2
      case 'morning': return greetingPart(hour) === 'morning'
      case 'night': return isNight(hour)
      default: return false
    }
  }
  return { specific: MESSAGES.filter(fits), general: MESSAGES.filter(m => m.when === 'any') }
}

/**
 * One message for this opening: most of the time (60%) one about today, otherwise a general
 * one, and never the one shown last time when there is another to show. `rand` is injectable
 * so a test can pick.
 */
export function pickMessage(ctx, { lastId = null, rand = Math.random } = {}) {
  const { specific, general } = messagesFor(ctx)
  const fresh = list => (list.length > 1 ? list.filter(m => m.id !== lastId) : list)
  const s = fresh(specific), g = fresh(general)
  const pool = s.length && (rand() < 0.6 || !g.length) ? s : g
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
}

/** "أسبوعين" / "3 أسابيع" / "11 أسبوع" — Arabic counts weeks three ways. */
export function weeksText(n) {
  if (!isAr()) return n === 1 ? '1 week' : `${n} weeks`
  if (n === 1) return 'أسبوع'
  if (n === 2) return 'أسبوعين'
  if (n >= 3 && n <= 10) return `${n} أسابيع`
  return `${n} أسبوع`
}

/** The message's words in the current language, for a man or a woman, the streak filled in. */
export function messageText(msg, { sex = 'male', streak = 0 } = {}) {
  if (!msg) return ''
  const ar = typeof msg.ar === 'string' ? msg.ar : msg.ar?.[sex === 'female' ? 'f' : 'm']
  return L(msg.en, ar, weeksText(streak))
}
