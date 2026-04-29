# 雙福輔導團 · 工作週報系統

Next.js + Supabase 全端應用，支援 PWA 離線使用、帳號登入、多人協作。

## 功能清單

- 📋 週報填寫（風琴式收合、拖拉排序、釘選項目）
- 📅 月報彙整（自動計算跨週時數）
- 🎯 年度計畫核對（職務說明占比 vs 實際）
- 📊 統計分析（月度趨勢、核心目標分布）
- 👥 團隊彙整（主管視角、匯出Excel）
- 📌 釘選項目跨週/月/年貫穿顯示
- 🏮 台灣國定假日自動計算工時（2024–2027）
- 📱 PWA — 手機加入主畫面離線使用
- 🔐 Supabase Auth 帳號登入

---

## 快速部署（10 分鐘）

### 1. 建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) → 新增專案
2. 進入 **SQL Editor** → 貼入 `supabase-schema.sql` → 點 Run
3. 進入 **Project Settings → API** → 複製：
   - `Project URL`
   - `anon public key`

### 2. 部署到 Vercel

```bash
# 1. Fork 或下載此專案
git clone <your-repo>
cd shuangfu-report

# 2. 安裝套件
npm install

# 3. 設定環境變數（複製範本）
cp .env.example .env.local
# 編輯 .env.local，填入 Supabase URL 和 Key

# 4. 本地測試
npm run dev
# 開啟 http://localhost:3000

# 5. 部署到 Vercel
npx vercel
# 或推上 GitHub 後在 vercel.com 匯入專案
```

### 3. 設定 Vercel 環境變數

在 Vercel 專案設定 → Environment Variables 新增：

| 變數名稱 | 值 |
|---------|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |

---

## 多人使用說明

每位成員：
1. 開啟部署後的網址
2. 點「立即註冊」用 Email 建立帳號
3. 確認 Email 後登入
4. 填寫週報 → 儲存（自動同步 Supabase）

主管查看：
- 切換到「👥 團隊」頁 → 選擇期間 → 載入資料
- 可看到所有成員的工時、目標分布、出缺勤統計
- 匯出 Excel

> **注意**：目前 RLS 政策設定為每人只能讀寫自己的資料。
> 若主管需要讀取所有人資料，請在 Supabase SQL Editor 執行
> `supabase-schema.sql` 中被註解的 manager policy，
> 並在主管帳號的 `raw_user_meta_data` 設定 `is_manager: true`。

---

## 技術架構

```
shuangfu-report/
├── app/
│   ├── layout.tsx        # 根 layout、導覽列、登入頁
│   ├── page.tsx          # 首頁重導向
│   ├── weekly/page.tsx   # 週報填寫（主頁面）
│   ├── monthly/page.tsx  # 月報彙整
│   ├── annual/page.tsx   # 年度計畫核對
│   ├── stats/page.tsx    # 統計分析
│   └── team/page.tsx     # 團隊彙整（需登入 Supabase）
├── lib/
│   ├── supabase.ts       # 瀏覽器 client、資料定義、假日計算
│   └── supabase-server.ts # Server 端 client
├── styles/globals.css    # 設計系統 CSS
├── public/
│   └── manifest.json     # PWA manifest
├── supabase-schema.sql   # 資料庫建立 SQL
└── .env.example          # 環境變數範本
```

## 離線支援

資料儲存策略：
- **本機優先**：所有操作先寫入 `localStorage`
- **雲端同步**：儲存時自動同步 Supabase（有網路時）
- **離線可用**：無網路時仍可填寫，待有網路時手動點儲存同步

如需完整 PWA 離線快取（Service Worker），可安裝 `next-pwa`：
```bash
npm install next-pwa
```
