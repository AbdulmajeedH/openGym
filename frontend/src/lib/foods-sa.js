// A small built-in food list, weighted to what is eaten in Saudi Arabia. Values are per one
// serving as named in `u`, and they are estimates: home recipes vary, restaurant plates more so.
// Sources are the usual composition tables (USDA FoodData Central for the plain foods) and
// typical recipes for the mixed dishes. Edit a logged item's numbers if you know better.
//
// { id, ar, en, uAr, uEn, g, k, p, c, f } — g is the serving's approximate weight in grams.
export const FOODS_SA = [
  // ---------------------------------------------------------------- main dishes
  { id: 'kabsa-chicken', ar: 'كبسة دجاج', en: 'Chicken kabsa', uAr: 'صحن', uEn: 'plate', g: 450, k: 800, p: 45, c: 85, f: 30 },
  { id: 'kabsa-meat', ar: 'كبسة لحم', en: 'Lamb kabsa', uAr: 'صحن', uEn: 'plate', g: 450, k: 900, p: 45, c: 85, f: 40 },
  { id: 'mandi-chicken', ar: 'مندي دجاج', en: 'Chicken mandi', uAr: 'صحن', uEn: 'plate', g: 450, k: 850, p: 50, c: 85, f: 32 },
  { id: 'mandi-meat', ar: 'مندي لحم', en: 'Lamb mandi', uAr: 'صحن', uEn: 'plate', g: 450, k: 950, p: 48, c: 85, f: 44 },
  { id: 'rice-kabsa', ar: 'رز كبسة (بدون لحم)', en: 'Kabsa rice (no meat)', uAr: 'كوب', uEn: 'cup', g: 180, k: 300, p: 5, c: 50, f: 9 },
  { id: 'rice-white', ar: 'رز أبيض مطبوخ', en: 'White rice, cooked', uAr: 'كوب', uEn: 'cup', g: 160, k: 210, p: 4, c: 45, f: 0.5 },
  { id: 'jareesh', ar: 'جريش', en: 'Jareesh', uAr: 'صحن', uEn: 'bowl', g: 250, k: 300, p: 12, c: 45, f: 8 },
  { id: 'margoog', ar: 'مرقوق', en: 'Margoog', uAr: 'صحن', uEn: 'bowl', g: 350, k: 420, p: 25, c: 50, f: 12 },
  { id: 'qursan', ar: 'قرصان', en: 'Qursan', uAr: 'صحن', uEn: 'bowl', g: 300, k: 400, p: 20, c: 45, f: 15 },
  { id: 'saleeg', ar: 'سليق', en: 'Saleeg', uAr: 'صحن', uEn: 'plate', g: 300, k: 480, p: 25, c: 55, f: 18 },
  { id: 'harees', ar: 'هريس', en: 'Harees', uAr: 'صحن', uEn: 'bowl', g: 300, k: 360, p: 22, c: 40, f: 12 },
  { id: 'masoub', ar: 'معصوب', en: 'Masoub', uAr: 'صحن', uEn: 'bowl', g: 300, k: 600, p: 9, c: 85, f: 25 },
  { id: 'areekah', ar: 'عريكة', en: 'Areekah', uAr: 'صحن', uEn: 'bowl', g: 300, k: 650, p: 12, c: 80, f: 30 },
  { id: 'marag-veg', ar: 'مرق خضار باللحم', en: 'Meat & vegetable stew', uAr: 'صحن', uEn: 'bowl', g: 250, k: 180, p: 10, c: 15, f: 9 },
  { id: 'bamia', ar: 'بامية باللحم', en: 'Okra stew with meat', uAr: 'صحن', uEn: 'bowl', g: 250, k: 230, p: 15, c: 15, f: 12 },
  { id: 'molokhia', ar: 'ملوخية بالدجاج', en: 'Molokhia with chicken', uAr: 'صحن', uEn: 'bowl', g: 250, k: 200, p: 15, c: 10, f: 11 },
  { id: 'macaroni-bechamel', ar: 'مكرونة بالبشاميل', en: 'Macaroni béchamel', uAr: 'قطعة', uEn: 'serving', g: 250, k: 450, p: 20, c: 40, f: 23 },
  { id: 'pasta', ar: 'مكرونة مطبوخة', en: 'Pasta, cooked', uAr: 'كوب', uEn: 'cup', g: 140, k: 220, p: 8, c: 43, f: 1.3 },

  // ---------------------------------------------------------------- meat, chicken, fish
  { id: 'chicken-breast', ar: 'صدر دجاج مشوي', en: 'Grilled chicken breast', uAr: '١٠٠ جم', uEn: '100 g', g: 100, k: 165, p: 31, c: 0, f: 3.6 },
  { id: 'chicken-half', ar: 'نص دجاجة مشوية (شواية)', en: 'Half rotisserie chicken', uAr: 'نص حبة', uEn: 'half', g: 300, k: 550, p: 60, c: 0, f: 34 },
  { id: 'broasted', ar: 'دجاج بروستد', en: 'Broasted chicken', uAr: 'قطعة', uEn: 'piece', g: 120, k: 300, p: 20, c: 12, f: 19 },
  { id: 'lamb', ar: 'لحم غنم مطبوخ', en: 'Lamb, cooked', uAr: '١٠٠ جم', uEn: '100 g', g: 100, k: 280, p: 25, c: 0, f: 20 },
  { id: 'kofta', ar: 'كباب / كفتة مشوية', en: 'Grilled kofta kebab', uAr: '١٠٠ جم', uEn: '100 g', g: 100, k: 250, p: 18, c: 4, f: 18 },
  { id: 'fish-grilled', ar: 'سمك مشوي (هامور)', en: 'Grilled fish (hamour)', uAr: 'قطعة', uEn: 'fillet', g: 150, k: 165, p: 35, c: 0, f: 2 },
  { id: 'tuna', ar: 'تونة بالماء', en: 'Tuna in water', uAr: 'علبة', uEn: 'can', g: 120, k: 130, p: 29, c: 0, f: 1 },
  { id: 'egg', ar: 'بيض', en: 'Egg', uAr: 'حبة', uEn: 'egg', g: 50, k: 72, p: 6.3, c: 0.4, f: 4.8 },
  { id: 'shakshuka', ar: 'شكشوكة', en: 'Shakshuka', uAr: 'صحن', uEn: 'serving', g: 250, k: 250, p: 13, c: 10, f: 18 },

  // ---------------------------------------------------------------- sandwiches & fast food
  { id: 'shawarma-chicken', ar: 'شاورما دجاج', en: 'Chicken shawarma', uAr: 'ساندوتش', uEn: 'sandwich', g: 250, k: 450, p: 25, c: 40, f: 20 },
  { id: 'shawarma-meat', ar: 'شاورما لحم', en: 'Meat shawarma', uAr: 'ساندوتش', uEn: 'sandwich', g: 250, k: 500, p: 25, c: 40, f: 26 },
  { id: 'burger', ar: 'برجر لحم', en: 'Beef burger', uAr: 'حبة', uEn: 'burger', g: 220, k: 500, p: 25, c: 40, f: 26 },
  { id: 'fries', ar: 'بطاطس مقلية', en: 'French fries', uAr: 'وسط', uEn: 'medium', g: 117, k: 365, p: 4, c: 48, f: 17 },
  { id: 'pizza', ar: 'بيتزا', en: 'Pizza', uAr: 'شريحة', uEn: 'slice', g: 107, k: 285, p: 12, c: 36, f: 10 },
  { id: 'mutabbaq', ar: 'مطبق لحم', en: 'Meat mutabbaq', uAr: 'قطعة', uEn: 'piece', g: 150, k: 400, p: 15, c: 30, f: 25 },
  { id: 'sambusa', ar: 'سمبوسة لحم', en: 'Meat sambusa', uAr: 'حبة', uEn: 'piece', g: 40, k: 130, p: 4, c: 11, f: 8 },
  { id: 'falafel', ar: 'فلافل', en: 'Falafel', uAr: 'حبة', uEn: 'piece', g: 17, k: 57, p: 2.3, c: 5.4, f: 3 },
  { id: 'manakish-zaatar', ar: 'فطيرة زعتر', en: "Za'atar manakish", uAr: 'حبة', uEn: 'piece', g: 120, k: 400, p: 9, c: 50, f: 18 },
  { id: 'manakish-cheese', ar: 'فطيرة جبن', en: 'Cheese manakish', uAr: 'حبة', uEn: 'piece', g: 130, k: 450, p: 17, c: 48, f: 21 },
  { id: 'fatayer', ar: 'فطاير صغيرة', en: 'Small fatayer', uAr: 'حبة', uEn: 'piece', g: 60, k: 180, p: 6, c: 20, f: 8 },

  // ---------------------------------------------------------------- breakfast & bread
  { id: 'foul', ar: 'فول', en: 'Foul medames', uAr: 'صحن', uEn: 'bowl', g: 250, k: 330, p: 17, c: 40, f: 11 },
  { id: 'hummus', ar: 'حمص', en: 'Hummus', uAr: 'ملعقتين', uEn: '2 tbsp', g: 30, k: 50, p: 2.4, c: 4.3, f: 2.9 },
  { id: 'khubz', ar: 'خبز عربي', en: 'Arabic bread', uAr: 'رغيف', uEn: 'loaf', g: 60, k: 165, p: 5.5, c: 33, f: 0.7 },
  { id: 'tamees', ar: 'تميس', en: 'Tamees', uAr: 'رغيف', uEn: 'loaf', g: 150, k: 410, p: 13, c: 82, f: 3 },
  { id: 'samoli', ar: 'صامولي', en: 'Samoli bun', uAr: 'حبة', uEn: 'bun', g: 70, k: 200, p: 6.5, c: 38, f: 2 },
  { id: 'croissant', ar: 'كرواسون', en: 'Croissant', uAr: 'حبة', uEn: 'piece', g: 60, k: 230, p: 5, c: 26, f: 12 },
  { id: 'oats', ar: 'شوفان', en: 'Oats', uAr: '٤٠ جم', uEn: '40 g', g: 40, k: 150, p: 5, c: 27, f: 2.5 },
  { id: 'labneh', ar: 'لبنة', en: 'Labneh', uAr: 'ملعقتين', uEn: '2 tbsp', g: 30, k: 54, p: 2.1, c: 1.2, f: 4.5 },
  { id: 'cheese-white', ar: 'جبن أبيض', en: 'White cheese', uAr: '٣٠ جم', uEn: '30 g', g: 30, k: 75, p: 4, c: 1, f: 6 },
  { id: 'cheese-slice', ar: 'جبن شرائح', en: 'Cheese slice', uAr: 'شريحة', uEn: 'slice', g: 20, k: 60, p: 3, c: 1, f: 5 },
  { id: 'honey', ar: 'عسل', en: 'Honey', uAr: 'ملعقة', uEn: 'tbsp', g: 21, k: 64, p: 0, c: 17, f: 0 },
  { id: 'peanut-butter', ar: 'زبدة فول سوداني', en: 'Peanut butter', uAr: 'ملعقة', uEn: 'tbsp', g: 16, k: 95, p: 3.5, c: 3.5, f: 8 },
  { id: 'olive-oil', ar: 'زيت زيتون', en: 'Olive oil', uAr: 'ملعقة', uEn: 'tbsp', g: 14, k: 120, p: 0, c: 0, f: 14 },

  // ---------------------------------------------------------------- dairy & drinks
  { id: 'laban', ar: 'لبن', en: 'Laban', uAr: 'كوب', uEn: 'cup', g: 240, k: 130, p: 7.7, c: 11, f: 7 },
  { id: 'milk', ar: 'حليب كامل الدسم', en: 'Whole milk', uAr: 'كوب', uEn: 'cup', g: 240, k: 150, p: 8, c: 12, f: 8 },
  { id: 'yogurt', ar: 'زبادي', en: 'Yogurt', uAr: 'علبة', uEn: 'cup', g: 170, k: 105, p: 6, c: 8, f: 5.5 },
  { id: 'whey', ar: 'بروتين واي', en: 'Whey protein', uAr: 'سكوب', uEn: 'scoop', g: 30, k: 120, p: 24, c: 3, f: 1.5 },
  { id: 'coffee-saudi', ar: 'قهوة سعودية', en: 'Saudi coffee', uAr: 'فنجال', uEn: 'cup', g: 50, k: 5, p: 0, c: 1, f: 0 },
  { id: 'karak', ar: 'شاي كرك', en: 'Karak tea', uAr: 'كوب', uEn: 'cup', g: 240, k: 150, p: 4, c: 22, f: 5 },
  { id: 'tea-sugar', ar: 'شاي بسكر', en: 'Tea with sugar', uAr: 'كوب', uEn: 'cup', g: 200, k: 35, p: 0, c: 9, f: 0 },
  { id: 'juice-orange', ar: 'عصير برتقال طازج', en: 'Fresh orange juice', uAr: 'كوب', uEn: 'cup', g: 240, k: 112, p: 1.7, c: 26, f: 0.5 },
  { id: 'soda', ar: 'مشروب غازي', en: 'Soft drink', uAr: 'علبة', uEn: 'can', g: 330, k: 140, p: 0, c: 37, f: 0 },

  // ---------------------------------------------------------------- salads, sides, soups
  { id: 'salad-arabic', ar: 'سلطة خضار', en: 'Arabic salad', uAr: 'صحن', uEn: 'bowl', g: 150, k: 80, p: 1.5, c: 7, f: 5 },
  { id: 'fattoush', ar: 'فتوش', en: 'Fattoush', uAr: 'صحن', uEn: 'bowl', g: 200, k: 180, p: 3, c: 18, f: 11 },
  { id: 'tabbouleh', ar: 'تبولة', en: 'Tabbouleh', uAr: 'صحن', uEn: 'bowl', g: 150, k: 180, p: 3, c: 15, f: 13 },
  { id: 'lentil-soup', ar: 'شوربة عدس', en: 'Lentil soup', uAr: 'صحن', uEn: 'bowl', g: 250, k: 180, p: 10, c: 28, f: 3 },
  { id: 'potato', ar: 'بطاطس مسلوقة', en: 'Boiled potato', uAr: 'حبة', uEn: 'potato', g: 150, k: 130, p: 3, c: 30, f: 0.2 },

  // ---------------------------------------------------------------- fruit, nuts, sweets
  { id: 'dates', ar: 'تمر', en: 'Dates', uAr: 'حبة', uEn: 'date', g: 10, k: 28, p: 0.2, c: 7.5, f: 0 },
  { id: 'banana', ar: 'موز', en: 'Banana', uAr: 'حبة', uEn: 'banana', g: 118, k: 105, p: 1.3, c: 27, f: 0.4 },
  { id: 'apple', ar: 'تفاح', en: 'Apple', uAr: 'حبة', uEn: 'apple', g: 182, k: 95, p: 0.5, c: 25, f: 0.3 },
  { id: 'orange', ar: 'برتقال', en: 'Orange', uAr: 'حبة', uEn: 'orange', g: 130, k: 62, p: 1.2, c: 15.4, f: 0.2 },
  { id: 'mango', ar: 'مانجو', en: 'Mango', uAr: 'كوب', uEn: 'cup', g: 165, k: 100, p: 1.4, c: 25, f: 0.6 },
  { id: 'watermelon', ar: 'حبحب', en: 'Watermelon', uAr: 'كوبين', uEn: '2 cups', g: 280, k: 85, p: 1.7, c: 21, f: 0.4 },
  { id: 'almonds', ar: 'لوز', en: 'Almonds', uAr: 'حفنة', uEn: 'handful', g: 28, k: 165, p: 6, c: 6, f: 14 },
  { id: 'luqaimat', ar: 'لقيمات', en: 'Luqaimat', uAr: '٥ حبات', uEn: '5 pieces', g: 75, k: 300, p: 3, c: 42, f: 13 },
  { id: 'kunafa', ar: 'كنافة', en: 'Kunafa', uAr: 'قطعة', uEn: 'piece', g: 100, k: 400, p: 7, c: 45, f: 22 },
  { id: 'basbousa', ar: 'بسبوسة', en: 'Basbousa', uAr: 'قطعة', uEn: 'piece', g: 60, k: 220, p: 3, c: 35, f: 8 }
]

/** A built-in food as a log Item for one serving, named in the given language. */
export const foodItem = (food, ar) => ({
  name: ar ? food.ar : food.en, unit: ar ? food.uAr : food.uEn,
  qty: 1, k: food.k, p: food.p, c: food.c, f: food.f, src: 'db', ref: food.id
})

/** Search over Arabic and English names; every word typed must appear. */
export function searchFoods(list, q) {
  const words = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return list
  return list.filter(x => {
    const hay = ((x.ar || '') + ' ' + (x.en || '') + ' ' + (x.name || '')).toLowerCase()
    return words.every(w => hay.includes(w))
  })
}

/** The list as the AI's reference: one compact line per food. */
export const foodsReference = () => FOODS_SA.map(x => `${x.ar} / ${x.en} — 1 ${x.uEn} (~${x.g} g): ${x.k} kcal, P ${x.p} C ${x.c} F ${x.f}`).join('\n')
