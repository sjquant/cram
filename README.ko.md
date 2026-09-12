<img src="docs/logo.svg" alt="Cram 로고: C가 새겨진 주홍색 도장" width="96" height="96">

# Cram

[English](README.md) | 한국어

**무엇이든 퀴즈로 바꿔보세요.**

읽었다고 다 아는 건 아니니까요. Cram은 노트, 문서, 웹 자료를 플래시카드로
바꿔줍니다. 직접 문제를 만드는 수고 없이, 얼마나 이해했는지 확인해보세요.

AI 에이전트로 퀴즈를 만들고, 틀린 내용을 복습하세요. 완성된 퀴즈는 HTML 파일
하나로 보관하고, 오프라인으로 공부하거나 다른 사람에게 공유할 수 있습니다.

**[라이브 데모 체험하기 →](https://sjquant.github.io/cram/examples/http-caching-essentials.html)**
— 설치나 저장소 복제 없이 바로 열립니다. 데모는 영어로 제공됩니다.
**[내 퀴즈 만들기 ↓](#첫-퀴즈-만들기)**

![Cram 사용 흐름: 플래시카드를 요청하고 퀴즈에서 정답을 확인하며 복습하기](docs/demo.gif)

데모의 [카드 원본](examples/http-caching-essentials.json)을 살펴보거나,
저장소를 복제한 뒤 [HTML 파일](examples/http-caching-essentials.html)을 직접 열어보세요.

## 왜 Cram인가요?

1. **문제 만드는 시간 대신 공부에 집중하세요.** 배우고 싶은 자료를 AI 에이전트에
   건네세요. Cram 스킬이 문제 생성부터 바로 풀 수 있는 퀴즈 파일 제작까지 안내합니다.
2. **다음 복습은 틀린 카드에 집중하세요.** 먼저 답을 떠올리고, 정답을 확인한 뒤
   스스로 채점하세요. 틀린 카드만 다시 풀 수 있습니다. 브라우저 저장 공간을 사용할 수
   있으면 진도와 결과가 저장되어 나중에 이어서 공부할 수 있습니다.
3. **파일 하나로 보관하고, 공유하고, 오프라인으로 공부하세요.** 카드와 플레이어가
   HTML 파일 하나에 담깁니다. 직접 열거나 다른 사람에게 보내세요. 퀴즈를 푸는 데는
   브라우저만 있으면 됩니다. 계정, 앱 설치, 서버가 필요하지 않습니다.

## 첫 퀴즈 만들기

퀴즈를 만들려면 Cram을 지원하는 AI 에이전트와 시스템에 설치된 `python3`가
필요합니다. 퀴즈 생성 스크립트에는 별도의 Python 패키지가 필요하지 않습니다.

### 1. 스킬 설치하기

**Claude Code**에서 다음 명령을 실행하세요.

```text
/plugin marketplace add sjquant/cram
/plugin install cram@cram
```

**다른 AI 에이전트**를 사용한다면 터미널에서 다음 명령을 실행하고 에이전트를 선택하세요.

```sh
npx skills add sjquant/cram --skill cram
```

이 설치 방식은 `npx` 실행을 위해 Node.js/npm이 필요합니다.
[다른 설치 방법 ↓](#다른-설치-방법)

### 2. 공부할 자료 건네기

작업 폴더에 노트를 `notes.md`로 저장한 뒤, Claude Code에 요청하세요.

```text
/cram:cram ./notes.md를 읽고 핵심 개념을 확인할 수 있는 플래시카드 10개를 만들어줘.
카드와 플레이어는 한국어로 만들고, 퀴즈를 study.html로 저장해줘.
```

다른 에이전트에서는 “cram 스킬로 ./notes.md를 읽고 핵심 개념을 확인할 수 있는
플래시카드 10개를 만들어줘. 카드와 플레이어는 한국어로 만들고, 퀴즈를 study.html로
저장해줘.”라고 요청하세요.
자료를 붙여넣거나 문서를 첨부해도 되고, 에이전트가 접근할 수 있는 웹 URL을 전달해도 됩니다.

### 3. 퀴즈 열기

생성된 `study.html`을 브라우저에서 여세요. 카드를 풀고, 정답을 확인하고,
스스로 채점하세요. 한 차례 끝나면 결과를 살펴보거나 틀린 카드만 다시 풀 수 있습니다.

파일은 오프라인으로 다시 열거나 다른 사람에게 보낼 수 있습니다.
학습 진도는 내 브라우저에 저장되며, 공유하는 파일에는 포함되지 않습니다.

## 이런 자료로 공부해보세요

- **기술 문서:** 가이드의 핵심 개념을 직접 설명할 수 있는지 퀴즈로 확인해보세요.
  데모에서는 HTTP 캐싱을 다룹니다.
- **강의 노트:** 다음 복습 시간에 풀어볼 퀴즈를 강의 내용으로 만들어보세요.
- **온보딩 자료:** 팀 가이드를 퀴즈로 만들어 새로 합류한 팀원에게 HTML 파일로 공유하세요.

## 나에게 맞게 공부하기

기본 문답형, 객관식, 빈칸 채우기 카드로 연습할 수 있습니다. 카드에는 힌트와 해설을
추가할 수 있습니다. 플레이어는 키보드 탐색, 동작 줄이기 설정, 고대비 모드를 지원합니다.

<details>
<summary>학습 순서, 진도 저장, 키보드 설정</summary>

설정의 학습 순서 메뉴에서 **Shuffle**을 선택하면 기존 채점 기록을 학습 이력에
유지하면서 정답이 가려진 새 라운드를 시작합니다. **Restore original order**를
선택하면 원래 카드 순서로 돌아갑니다. 오답 재도전 중에는 틀린 카드 범위가 유지됩니다.
여기서 메뉴 이름은 영어 화면 기준입니다.

브라우저 저장 공간을 사용할 수 있으면 카드 순서, 현재 위치, 결과, Cram 모드의 반복
시도 기록이 저장됩니다. 저장된 학습 상태는 같은 브라우저의 같은 카드 모음에 적용되며,
카드 내용이 바뀌면 새 학습 세션이 시작됩니다.

설정에서 A/H 한 글자 단축키를 끌 수 있습니다. 브라우저 저장 공간을 사용할 수 있으면
이 설정도 유지됩니다.

</details>

### 플레이어 언어

플레이어의 버튼과 메뉴는 영어, 한국어, 일본어, 중국어 간체, 스페인어, 프랑스어를
지원합니다. 에이전트에 원하는 플레이어 언어를 요청하세요.
카드 언어는 별도입니다. 카드도 바꾸고 싶다면 번역을 함께 요청하세요.

<details>
<summary>카드 파일을 직접 렌더링할 때 플레이어 언어 지정하기</summary>

```sh
python3 skills/cram/scripts/render.py deck.json -o quiz.html --language ko
```

플레이어의 버튼과 메뉴를 한국어로 설정하며, 카드 내용은 원래 언어를 유지합니다.

</details>

## 다른 설치 방법

<details>
<summary>skills 설치 도구에서 에이전트 지정하기</summary>

[`npx skills`](https://github.com/vercel-labs/skills)는 지원하는 에이전트의 스킬 폴더에
Cram을 설치합니다. 에이전트를 직접 지정하려면 아래처럼 `--agent`를 반복하세요.

```sh
npx skills add sjquant/cram --skill cram \
  --agent codex \
  --agent cursor \
  --agent github-copilot \
  --agent grok \
  --agent kiro-cli \
  --agent antigravity-cli
```

</details>

<details>
<summary>Codex와 GitHub Copilot 마켓플레이스 명령</summary>

Codex:

```text
codex plugin marketplace add sjquant/cram
codex plugin add cram@cram
```

GitHub Copilot:

```text
copilot plugin marketplace add sjquant/cram
copilot plugin install cram@cram
```

</details>

여러 에이전트에서 사용할 수 있는 스킬은 `skills/cram/`에 있습니다. 자료에서 카드를
추출하는 과정, 카드 데이터 형식, HTML 생성 방법은 [스킬 가이드](skills/cram/SKILL.md)를
참고하세요. 가이드는 영어로 제공됩니다.

## 요구사항과 지원 범위

- **퀴즈 생성:** 원본 자료를 읽고 Python 스크립트를 실행할 수 있는 AI 에이전트가
  필요합니다. 자료 접근 권한, 계정 필요 여부, 비용, 데이터 처리 방식은 사용하는
  에이전트와 모델에 따라 달라집니다.
- **퀴즈 학습:** 브라우저만 있으면 됩니다. 생성된 HTML에 플레이어와 카드 데이터가
  포함되어 있어 서버나 네트워크 연결이 필요하지 않습니다.
- **검증:** Cram은 HTML을 만들기 전에 카드 데이터의 구조를 검사합니다.
  AI가 생성한 문제와 정답의 사실 여부를 검증하는 것은 아니므로 원본 자료와 대조해 확인하세요.

## 라이선스

[MIT](LICENSE)
