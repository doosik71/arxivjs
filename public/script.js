document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const hideMenu = document.getElementById('hide-menu');
    const showMenu = document.getElementById('show-menu');
    const menuItems = document.getElementById('menu-items');
    const topicListMenu = document.getElementById('topic-list-menu');
    const paperListMenu = document.getElementById('paper-list-menu');
    const paperDetailMenu = document.getElementById('paper-detail-menu');
    const topicListView = document.getElementById('topic-list-view');
    const paperListView = document.getElementById('paper-list-view');
    const paperDetailView = document.getElementById('paper-detail-view');
    const hideAbstractButton = document.getElementById('hide-abstract');
    const showAbstractButton = document.getElementById('show-abstract');
    const abstractCell = document.getElementById('paper-detail-info-table-abstract');

    hideAbstractButton.addEventListener('click', () => {
        abstractCell.style.display = 'none';
        hideAbstractButton.style.display = 'none';
        showAbstractButton.style.display = 'inline';
    });

    showAbstractButton.addEventListener('click', () => {
        abstractCell.style.display = 'table-cell';
        hideAbstractButton.style.display = 'inline';
        showAbstractButton.style.display = 'none';
    });

    let currentTopic = null;

    function showView(view) {
        topicListView.style.display = 'none';
        paperListView.style.display = 'none';
        paperDetailView.style.display = 'none';
        view.style.display = 'block';
    }

    hideMenu.addEventListener('click', () => {
        sidebar.classList.remove("wide");
        hideMenu.style.display = 'none';
        showMenu.style.display = 'block';
        menuItems.style.display = 'none';
        mainContent.classList.add("wide");
    });

    showMenu.addEventListener('click', () => {
        sidebar.classList.add("wide");
        hideMenu.style.display = 'block';
        showMenu.style.display = 'none';
        menuItems.style.display = 'block';
        mainContent.classList.remove("wide");
    });

    topicListMenu.addEventListener('click', () => showView(topicListView));
    paperListMenu.addEventListener('click', () => {
        if (currentTopic) {
            showView(paperListView);
            loadPapers(currentTopic);
        } else {
            alert('Please select a topic first.');
        }
    });
    paperDetailMenu.addEventListener('click', () => {
        if (paperDetailView.dataset.paper) {
            showView(paperDetailView);
        } else {
            alert('Please select a paper first.');
        }
    });

    async function loadTopics() {
        const response = await fetch('/topics');
        const topics = await response.json();
        const tbody = document.querySelector('#topic-list-table tbody');
        tbody.innerHTML = '';
        topics.forEach(topic => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="topic-name">${topic}</td>
                <td>
                    <button class="rename-topic">Rename</button>
                    <button class="delete-topic">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('add-topic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTopicName = document.getElementById('new-topic-name').value;
        await fetch('/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicName: newTopicName })
        });
        loadTopics();
        document.getElementById('new-topic-name').value = '';
    });

    document.querySelector('#topic-list-table tbody').addEventListener('click', async (e) => {
        const topicName = e.target.closest('tr').querySelector('.topic-name').textContent;
        if (e.target.classList.contains('topic-name')) {
            currentTopic = topicName;
            showView(paperListView);
            loadPapers(currentTopic);
            document.querySelector('#search-results-table tbody').innerHTML = "";
        } else if (e.target.classList.contains('rename-topic')) {
            const newName = prompt('Enter new topic name:', topicName);
            if (newName) {
                await fetch(`/topics/${topicName}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newName })
                });
                loadTopics();
            }
        } else if (e.target.classList.contains('delete-topic')) {
            if (confirm(`Are you sure you want to delete topic "${topicName}"?`)) {
                const response = await fetch(`/topics/${topicName}`, { method: 'DELETE' });
                if (response.ok) {
                    loadTopics();
                } else {
                    const data = await response.json();
                    alert(data.message);
                }
            }
        }
    });

    async function loadPapers(topicName) {
        document.getElementById('paper-list-topic-name').textContent = topicName;
        document.getElementById('search-keyword').value = topicName;

        const response = await fetch(`/papers/${topicName}`);
        const papers = await response.json();
        const tbody = document.querySelector('#paper-list-table tbody');
        tbody.innerHTML = '';
        papers.forEach(paper => {
            const tr = document.createElement('tr');
            tr.dataset.paper = JSON.stringify(paper);
            tr.innerHTML = `
                <td class="paper-title">${paper.title}</td>
                <td>${paper.authors}</td>
                <td>
                    <button class="move-paper">Move</button>
                    <button class="delete-paper">Delete</button>
                </td>
                <td>${paper.year}</td>
                <td><a href="${paper.url}" target="_blank">Link</a></td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('search-paper-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyword = document.getElementById('search-keyword').value || currentTopic;
        const year = document.getElementById('search-year').value;
        const response = await fetch(`/search?keyword=${keyword}&year=${year}`);
        const papers = await response.json();
        const tbody = document.querySelector('#search-results-table tbody');
        tbody.innerHTML = '';
        papers.forEach(paper => {
            const tr = document.createElement('tr');
            tr.dataset.paper = JSON.stringify(paper);
            tr.innerHTML = `
                <td class="paper-title">${paper.title}</td>
                <td>${paper.authors}</td>
                <td>${paper.year}</td>
                <td><a href="${paper.url}" target="_blank">Link</a></td>
            `;
            tbody.appendChild(tr);
        });
    });

    function populateYearFilter() {
        const select = document.getElementById('search-year');
        const currentYear = new Date().getFullYear();
        select.innerHTML = '<option value="">---</option>';
        for (let i = 0; i < 10; i++) {
            const start = currentYear - (i * 3);
            const end = start - 2;
            select.innerHTML += `<option value="${end}~${start}">${end}~${start}</option>`;
        }
    }

    document.querySelector('#paper-list-table tbody').addEventListener('click', async (e) => {
        const paperData = JSON.parse(e.target.closest('tr').dataset.paper);
        const paperId = btoa(paperData.url);
        if (e.target.classList.contains('paper-title')) {
            showPaperDetail(paperData);
        } else if (e.target.classList.contains('move-paper')) {
            const newTopic = prompt('Enter new topic name:');
            if (newTopic) {
                await fetch(`/papers/${currentTopic}/${paperId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newTopicName: newTopic })
                });
                loadPapers(currentTopic);
            }
        } else if (e.target.classList.contains('delete-paper')) {
            if (confirm(`Are you sure you want to delete paper "${paperData.title}"?`)) {
                await fetch(`/papers/${currentTopic}/${paperId}`, { method: 'DELETE' });
                loadPapers(currentTopic);
            }
        }
    });

    document.querySelector('#search-results-table tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('paper-title')) {
            const paperData = JSON.parse(e.target.closest('tr').dataset.paper);
            showPaperDetail(paperData, true);
        }
    });

    async function showPaperDetail(paper, fromSearch = false) {
        paperDetailView.dataset.paper = JSON.stringify(paper);
        showView(paperDetailView);

        document.getElementById('paper-detail-info-table-title').innerText = paper.title;
        document.getElementById('paper-detail-info-table-authors').innerText = paper.authors;
        document.getElementById('paper-detail-info-table-year').innerText = paper.year;
        document.getElementById('paper-detail-info-table-url').innerHTML = `<a href="${paper.url}" target="_blank">Link</a>`;
        document.getElementById('paper-detail-info-table-abstract').innerText = paper.abstract.replaceAll('\n', ' ');

        const pdfUrl = paper.url.replace('/abs/', '/pdf/');
        document.getElementById('pdf-view-frame').src = pdfUrl;

        const summarizeButton = document.getElementById('summarize-button');
        const summaryContent = document.getElementById('summary-content');

        summarizeButton.style.display = 'none';
        summaryContent.innerHTML = 'Loading summary...';
        const paperId = btoa(paper.url);
        try {
            const response = await fetch(`/paper-summary/${currentTopic}/${paperId}`);
            if (response.ok) {
                const data = await response.json();
                summaryContent.innerHTML = marked.parse(data.summary);
                MathJax.typeset();
            } else {
                summaryContent.innerHTML = '';
                summarizeButton.style.display = 'block';
            }
        } catch (error) {
            summaryContent.innerHTML = `Error loading summary: ${error}`;
            summarizeButton.style.display = 'block';
        }
    }

    document.getElementById('summarize-button').addEventListener('click', async () => {
        const summarizeButton = document.getElementById('summarize-button');
        const paper = JSON.parse(paperDetailView.dataset.paper);
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = 'Summarizing...';

        const response = await fetch('/summarize-and-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paper, topicName: currentTopic })
        });

        if (!response.ok || !response.body) {
            const text = await response.text();
            console.error('Failed to fetch summary:', text);
            summaryContent.innerHTML = 'Error: Invalid response!';
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let summary = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        summary += JSON.parse(line.substring(6));
                        summaryContent.innerHTML = marked.parse(summary);
                        MathJax.typeset();
                    } catch (e) {
                        // Ignore empty data chunks
                    }
                }
            }
        }

        summarizeButton.style.display = 'none';
    });

    loadTopics();
    populateYearFilter();
    showView(topicListView);
});