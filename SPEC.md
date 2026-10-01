# WhatsApp CRM — אפיון

## מטרה
מערכת WhatsApp משלנו מעל ה-WhatsApp Business Platform הרשמי של Meta (Cloud API).
ממשק אחד שבו:
- יוצרים הודעות ותבניות (Templates) עם מדיה, משתנים וכפתורים
- שולחים Templates לאישור Meta ועוקבים אחרי הסטטוס (PENDING / APPROVED / REJECTED)
- בוחרים לקוחות/קהלים ושולחים הודעות
- רואים מי קיבל, למי נמסר, מי קרא ומה נכשל
- מקבלים תשובות לקוחות לתוך המערכת
- מנהלים שיחה מלאה מול כל לקוח מתוך Inbox
- שומרים את כל היסטוריית השיחות והפעילות

## ארכיטקטורה
```
Dashboard: Inbox | Contacts | Templates | Campaigns | Media | Analytics
        │
Backend: Messages, Templates, Contacts, Campaigns, Media, Automations, Webhooks
        │                     │
    Database              Job Queue
        │
Meta / WhatsApp Connector  →  WhatsApp Cloud API  →  לקוחות

לקוחות → WhatsApp → Meta → Webhook → Backend → Database → Inbox
```

עיקרון מהיום הראשון: ה-UI, הלוגיקה העסקית והדאטה נפרדים מה-Meta Connector,
כדי שאפשר יהיה להחליף/להוסיף ערוצים (SMS, אימייל) בלי לבנות מחדש.

## יכולות
- **Templates** — כתיבה, סוג תוכן, משתנים, Header/Media/Buttons, שליחה לאישור דרך ה-API.
  שמירת Template ID של Meta והסטטוס.
- **שליחת הודעות** — Template מאושר ללקוח יחיד, לקבוצה מסוננת או לקמפיין.
  דרך Queue: retries, מגבלות קצב, טיפול בכשלים.
- **Inbox** — Conversation לכל לקוח: היסטוריה, נכנסות/יוצאות, מדיה, סטטוסים, מענה ישיר.
- **Contacts** — שם, טלפון בפורמט בינלאומי, WhatsApp ID, תגיות, מקור ליד, סטטוס,
  custom fields, היסטוריית פעילות.
- **Media** — ספריית תמונות/וידאו/מסמכים לשימוש חוזר.
- **סטטוסים** — Meta Message ID לכל הודעה, עדכון sent / delivered / read / failed.
- **Webhook** — קליטת אירועי Meta ועדכון Inbox, הודעות וסטטוסים.

## נתונים
טבלאות ליבה:
CONTACTS, CONVERSATIONS, MESSAGES, TEMPLATES, CAMPAIGNS, CAMPAIGN_RECIPIENTS, MEDIA,
TAGS, USERS, WHATSAPP_ACCOUNTS, PHONE_NUMBERS, WEBHOOK_EVENTS, AUTOMATIONS, AUDIT_LOG

MESSAGES:
id, conversation_id, contact_id, direction, message_type, content, media, template_id,
meta_message_id, status, sent_at, delivered_at, read_at, failed_at, error

## חיבורים
מרכזי: Meta Graph API + WhatsApp Cloud API + Webhooks.
מודולרי להמשך: CRM, מערכת דיוור, אתר/טפסים, מערכת הקורסים, Calendar, Google Drive,
AI Agents / Hermes, Analytics.

### API פנימי לסוכנים (Hermes)
```
send_whatsapp()
create_template()
get_template_status()
get_conversation()
reply_to_conversation()
find_contact()
add_tag()
create_campaign()
```
הסוכנים מדברים עם API אחד שלנו; המערכת מטפלת ב-Meta מאחורי הקלעים.

## שלב שני
הקצאת שיחות לנציגים, הערות פנימיות, פילטרים ותגיות, תזמון הודעות, sequences ואוטומציות,
AI שמסכם שיחה / מציע תשובה / עונה אוטומטית במקרים מוגדרים, חיבור לליד ב-CRM,
attribution ומדדי קמפיינים.

החזון: שכבת תקשורת מרכזית לעסק, ש-WhatsApp הוא הערוץ הראשון שלה.
