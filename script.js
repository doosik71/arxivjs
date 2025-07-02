const content = document.getElementById('content');
const menuTopicManagement = document.getElementById('menu-topic-management');
const menuPaperSearch = document.getElementById('menu-paper-search');
const menuPaperAnalysis = document.getElementById('menu-paper-analysis');

let lastSearchQuery = '';
let lastMaxResults = '100';
let lastSearchResults = [];


const topicManagementContent = `
    <h2>주제 관리</h2>
    <div id="topic-list"></div>
    <input type="text" id="new-topic-input" placeholder="새 주제 입력">
    <button id="add-topic-btn">주제 추가</button>
`;

menuTopicManagement.addEventListener('click', () => {
    content.innerHTML = topicManagementContent;
    loadTopics();
    document.getElementById('add-topic-btn').addEventListener('click', addTopic);
});

menuPaperSearch.addEventListener('click', () => {
    const paperSearchContent = `
        <h2>논문 검색</h2>
        <input type="text" id="search-query-input" placeholder="검색어 입력 (제목 또는 저자)" value="${lastSearchQuery}">
        <select id="max-results-select">
            <option value="100" ${lastMaxResults === '100' ? 'selected' : ''}>100개</option>
            <option value="200" ${lastMaxResults === '200' ? 'selected' : ''}>200개</option>
            <option value="500" ${lastMaxResults === '500' ? 'selected' : ''}>500개</option>
        </select>
        <button id="search-btn">검색</button>
        <div id="search-results"></div>
    `;
    content.innerHTML = paperSearchContent;
    document.getElementById('search-btn').addEventListener('click', searchPapers);

    if (lastSearchResults.length > 0) {
        displaySearchResults(lastSearchResults);
    }
});

menuPaperAnalysis.addEventListener('click', () => {
    content.innerHTML = '<h2>논문 분석</h2><p>구현 예정</p>';
});

async function loadTopics() {
    const response = await fetch('/api/topics');
    const topics = await response.json();
    const topicList = document.getElementById('topic-list');
    topicList.innerHTML = '';
    topics.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.textContent = topic;

        const renameButton = document.createElement('button');
        renameButton.textContent = '이름 바꾸기';
        renameButton.addEventListener('click', () => {
            const newTopic = prompt(`'${topic}'의 새 이름을 입력하세요.`);
            if (newTopic) {
                renameTopic(topic, newTopic);
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '삭제';
        deleteButton.addEventListener('click', () => deleteTopic(topic));
        
        topicElement.appendChild(renameButton);
        topicElement.appendChild(deleteButton);
        topicList.appendChild(topicElement);
    });
}

async function addTopic() {
    const newTopicInput = document.getElementById('new-topic-input');
    const newTopic = newTopicInput.value;
    if (!newTopic) return;

    const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: newTopic }),
    });

    if (response.ok) {
        newTopicInput.value = '';
        loadTopics();
    } else {
        alert('주제 추가 실패: ' + await response.text());
    }
}

async function renameTopic(oldTopic, newTopic) {
    const response = await fetch(`/api/topics/${oldTopic}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: newTopic }),
    });

    if (response.ok) {
        loadTopics();
    } else {
        alert('주제 이름 바꾸기 실패: ' + await response.text());
    }
}

async function deleteTopic(topic) {
    if (!confirm(`'${topic}' 주제를 삭제하시겠습니까?`)) return;

    const response = await fetch(`/api/topics/${topic}`, {
        method: 'DELETE',
    });

    if (response.ok) {
        loadTopics();
    } else {
        alert('주제 삭제 실패: ' + await response.text());
    }
}

// 초기 화면 로딩
menuTopicManagement.click();

async function searchPapers() {
    const query = document.getElementById('search-query-input').value;
    const maxResults = document.getElementById('max-results-select').value;

    if (!query) {
        alert('검색어를 입력하세요.');
        return;
    }

    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    const results = await response.json();

    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '';

    if (results.error) {
        resultsDiv.innerHTML = `<p>오류: ${results.error}</p>`;
        return;
    }

    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>검색 결과가 없습니다.</p>';
        return;
    }

    const ul = document.createElement('ul');
    results.forEach(paper => {
        const li = document.createElement('li');
        li.innerHTML = `<span style="color:dodgerblue">${paper.author}</span> - <span style="color:crimson">${paper.title}</span> (<span style="color:green">${paper.year}</span>)`;
        ul.appendChild(li);
    });
    resultsDiv.appendChild(ul);
}
