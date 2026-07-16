# AGENTS.md

이 파일은 프로젝트에 기여하는 에이전트들이 준수해야 하는 작업 규칙을 정의한다.

## 코딩 전 먼저 생각하기 (Think Before Coding)

* `README.md`에 기술된 프로젝트 목표를 존중하라.
* 요구사항을 혼자서 무작정 짐작하지 마라.
* 요구사항, 의도 또는 예상되는 동작이 모호할 때는 구현하기 전에 반드시 질문하라.
* 아키텍처, UX, 데이터 흐름, 모델 동작, 파일 레이아웃 또는 테스트에 실질적인 영향을 미칠 수 있는 트레이드오프(Trade-off)가 있다면 코딩 전에 먼저 제시하라.
* 혼란스럽거나 불확실한 부분을 숨기지 마라.
* 합리적인 가정을 바탕으로 작업을 진행할 때는 최종 보고서에 해당 가정을 명시적으로 기술하라.

## 단순함 최우선 (Simplicity First)

* 문제를 해결하는 가장 단순한 솔루션을 지향하라.
* 섣부르게 추상화를 도입하지 마라.
* 막연한 추측에 기반한 일반화, 비대한 API, 불필요한 유연성은 피하라.
* 작은 변경으로 해결될 일이라면, 거대한 프레임워크로 교체하거나 코드를 재작성하지 마라.

## 정밀한 변경 (Surgical Changes)

* 작업과 관련된 파일만 수정하라.
* 지나가는 길에 하는 리팩터링(Drive-by refactors)이나 관련 없는 코드 재작성은 피하라.
* 관련 없는 사용자의 변경 사항을 덮어쓰거나 되돌리지 마라.
* 수정이 필수적이거나 주석 내용이 틀린 경우가 아니라면, 기존의 아키텍처와 주석을 보존하라.

## 목표 지향적 실행 (Goal-Driven Execution)

* 실질적인 변경을 시작하기 전에, 명확하고 검증 가능한 성공 목표를 정의하라.
* 가장 좁은 범위의 유용한 검증을 최우선으로 하라.
* 빌드 또는 런타임 오류를 수정할 때는 가능한 한 사용자가 실행하는 실제 스크립트나 명령어로 검증하라.
* 환경적 제약으로 인해 검증이 막힌 경우, 무엇이 차단되었고 어떤 부분이 미검증 상태로 남았는지 정확히 명시하라.
* 한계점과 근거를 명확히 표시하지 않은 채 임시 플레이스홀더(Placeholder) 구현을 도입하지 마라.
* 플랫폼 전용 의존성이 다른 타겟에서 작동하지 않는 경우, 해당 제약 조건을 문서화하고 프로젝트가 계속 빌드 가능한 상태를 유지하는 구현 방식을 선택하라.

## 커밋 메시지 규칙 (Commit Message Rules)

* 커밋 메시지는 명확한 영어로 작성하라.
* 명령형 단어로 시작하는 제목 줄(Subject line)을 사용하라.
* 제목은 간결하게 유지하고 실제 변경 사항을 구체적으로 나타내야 한다.
* `fix stuff`, `update code`, `changes`와 같이 모호한 제목은 피하라.
* 가급적 저장소에 이미 확립된 스타일을 따르라:

```text
Add desktop fallback runner and fix activation exit code

- return success explicitly from `bin/activate.bat` so launcher scripts do not
  treat successful activation as a failure
- replace Android-only Desktop LiteRT usage with a JVM-safe fallback runner so
  `app-desktop` can compile and run
- keep model-file existence checks so missing Desktop assets still fail fast
```

* 필요한 경우, 제목 뒤에 변경된 내용, 변경 이유, 중요한 제약 조건이나 호환성 노트 등을 설명하는 짧은 글머리 기호를 추가하라.
* 커밋 메시지는 의도했던 계획이 아니라 실제 스테이지(stage)에 반영된 차이점(diff)과 일치해야 한다.
