# הגדרת נקודת הקצה לבקשות הצעת מחיר

אחרי ההגדרה, כל בקשה מהאתר נשלחת ל-`https://api.project21.net/quote`. ה-Worker בודק אותה שוב, שומר עותק ב-D1 ושולח מייל לכתובת ה-Gmail המאומתת. ההגדרה לא דורשת תוכנית בתשלום.

מה לא משתנה:
- רשומות ה-DNS של `project21.net` ושל `www`, שנשארות DNS only (ענן אפור).
- התעודה של GitHub Pages.
- רשומות ה-MX וה-TXT של Email Routing.

הרשומה היחידה שנוספת היא `api`, ו-Cloudflare יוצר אותה אוטומטית.

## לפני שמתחילים
- Node.js מותקן (`node -v`).
- כל הפקודות למטה רצות מתוך התיקייה `worker` בריפו.

## 1. התחברות ל-Cloudflare
```
npx wrangler login
```
נפתח דפדפן. מאשרים בו את החשבון שבו מנוהל project21.net.

## 2. לוודא שכתובת ה-Gmail מאומתת
בממשק: **project21.net → Email → Email Routing → Destination addresses**.
כתובת ה-Gmail שאליה info@ מעבירה צריכה להופיע שם בסטטוס **Verified**. היא כבר מאומתת אם ההעברה עובדת היום.

## 3. יצירת מסד הנתונים
```
npx wrangler d1 create p21-quotes
```
הפקודה מדפיסה `database_id`. מעתיקים את הערך לקובץ `wrangler.toml` במקום `REPLACE_WITH_ID_FROM_wrangler_d1_create`.

אחר כך יוצרים את הטבלה:
```
npx wrangler d1 execute p21-quotes --remote --file=./schema.sql
```

## 4. כתובת היעד כסוד
```
npx wrangler secret put QUOTE_TO_EMAIL
```
כשמתבקשים, מקלידים את כתובת ה-Gmail המאומתת. הכתובת נשמרת רק ב-Cloudflare, ולא בריפו ולא בדפדפן.

## 5. העלאה
```
npx wrangler deploy
```
ההעלאה מחברת את ה-Worker ל-`api.project21.net`, כמוגדר ב-`routes` בקובץ `wrangler.toml`. Cloudflare יוצר את רשומת ה-DNS של `api` בעצמו, עם Proxy (ענן כתום). לא נוגעים ברשומות האחרות.

## 6. בדיקה ראשונה (בלי שליחת מייל)
```
curl -i -X OPTIONS https://api.project21.net/quote -H "Origin: https://project21.net"
```
התשובה צריכה להיות `204`, עם `Access-Control-Allow-Origin: https://project21.net`.

## 7. בדיקת מייל אמיתית
אחרי שהאתר עולה, ממלאים בקשה אחת באתר החי. לפני השליחה, תגיד לי. בודקים שלושה דברים:
- המייל הגיע ל-Gmail.
- הנושא הוא `בקשת הצעת מחיר P21-Q-… | שם`.
- לחיצה על "השב" עונה לכתובת של הלקוח.

## איפה רואים בקשות
בממשק: **Workers & Pages → D1 → p21-quotes → Console**, ומריצים:
```sql
SELECT id, created_at, name, email_status FROM quote_requests ORDER BY created_at DESC LIMIT 20;
```
בקשה עם `email_status = 'failed'` נשמרה, אבל המייל שלה לא נשלח. כדאי לבדוק את הטבלה מדי פעם.

## עלות
0 ₪. שליחה לכתובת מאומתת חינמית בכל תוכנית ולא נספרת במכסה. גם D1 ו-Workers מכוסים במסלול החינמי בהיקף כזה.

## הגבלת קצב
עד 5 בקשות בשעה מאותה כתובת IP. ה-IP נשמר רק כגיבוב (hash). משנים את המספר ב-`RATE_LIMIT_PER_HOUR` שבקובץ `wrangler.toml`.
