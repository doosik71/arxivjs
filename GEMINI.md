# arxivjs

arxivjs는 arXiv API와 상호작용하는 Node 기반 웹 앱이다.

## Features

### 구현된 기능

* Node 기반 단일 페이지 어플리케이션 앱이다.
* 웹 UI 인터페이스 언어는 영어를 사용한다.
* 소스 코드의 docstring은 영어로 작성한다.
* 프로그램 시작을 위한 배치파일은 "run_arxivjs.bat"이다.
* 웹 페이지의 상단 메뉴는 "Topic Management", "Paper Search", "Paper Analysis"으로 구성되어 있다.
* "Topic Management" 메뉴를 선택하면, 중앙에 Topic Management 화면이 표시된다.
* "Topic Management" 화면
  * 생성된 논문의 주제 목록을 확인할 수 있다.
  * 논문의 주제 목록은 표(table)의 형식으로 출력한다.
  * 주제 목록은 알파벳 순으로 표시한다.
  * 새로운 논문의 주제를 추가할 수 있다.
  * 기존에 생성된 논문의 주제를 삭제할 수 있다.
  * 논문의 주제를 생성하면 "data/topic" 폴더 안에 논문 주제와 동일한 이름의 폴더를 생성한다.
  * 논문의 주제 이름을 바꾸면, 해당 폴더의 이름도 함께 바뀐다.
  * 논문의 주제 삭제하면, 해당 폴더가 비어 있으면 폴더를 삭제하며, 비어 있지 않으면 삭제 여부를 확인한다.
  * 논문의 주제 이름은 영어, 한글, 숫자, 공백문자(space)를 입력할 수 있으며 다른 특수문자와 기호는 사용할 수 없다.
* "Paper Search" 화면
  * 검색할 텍스트를 입력할 수 있다.
  * 논문 검색은 arxiv의 API를 사용한다.
  * 검색 건수를 100, 200, 500으로 선택할 수 있으며 최대 500 건까지 검색할 수 있다.
  * 검색 결과는 저자명, 논문 제목, 발표연도의 형식으로 출력한다.
  * 사용자가 입력한 텍스트를 논문 제목(title), 저자명(authors), 요약문(abstract)으로부터 검색한다.
  * 검색 결과를 표시할 때 논문 제목은 dodgerblue 색으로 표시한다.
  * 목록의 순서는 최신 발표논문을 먼저 출력한다.
  * 논문 검색 텍스트, 검색 건수, 검색 결과 목록을 메모리에 기억하여, Topic Management 화면, Paper Analysis 화면으로 이동했다가 Paper Search 화면으로 돌아올 때 이전의 논문 검색 텍스트와 검색 결과 목록을 표시해야 한다.
  * 논문 제목을 클릭하면, Paper Analysis 화면에 선택한 논문의 상세한 정보를 표시한다.
* "Paper Analysis" 화면
  * 논문의 상세 정보 화면에는 논문의 제목, 저자, 출판연도, 요약, 논문의 원문에 접근할 수 있는 URL, 자동 요약 정보를 표시한다.
  * data/summary 폴더에 논문의 상세 정보가 없으면, "Summarize the paper" 버튼을 표시한다.
  * data/summary 폴더에 논문의 상세 정보가 있으면, 상세 정보를 파일에서 읽고 표시한다.
  * 예를 들어, 논문의 URL이 <http://arxiv.org/abs/2506.16571v2>이면 논문의 상세 정보는 "data/summary/2506.16571v2.json" 경로의 파일에 저장된다.
  * "Summarize the paper" 버튼을 누르면 논문의 URL(여기에서는 <http://arxiv.org/pdf/2506.16571v2>에서 논문 파일을 읽고, 텍스트를 추출한 후, Gemini에 자동 논문 요약을 요청한다.
  * Gemini의 응답은 stream 방식으로 받아 실시간으로 화면에 출력하고, 논문의 자동 요약이 완료되면, data/summary 폴더에 논문의 상세 정보를 json 형식으로 출력한다.
  * 논문의 상세 정보 파일에는 논문의 제목, 저자, 출판연도, 요약과 Gemini의 자동 요약 정보를 모두 저장한다.

### 구현해야 할 기능 및 특징

* "Paper Analysis" 화면
  * 논문의 자동 요약을 위한 프롬프트는 별도의 파일로 관리한다.

## Setup

1. Clone the repository.
2. Install dependencies (e.g., `npm install`).
3. Create a `.env` file and add your `GEMINI_API_KEY`.
