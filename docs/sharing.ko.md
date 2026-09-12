# 만든 퀴즈, 친구에게 공유하기

[English](sharing.md) | 한국어

Cram으로 만든 HTML은 파일 그대로 보내도 되고, 웹에 올려서 링크로 보내도 돼요.
친구가 다운로드 없이 바로 풀게 하고 싶다면 링크가 편하겠죠.
이미 완성된 파일이라 서버를 따로 만들거나 빌드할 필요는 없어요.

## 어디에 올리면 좋을까요?

간단히 올려보고 싶다면 Netlify Drop이나 Vercel Drop을, 퀴즈를 계속 쌓아두고
업데이트할 생각이라면 Cloudflare Pages나 GitHub Pages를 추천해요.

아래는 공식 사용법과 무료 요금제를 확인할 수 있는 서비스들이에요.
가동률을 직접 검증하거나 영구 무료를 보장하는 목록은 아니에요.
**2026-09-12 기준**으로 확인했으며, 달라진 조건은 각 공식 문서에서 확인할 수 있어요.

| 서비스 | 올리는 방법 | 무료로 쓸 때 알아둘 점 |
| --- | --- | --- |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/) | 로그인 후 폴더나 ZIP 업로드. GitHub 저장소는 없어도 돼요. | [정적 파일 요청은 무료·무제한](https://developers.cloudflare.com/pages/functions/pricing/)이에요. [파일 하나당 25 MiB 제한](https://developers.cloudflare.com/pages/platform/limits/)이 있어요. |
| [Netlify Drop](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/) | 폴더를 끌어다 놓고, 계정으로 프로젝트를 관리해요. | [무료는 월 300크레딧](https://www.netlify.com/pricing/)이며 배포와 트래픽이 함께 사용해요. 처음에는 비공개일 수 있으니 공유 전에 공개 설정을 확인하세요. |
| [Vercel Drop](https://vercel.com/docs/drop) | 로그인 후 HTML 파일, 폴더, ZIP을 올려요. | [무료 Hobby는 개인·비상업 용도](https://vercel.com/docs/plans/hobby)예요. 새로 올릴 때마다 별도 프로젝트가 생겨요. |
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) | 저장소에 HTML을 올리고 Pages를 켜요. | [무료 계정에서는 공개 저장소로 이용](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)할 수 있어요. GitHub를 이미 쓰고 있고 변경 기록도 남기고 싶다면 좋아요. |
| [Surge](https://surge.sh/) | 전용 명령줄 도구로 폴더를 올려요. | [무료로 배포 횟수 제한 없이 기본 SSL을 제공](https://surge.sh/pricing)해요. 비밀번호 보호는 유료예요. 터미널이 익숙하거나 에이전트에게 배포를 맡길 때 고려해보세요. |

Cram과 제휴하거나 연동된 서비스는 아니에요. 쓰던 도구에 공유 기능이 있다면
그걸 써도 좋아요. 다만 HTML 전체를 제공하고 JavaScript 실행을 허용해야 해요.
파일 미리보기만 지원하는 곳에서는 퀴즈가 작동하지 않을 수 있어요.

## 파일부터 준비해볼까요?

1. 원본 퀴즈는 보관하고, 복사본 이름을 `index.html`로 바꿔주세요.
2. 새 폴더를 하나 만들고 그 파일만 넣어주세요. Cram은 HTML 하나면 되니
   작업 폴더 전체를 올릴 필요는 없어요.
3. 복사본을 한 번 열어 잘 작동하는지 확인한 뒤, 아래 방법으로 올리면 돼요.

`index.html`은 사이트 주소를 열면 처음 보이는 페이지가 돼요.
`study.html` 같은 이름을 유지해도 되지만, 그때는 링크 끝에 `/study.html`까지
붙여서 보내야 할 수 있어요.

## 터미널 없이 링크 만들기

### Cloudflare Pages

Cloudflare에 가입하거나 로그인한 뒤 **Workers & Pages**에서 Pages의
**Direct Upload / 드래그 앤 드롭** 방식으로 들어가세요.
프로젝트 이름을 정하고 폴더나 ZIP을 올려 배포하면 `pages.dev` 주소가 나와요.
퀴즈를 바꾸고 싶을 땐 같은 프로젝트에서 새 배포를 만들면 돼요.
[공식 업로드 안내](https://developers.cloudflare.com/pages/get-started/direct-upload/)

### Netlify Drop

Netlify에 로그인하고 [Netlify Drop](https://app.netlify.com/drop)에 폴더를
끌어다 놓으세요. 필요하면 프로젝트를 공개로 바꾸고 `netlify.app` 주소를 보내면 돼요.
수정할 때는 해당 프로젝트의 배포 화면에 새 폴더를 다시 올리세요.
로그인 없이 올린 파일은 처음에 임시 비밀번호로 보호돼요. 계속 관리하려면 계정에
프로젝트를 연결해주세요.
[공식 업로드·공개 설정 안내](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/)

### Vercel Drop

로그인한 뒤 [Vercel Drop](https://vercel.com/drop)에 HTML이나 폴더를 올려주세요.
계정/팀과 프로젝트 이름을 선택하고 배포하면 돼요.
파일 이름이 `index.html`이 아니라면 첫 페이지를 고르는 화면에서 해당 파일을 선택하세요.
새로 드롭할 때마다 다른 프로젝트가 만들어지니, 같은 주소의 퀴즈를 수정하려면
프로젝트에서 제공하는 다른 배포 방법을 사용해야 해요.
[공식 Drop 안내](https://vercel.com/docs/drop)

### GitHub Pages

공유할 퀴즈용 공개 저장소를 만들고 최상위 폴더에 `index.html`을 올려주세요.
**Settings → Pages**에서 브랜치 배포를 선택하고, 파일이 있는 브랜치와 최상위 폴더를
지정하면 돼요. 배포가 끝나면 Pages에 표시된 사이트 주소를 보내주세요.
HTML을 수정해서 커밋하면 사이트도 업데이트돼요.
[공식 설정 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## 보내기 전에 한 번만 확인하세요

퀴즈를 만들면 제목과 화면 언어에 맞춘 설명이 HTML 메타데이터, Open Graph,
Twitter 요약 카드 태그에 들어가요. 공유 서비스가 JavaScript를 실행하지 않아도
읽을 수 있어요. 다만 이미지 미리보기는 아직 포함하지 않아요.
이미지는 별도로 올린 공개 HTTP/HTTPS 주소가 필요해요. base64 데이터 주소는
`og:image`에 적합하지 않아요. [Open Graph의 URL 규격](https://ogp.me/)은
HTTP나 HTTPS를 사용하도록 정하고 있어요. 파일을 만들 때는 최종 호스팅 주소도
모르기 때문에 `og:url`은 넣지 않아요. 실제 미리보기 모양과 갱신 시점은 링크를
공유하는 서비스에 따라 달라요.

시크릿 창에서 링크를 열어보세요. 내 호스팅 계정에 로그인하지 않아도 열리는지,
정답 확인과 다음 문제 이동이 잘 되는지 보면 돼요.
링크로 처음 열 때는 인터넷이 필요해요. 원본 HTML 파일은 여전히 오프라인으로 쓸 수 있어요.

공개로 올리면 HTML에 들어 있는 **문제와 정답도 함께 공개돼요**.
주소를 아는 사람만 들어온다고 해서 비공개인 건 아니에요.
개인적인 노트나 회사 내부 자료라면 비공개 전달 수단으로 파일을 보내거나,
접근 권한을 설정할 수 있는 호스팅을 사용하세요. 접근을 제한해도 업로드한 파일은
호스팅 업체에 전달돼요.

점수와 진도는 저장이 허용된 각자의 브라우저에 남아요.
링크로 공유한다고 점수를 함께 보거나 다른 기기와 진도를 동기화할 수 있는 건 아니에요.
로컬 파일에서 공부한 진도도 웹 주소로 자동 이전되지는 않아요.
서비스 조건이 바뀌어도 옮겨갈 수 있도록 원본 HTML은 보관해두세요.
