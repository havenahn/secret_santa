# 🎀 마니또

무료 GitHub Pages + Supabase로 만드는 온라인 마니또.

## 현재 테스트
Supabase 설정 전에는 같은 브라우저에서 localStorage 모드로 작동합니다.

## 온라인으로 사용하기
1. GitHub에 이 폴더의 파일을 public repository로 업로드
2. Repository Settings → Pages → Deploy from branch → main / root
3. Supabase 프로젝트 생성
4. SQL Editor에서 `supabase.sql` 실행
5. Supabase Project URL과 anon/publishable key를 `app.js`의 두 변수에 입력
6. 다시 GitHub에 업로드

주의: 실제 공개 서비스에서는 RLS 정책을 더 엄격하게 설계해야 합니다. 현재 샘플은 작동 확인용입니다.
