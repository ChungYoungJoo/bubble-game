# 버블 드래곤

보글보글풍 가족 미니게임. 빌드 도구 없이 `docs/` 의 HTML/JS 만으로 돌아간다.

- 1~2인 플레이, 5라운드마다 보스, 아이템(S 신발 / R 연사 / L 사거리 / ♥ 목숨), 물·번개 특수 거품
- 조작: 1인 ← → ↑/Z Space/X · 2인 1P = A D W F, 2P = ← → ↑ Space · 게임패드 · 폰은 화면 버튼
- 로컬 실행: `powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8082`
- 배포: `upload-to-github.ps1` (GitHub Contents API, 파일당 30KB 이하 유지) → https://chungyoungjoo.github.io/bubble-game/
- 파일: `docs/game.js` (로직) · `docs/draw.js` (그리기) · `docs/index.html`
