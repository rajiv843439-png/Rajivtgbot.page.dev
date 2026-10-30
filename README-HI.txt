RAJIV TG BOTS — SETUP GUIDE (Hindi)

YE PROJECT KYA KARTA HAI?
- Public Telegram bot directory website.
- Bot name, @username, category, description, tags aur image.
- Search, category filter, sorting, featured bots.
- Open in Telegram button.
- Owner profile link: https://t.me/Legend_boy_3
- Secure admin sign-in using Supabase Auth.
- Admin can add, edit, hide/show and delete bot listings.
- Images upload to Supabase Storage (JPG/PNG/WEBP, max 5 MB).
- Database is persistent; website reload/redeploy hone par listings delete nahi hoti.
- Realtime database updates (Supabase Realtime enabled).
- Mobile responsive design.

IMPORTANT:
"Add bot" ka matlab directory me bot ki listing add karna hai.
Is website se Telegram bot ka Python code run/deploy nahi hota. Actual bot ko alag hosting chahiye.
Frontend me kabhi bhi Supabase service_role key mat daalna. Sirf anon/public key use karna.

STEP 1 — SUPABASE PROJECT
1. https://supabase.com par account banao aur New project banao.
2. Project create hone ke baad SQL Editor kholo.
3. Is repository ki supabase-setup.sql file ka poora code paste karke Run karo.
4. Project Settings > API me Project URL aur anon/public key copy karo.
5. config.js kholo:
   SUPABASE_URL me Project URL paste karo.
   SUPABASE_ANON_KEY me anon/public key paste karo.
6. Save/commit changes.

STEP 2 — ADMIN ACCOUNT
1. Supabase Dashboard > Authentication > Users kholo.
2. Add user / Create new user se apna email aur password banao.
3. User create hone ke baad uska UUID copy karo.
4. SQL Editor me ye query apne UUID ke saath run karo:
   insert into public.admins(user_id) values ('YOUR-USER-UUID');
5. Website par Admin Panel kholo aur isi email/password se login karo.
6. Admin panel ka access sirf admins table me listed user ko milega.

STEP 3 — GITHUB
1. GitHub par New repository banao, example: rajiv-tg-bots-v2.
2. ZIP ko phone me extract karo.
3. Extracted folder ke ANDAR ki files upload karo. ZIP file ko as a ZIP upload mat karna.
4. Root folder me ye files honi chahiye:
   index.html, styles.css, config.js, app.js, supabase-setup.sql, README-HI.txt
5. Commit changes.

STEP 4 — CLOUDFLARE PAGES
1. Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git.
2. Naya GitHub repository select karo.
3. Framework preset: None.
4. Build command blank chhodo.
5. Build output directory: / (agar UI / accept na kare to blank ya root setting use karo).
6. Deploy karo. HTTPS website URL mil jayega.

ADMIN PANEL USE
- Admin Panel > email/password se login.
- Add a bot tab me details bharo.
- Image choose kar sakte ho; Save bot.
- Manage bots tab se Edit/Delete.
- Delete karne se database listing aur uski uploaded image delete hoti hai.
- Public users ko admin panel ka data access nahi milta.

TROUBLESHOOTING
- "Database setup is not finished": config.js me URL/key check karo.
- Login nahi hota: Authentication user aur admins table UUID check karo.
- Add/edit denied: SQL policies run hui hain aur current user admins table me hai ya nahi check karo.
- Image upload denied: storage policies aur bot-images bucket check karo.
- Directory empty: bots table me is_public=true wali rows honi chahiye.
- Website changes nahi dikhte: GitHub commit/deployment complete hone do, browser refresh karo.

SECURITY
- Anon/public key frontend me rakhna normal hai; RLS policies data protect karti hain.
- service_role key, database password, bot token ya private API key kabhi config.js/GitHub me upload mat karna.
- Admin email/password kisi ke saath share mat karna.
