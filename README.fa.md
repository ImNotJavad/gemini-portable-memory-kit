# کیت حافظه قابل‌حمل جمینای — Gemini Portable Memory Kit (v1.0.0)

[English Documentation (README.md)](./README.md) | **فارسی**

یک سیستم حافظه **قابل‌حمل (Portable)، ماندگار، قابل‌جستجو و تحت حاکمیت** بر پایه فایل‌های Markdown برای **Gemini CLI**؛ بدون نیاز به دیتابیس، بدون سرویس ابری و بدون هیچ پکیج خارجی پایتون، همراه با هوک‌های ایمن (`BeforeAgent` و `AfterAgent`)، خلاصه وضعیت یک‌خطی داخل پرانتز در انتهای هر پاسخ، و رابط وب اختیاری برای مشاهده بصری حافظه.

---

## ویژگی‌های کلیدی نسخه ۱.۰.۰

- **کاملاً مبتنی بر Markdown و سازگار با Git**: تمام دانش ماندگار پروژه در فایل‌های متنی خوانا زیر `gemini-memory-kit/memory/` ذخیره می‌شود و سقف حجم دقیق دارد (`AGENT_MEMORY.md` کمتر از ۱۰۰ خط و هر فایل داخل `memory/` کمتر از ۱۵۰ خط).
- **خلاصه وضعیت یک‌خطی و واقعی در انتهای هر پاسخ**: هوک `BeforeAgent` (`memory_before.py`) قبل از هر پرامپت با کمک `tools/status_line.py` وضعیت واقعی پروژه را محاسبه می‌کند تا ایجنت در انتهای هر پاسخ دقیقاً یک خط واقعی داخل پرانتز چاپ کند (بدون حدس زدن اعداد):
  `(Memory: loaded | 4 decisions, 1 task | next: Populate Project-Specific Memory Entries | health: ok)`
- **بازبینی خودکار و بدون حلقه بی‌نهایت (`AfterAgent`)**: هوک `memory_check.py` پس از تغییر فایل‌ها با `git status --porcelain` وضعیت تغییرات را می‌سنجد، یک بار درخواست بازبینی حافظه می‌دهد و با بررسی `stop_hook_active` از ایجاد حلقه بی‌نهایت جلوگیری می‌کند.
- **حاکمیت و محافظت از اسرار**: ذخیره کلیدهای API، رمز عبور، توکن، کلید خصوصی، کد خام یا لاگ ترمینال اکیداً ممنوع است و ابزار `govern_memory.py` فایل‌ها را به‌صورت فقط-خواندنی اسکن می‌کند.
- **گراف روابط و خلاصه‌سازی دوره‌ای**: فایل `graph.md` ارتباط میان تصمیم‌ها، ماژول‌ها و فایل‌ها را ثبت می‌کند و `summarize_memory.py` فایل `summaries.md` را با تاریخ روز تازه نگه می‌دارد.
- **نصب یک‌دستوری و غیرویرانگر در هر پروژه**: با ابزار `install_kit.py` می‌توانید کیت را در چند ثانیه روی هر پروژه جدید یا قدیمی در ویندوز، مک و لینوکس نصب کنید بدون آنکه فایل‌های فعلی پروژه بازنویسی شوند.
- **داشبورد وب محلی اختیاری (Knowledge Studio)**: مشاهده ساختاریافته و خام فایل‌های حافظه، جستجو با هایلایت و تاریخچه ۵ جستجوی اخیر، گراف روابط، بج دائمی `Project Status` در هدر و نوار پیشرفت تکمیل تسک‌ها.

---

## ساختار کامل پروژه

```text
.
├── GEMINI.md                                  # فایل ریشه Gemini CLI با ایمپورت ایندکس و قوانین
├── .gemini/
│   └── settings.json                          # ثبت هوک‌های BeforeAgent و AfterAgent
├── gemini-memory-kit/
│   ├── AGENT_MEMORY.md                        # ایندکس فشرده حافظه (کمتر از ۱۰۰ خط)
│   ├── gemini/
│   │   ├── GEMINI.md                          # قوانین کامل حافظه، قالب ورودی‌ها و خط وضعیت
│   │   └── hooks/
│   │       ├── memory_before.py               # هوک BeforeAgent: تزریق وضعیت واقعی قبل از پاسخ
│   │       └── memory_check.py                # هوک AfterAgent: بازبینی ایمن پس از تغییر فایل‌ها
│   ├── memory/
│   │   ├── architecture.md                    # معماری، مرز ماژول‌ها و محدودیت‌های کلیدی
│   │   ├── decisions.md                       # تصمیم‌های قطعی (حذف نیازمند تأیید کاربر است)
│   │   ├── user-preferences.md                # ترجیحات پایدار کاربر و استانداردهای کاری
│   │   ├── bugs-and-lessons.md                # باگ‌های مهم، علت ریشه‌ای و درس‌های عملیاتی
│   │   ├── open-tasks.md                      # تسک‌های باز و کارهای پیگیری بعدی
│   │   ├── summaries.md                       # خلاصه چرخشی و فشرده دانش فعال
│   │   ├── graph.md                           # گراف روابط بین تصمیم‌ها و فایل‌ها
│   │   └── policies.md                        # سیاست‌های نگهداری، امنیت، دسترسی و حذف
│   └── tools/
│       ├── install_kit.py                     # نصب‌کننده ایمن و قابل‌حمل برای پروژه‌های دیگر
│       ├── status_line.py                     # تولیدکننده خط وضعیت واقعی داخل پرانتز
│       ├── search_memory.py                   # جستجوی کلیدواژه با شماره خط و متن اطراف
│       ├── cleanup_memory.py                  # اسکنر فقط-خواندنی ورودی‌های obsolete
│       ├── summarize_memory.py                # بازتولید خودکار memory/summaries.md
│       ├── govern_memory.py                   # اسکنر فقط-خواندنی اسرار و کلیدهای حساس
│       └── validate_memory.py                 # بررسی سقف ۱۰۰/۱۵۰ خط و صحت ساختار فایل‌ها
├── install-windows.bat                        # نصب‌کننده یک‌کلیکی و Drag-and-Drop برای ویندوز
├── README.md                                  # مستندات انگلیسی
├── README.fa.md                               # مستندات فارسی
├── CHANGELOG.md                               # تاریخچه نسخه‌ها
└── LICENSE                                    # لایسنس MIT
```

---

## پیش‌نیازها

- **Python 3.9 یا بالاتر** (فقط کتابخانه استاندارد؛ بدون نیاز به `pip install`).
- **Gemini CLI** نصب و پیکربندی‌شده.
- **Git** (اختیاری؛ در پوشه‌های بدون Git هوک‌ها بدون خطا عبور می‌کنند).
- **Node.js 20+** *(فقط در صورت تمایل به اجرای داشبورد وب محلی اختیاری)*.

> **نکته سازگاری سیستم‌عامل‌ها**: در `.gemini/settings.json` برای سازگاری هم‌زمان ویندوز، مک و لینوکس از دستور `python` استفاده شده است. اگر روی لینوکس یا مک فقط دستور `python3` روی `PATH` تعریف شده است، یک لینک/آلیاس `python` به `python3` بسازید (مثلاً `sudo apt install python-is-python3`) یا دستور داخل `.gemini/settings.json` پروژه خود را تنظیم کنید.

---

## راهنمای کامل نصب در هر پروژه (گام‌به‌گام)

### روش اول: نصب خودکار با یک دستور (پیشنهادی)

یک بار مخزن را کلون کنید و سپس برای هر پروژه جدید یا قدیمی اجرا کنید:

```bash
git clone https://github.com/<your-username>/gemini-portable-memory-kit.git
cd gemini-portable-memory-kit

# پیش‌نمایش فایل‌هایی که ساخته یا ادغام می‌شوند (بدون هیچ تغییری روی دیسک)
python gemini-memory-kit/tools/install_kit.py /path/to/your-project --fresh --dry-run

# نصب ایمن با فایل‌های حافظه تمیز و آماده برای پروژه مقصد
python gemini-memory-kit/tools/install_kit.py /path/to/your-project --fresh
```

این نصب‌کننده چه کارهایی انجام می‌دهد؟
1. پوشه `gemini-memory-kit/` را به پروژه مقصد کپی می‌کند و اگر فایلی از قبل وجود داشته باشد آن را **هرگز بازنویسی نمی‌کند** (`SKIP` چاپ می‌کند).
2. با گزینه `--fresh` فایل‌های `AGENT_MEMORY.md` و `memory/*.md` را با قالب تمیز برای پروژه جدید می‌سازد (اما قوانین `policies.md`، `gemini/GEMINI.md`، هوک‌ها و ابزارها را کامل کپی می‌کند).
3. اگر در پروژه مقصد `GEMINI.md` وجود نداشته باشد آن را می‌سازد، و اگر از قبل وجود داشته باشد فقط دو خط `@./gemini-memory-kit/...` را به انتهای آن اضافه (`MERGE`) می‌کند.
4. اگر `.gemini/settings.json` از قبل وجود داشته باشد، تنظیمات فعلی شما را حفظ کرده و فقط هوک‌های `BeforeAgent` و `AfterAgent` را به آن اضافه می‌کند.

### روش ویژه ویندوز: نصب‌کننده خودکار `install-windows.bat` (مناسب فایل ZIP)

اگر نسخه ZIP را روی ویندوز دانلود کرده‌اید، فایل را Extract کنید و از `install-windows.bat` به هر کدام از ۳ روش زیر استفاده کنید:
- **دابل‌کلیک روی `install-windows.bat`**: مسیر پوشه پروژه خود را Paste (یا داخل پنجره رها) کنید و Enter بزنید.
- **کشیدن و رها کردن (Drag & Drop)**: پوشه پروژه خود را مستقیماً روی فایل `install-windows.bat` بکشید و رها کنید.
- **خط فرمان (CMD / PowerShell)**:
  ```bat
  install-windows.bat "C:\path\to\your-project"
  install-windows.bat "C:\path\to\your-project" --dry-run
  ```
این فایل به‌صورت خودکار پایتون ۳.۹+ را پیدا می‌کند، کیت را بدون بازنویسی فایل‌های قبلی با حافظه تمیز (`--fresh`) نصب و ادغام می‌کند و در پایان تست‌های `validate_memory.py`، `govern_memory.py` و `status_line.py` را هم اجرا می‌کند.

### روش دوم: نصب دستی (کپی مستقیم)

۱. پوشه `gemini-memory-kit/` را در ریشه پروژه خود کپی کنید.
۲. در فایل `GEMINI.md` ریشه پروژه این خطوط را قرار دهید (یا به انتهای فایل موجود اضافه کنید):

```markdown
# Project Memory Instructions

At the start of every task, read `gemini-memory-kit/AGENT_MEMORY.md` to load current project context.
Follow all memory governance, formatting, and maintenance rules defined in `gemini-memory-kit/gemini/GEMINI.md`.

@./gemini-memory-kit/AGENT_MEMORY.md
@./gemini-memory-kit/gemini/GEMINI.md
```

۳. فایل `.gemini/settings.json` را بسازید (یا بخش `hooks` را با فایل موجود ادغام کنید):

```json
{
  "hooks": {
    "BeforeAgent": [
      {
        "matcher": "*",
        "hooks": [
          {
            "name": "memory-status-context",
            "type": "command",
            "command": "python gemini-memory-kit/gemini/hooks/memory_before.py",
            "timeout": 10000
          }
        ]
      }
    ],
    "AfterAgent": [
      {
        "matcher": "*",
        "hooks": [
          {
            "name": "memory-check",
            "type": "command",
            "command": "python gemini-memory-kit/gemini/hooks/memory_check.py",
            "timeout": 15000
          }
        ]
      }
    ]
  }
}
```

۴. پس از کپی، دستورات بخش «بررسی و تست پس از نصب» را اجرا کنید.

---

## چرخه اجرا در هر پرامپت Gemini CLI

1. **شروع پرامپت (`BeforeAgent` -> `memory_before.py`)**:
   - وضعیت واقعی فایل‌های حافظه، تسک‌ها، تغییرات Git و هشدارهای امنیتی/سقف خط را با `status_line.py` محاسبه و به کانتکست ایجنت تزریق می‌کند.
2. **انتهای پاسخ ایجنت**:
   - ایجنت پاسخ عادی شما را می‌دهد و در خط آخر یک وضعیت کوتاه انگلیسی داخل پرانتز می‌آورد:
     - حالت سالم: `(Memory: loaded | 4 decisions, 1 task | next: Add auth tests | health: ok)`
     - پس از آپدیت حافظه: `(Memory: synced | updated: decisions.md, graph.md | 5 decisions, 1 task | health: ok)`
     - در صورت وجود هشدار: `(Memory: loaded | 4 decisions, 1 task | alert: 1 secret warning, 2 obsolete)`
3. **پایان نوبت (`AfterAgent` -> `memory_check.py`)**:
   - اگر `stop_hook_active` برابر `true` باشد بلافاصله `allow` برمی‌گرداند (جلوگیری قطعی از حلقه بی‌نهایت).
   - اگر تغییری در Git نباشد `allow` برمی‌گرداند.
   - اگر فایلی تغییر کرده باشد یک بار `deny` برمی‌گرداند تا ایجنت بررسی کند آیا نکته ماندگار و غیربدیهی برای ثبت در حافظه وجود دارد یا نه.

---

## ابزارهای خط فرمان (CLI)

| دستور | کاربرد | تغییر روی فایل؟ |
| :--- | :--- | :--- |
| `python gemini-memory-kit/tools/status_line.py [--detailed \| --json]` | چاپ خط وضعیت واقعی و تأییدشده | خیر |
| `python gemini-memory-kit/tools/search_memory.py <keywords...>` | جستجوی کلیدواژه در فایل‌های حافظه با شماره خط و متن اطراف | خیر |
| `python gemini-memory-kit/tools/cleanup_memory.py` | گزارش ورودی‌های دارای `- Status: obsolete` | خیر |
| `python gemini-memory-kit/tools/govern_memory.py` | اسکن فایل‌ها برای کشف کلید API، رمز، توکن و کلید خصوصی | خیر |
| `python gemini-memory-kit/tools/validate_memory.py` | بررسی سقف ۱۰۰/۱۵۰ خط، عناوین تکراری و فیلدهای اجباری | خیر |
| `python gemini-memory-kit/tools/summarize_memory.py` | بازتولید خلاصه چرخشی در `memory/summaries.md` | فقط `summaries.md` |
| `python gemini-memory-kit/tools/install_kit.py <target> [--fresh] [--dry-run]` | نصب ایمن کیت در هر پروژه دیگر | فقط پروژه مقصد |

---

## بررسی و تست پس از نصب

در ریشه پروژه مقصد این دستورات را اجرا کنید:

```bash
python gemini-memory-kit/tools/validate_memory.py
python gemini-memory-kit/tools/govern_memory.py
python gemini-memory-kit/tools/cleanup_memory.py
python gemini-memory-kit/tools/summarize_memory.py
python gemini-memory-kit/tools/status_line.py
python gemini-memory-kit/tools/search_memory.py "memory"

# تست مستقیم هوک‌های BeforeAgent و AfterAgent
echo '{"cwd": "'"$PWD"'"}' | python gemini-memory-kit/gemini/hooks/memory_before.py
echo '{"cwd": "'"$PWD"'"}' | python gemini-memory-kit/gemini/hooks/memory_check.py
```

---

## اختیاری: اجرای داشبورد وب محلی (Knowledge Studio)

در صورت نیاز به مرور بصری حافظه در مرورگر:

```bash
npm install
npm run dev
```

سپس آدرس `http://localhost:3000` را باز کنید. امکانات شامل مرورگر ساختاریافته/خام فایل‌های Markdown، جستجو با هایلایت و ذخیره ۵ جستجوی اخیر، گراف روابط، بج دائمی `Project Status` در هدر و نوار پیشرفت تکمیل تسک‌هاست.

---

## انتشار نسخه ۱.۰.۰ روی GitHub

```bash
git init
git add .
git commit -m "chore: initial release v1.0.0 of Gemini Portable Memory Kit"
git branch -M main
git remote add origin https://github.com/<your-username>/gemini-portable-memory-kit.git
git push -u origin main
git tag -a v1.0.0 -m "Gemini Portable Memory Kit v1.0.0"
git push origin v1.0.0
```

---

## لایسنس

این پروژه تحت لایسنس [MIT](./LICENSE) منتشر شده است.
