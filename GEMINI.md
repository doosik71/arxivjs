# arxivjs

arxivjs는 arXiv API와 상호작용하는 Node 기반 웹 앱이다.
arxivjs는 논문의 주제를 관리하고 논문 주제와 관련한 논문을 API를 이용하여 arxiv.org에서 검색하고 Gemini를 통해 논문을 자동 요약할 수 있며 이를 파일에 저장하여 사용자가 쉽게 논문 정보를 조회할 수 있다.

## 사용하는 패키지

* @google/generative-ai: Gemini에 논문 요약 요청을 위해 사용
* axios: HTML 클라이언트 라이브러리
* dotenv: 사용자 환경 설정을 읽는 라이브러리
* express: 웹 앱 개발 프레임워크
* nodemon: 앱 서버 자동 실행 라이브러리
* xml2js: XML 파서
* electron: 데스크톱 앱으로 패키징하기 위해 사용

## 소스 파일 구성

* index.js: 앱 실행 및 백엔드 로직
* public/index.html: 클라이언트 UI
* public/script.js: 클라이언트 자바스크립트
* public/style.css: 클라이언트 UI 스타일 정의
* main.js: Electron 앱의 메인 프로세스
* preload.js: Electron 앱의 preload 스크립트

## Arxiview 앱

`arxiview`는 React와 Vite를 사용하여 구축된 새로운 클라이언트 애플리케이션으로, 기존의 `public` 폴더 기반 클라이언트를 대체한다. Electron을 통해 데스크톱 앱으로도 패키징된다.

### 주요 소스 파일 구성

*   `arxiview/src/App.jsx`: 메인 애플리케이션 컴포넌트
*   `arxiview/src/main.jsx`: 애플리케이션 진입점
*   `arxiview/src/components/`: TopicList, PaperList, PaperDetail 등 UI 뷰를 위한 React 컴포넌트
*   `arxiview/electron/main.js`: Arxiview 앱을 위한 Electron 메인 프로세스 스크립트

## 실행 파일 구성

* run_arxivjs_app.bat: Electron 앱을 실행한다.
* run_arxivjs_server.bat: nodemon을 이용하여 로컬 서버를 실행한다.
* run_gemini.bat: 앱 개발을 위해 gemini를 실행한다.

## 특징 및 기능

* Node.js와 Electron을 기반으로 하는 단일 페이지 데스크톱 애플리케이션이다.
* 앱이 시작될 때 `GEMINI_API_KEY` 환경 변수와 `userprompt.txt` 파일의 존재 여부를 확인하고, 없을 경우 에러 메시지를 표시한다.
* 웹 UI 인터페이스 언어는 영어를 사용한다.
* 소스 코드에서 정의된 모든 함수에는 영어로 작성된 docstring이 있다.
* 웹 페이지의 좌측에 접이식 사이드 메뉴를 배치한다.
* 사이드 메뉴의 상단에는 메뉴를 접고 펼 수 있는 토글 버튼이 있다.
* 사이드 메뉴에는 "Topic List", "Paper List", "Paper Detail" 메뉴 항목이 있다.
* 앱을 처음 실행 시 나타나는 기본 화면은 Topic List 화면이다.
* 메인 화면에는 Topic List, Paper List, Paper Detail 화면 중 하나만 표시된다.
* 사이드 메뉴는 고정되어 있으며, 메인 화면의 내용은 수직 스크롤이 가능하다.

### Topic List 화면의 주요 기능

* 새로운 논문 주제를 생성하고 기존 주제 목록을 관리할 수 있다.
* 새로운 주제를 추가하면, `arxivjsdata` 폴더 안에 주제와 동일한 이름의 폴더를 생성한다. Electron 앱에서는 사용자 데이터 디렉토리에, 로컬 서버에서는 프로젝트 루트에 생성된다.
* 주제 이름은 영어, 한글, 숫자, 공백, 하이픈(-), 소괄호()를 포함할 수 있다.
* 주제 목록은 카드(card) 형식으로 표시되며, 알파벳 순서로 정렬된다.
* 각 카드에 마우스를 올리면 "Rename"과 "Delete" 버튼이 나타난다.
* "Rename" 버튼으로 주제 이름을 변경하면 해당 폴더 이름도 함께 변경된다.
* "Delete" 버튼으로 주제를 삭제할 수 있으며, 폴더가 비어있을 때만 삭제 가능하다.
* 주제 카드를 클릭하면 Paper List 화면으로 전환된다.

### Paper List 화면의 주요 기능

* 선택된 주제와 관련된 논문 목록을 표시하고 새로운 논문을 검색하여 추가할 수 있다.
* 주제가 선택되지 않은 경우, 사용자에게 주제를 먼저 선택하라는 안내를 한다.
* 화면 상단에 현재 선택된 주제의 이름이 표시된다.
* 논문 목록은 "Title", "Authors", "Actions", "Year", "URL" 열을 가진 표 형식으로 표시된다.
* 논문 정보는 `arxivjsdata/{주제명}/` 폴더 안의 JSON 파일에서 가져온다.
* JSON 파일의 이름은 논문의 URL을 Base64로 인코딩한 것이다.
* 논문 목록은 발표 연도 내림차순, 제목 오름차순으로 정렬된다.
* 논문 제목을 클릭하면 Paper Detail 화면으로 이동한다.
* "Actions" 열의 "Move" 버튼으로 논문을 다른 주제로 옮길 수 있으며, "Delete" 버튼으로 삭제할 수 있다.
* 하단의 검색 폼을 통해 arXiv에서 논문을 검색할 수 있다.
* 검색 폼은 키워드 입력 필드, 검색 기간, 검색 결과 수량 선택 콤보 박스, "Search" 버튼으로 구성된다.
* 키워드 필드에는 현재 주제명이 기본으로 입력되어 있다.
* 검색 기간은 최근 30년까지 3년 단위로 선택할 수 있다.
* 검색 결과 수량은 200, 500, 1000개 중에서 선택할 수 있다.
* 검색 결과는 "Title", "Authors", "Year", "URL" 열을 가진 표로 표시된다.

### Paper Detail 화면의 주요 기능

* Paper List 또는 검색 결과에서 선택한 논문의 상세 정보를 표시한다.
* 논문이 선택되지 않은 경우, 사용자에게 논문을 먼저 선택하라는 안내를 한다.
* 화면 상단에 논문의 제목, 저자, 발표 연도, URL, 초록이 표시된다.
* 화면 중앙은 수직 분할자를 이용하여 요약(왼쪽)과 PDF 뷰(오른쪽) 두 부분으로 나뉜다.
* 분할자를 드래그하여 각 부분의 너비를 조절할 수 있다.
* PDF 뷰어에는 논문의 PDF 파일이 표시된다.
* 요약 부분에는 논문의 요약 내용이 표시된다.
* 요약 정보가 없는 경우 "Summarize" 버튼이 표시된다.
* "Summarize" 버튼을 클릭하면, 논문 PDF의 텍스트를 추출하여 Gemini API에 요약을 요청한다.
* 요약 프롬프트는 `arxivjsdata/userprompt.txt` 파일에서 읽어온다.
* Gemini의 응답은 스트림 방식으로 실시간으로 화면에 출력된다.
* 요약이 완료되면, 논문 정보는 JSON 파일로, 요약 내용은 마크다운(.md) 파일로 `arxivjsdata/{주제명}/` 폴더에 저장된다.
* 파일 이름은 논문 URL을 Base64로 인코딩하여 사용한다.
* 요약 내용은 마크다운 형식으로 렌더링되며, MathJax를 통해 수식을 지원한다. (`$...$` 및 `$$...$$` 형식 모두 지원)