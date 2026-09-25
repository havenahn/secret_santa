# 🎀 마니또
첫 화면에서 6자리 방 키를 입력하면 `/room/방키`로 이동합니다.
새 방을 만들 때는 `새 마니또 만들기`를 누릅니다.
GitHub Pages root에 index.html, app.js, style.css, 404.html이 있어야 합니다.
Supabase 연결은 app.js의 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정하세요.


## 🗑️ 방 삭제
방 화면의 `마니또 지우기`를 누르면 Supabase 서버의 해당 room_code 행이 삭제됩니다. `supabase.sql`의 DELETE policy도 실행해야 합니다.
