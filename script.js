const content = document.getElementById('content');
const menuTopicManagement = document.getElementById('menu-topic-management');
const menuPaperSearch = document.getElementById('menu-paper-search');
const menuPaperList = document.getElementById('menu-paper-list');
const menuPaperAnalysis = document.getElementById('menu-paper-analysis');

let lastSearchQuery = '';
let lastMaxResults = '100';
let lastSearchResults = [];
let lastSelectedTopic = '';


const topicManagementContent = `
    <h2>Topic Management</h2>
    <table class="topic-table">
        <thead>
            <tr>
                <th>Topic Name</th>
                <th width="150px">Actions</th>
            </tr>
        </thead>
        <tbody id="topic-list">
        </tbody>
    </table>
    <br/>
    <div class="center">
        <input type="text" id="new-topic-input" placeholder="Enter new topic">
        <button id="add-topic-btn">Add Topic</button>
    </div>
`;

menuTopicManagement.addEventListener('click', () => {
    content.innerHTML = topicManagementContent;
    loadTopics();
    document.getElementById('add-topic-btn').addEventListener('click', addTopic);
});

menuPaperSearch.addEventListener('click', () => {
    const paperSearchContent = `
        <h2>Paper Search</h2>
        <div class="center">
        <input type="text" id="search-query-input" placeholder="Enter keyword (title, author, or abstract)" value="${lastSearchQuery}">
        <select id="max-results-select">
            <option value="100" ${lastMaxResults === '100' ? 'selected' : ''}>100 results</option>
            <option value="200" ${lastMaxResults === '200' ? 'selected' : ''}>200 results</option>
            <option value="500" ${lastMaxResults === '500' ? 'selected' : ''}>500 results</option>
        </select>
        <button id="search-btn">Search</button>
        </div>
        <div id="search-results"></div>
    `;
    content.innerHTML = paperSearchContent;
    document.getElementById('search-btn').addEventListener('click', searchPapers);

    if (lastSearchResults.length > 0) {
        displaySearchResults(lastSearchResults);
    }
});

menuPaperList.addEventListener('click', async () => {
    content.innerHTML = `
        <h2>Paper List</h2>
        <div class="topic-selector center">
            <label for="topic-select-paper-list">Select Topic:</label>
            <select id="topic-select-paper-list"></select>
        </div>
        <div id="paper-list-results"></div>
    `;
    const topicSelectPaperList = document.getElementById('topic-select-paper-list');
    await populateTopicSelect(topicSelectPaperList);

    // Set the last selected topic if available
    if (lastSelectedTopic) {
        topicSelectPaperList.value = lastSelectedTopic;
        loadPaperListByTopic(lastSelectedTopic);
    }

    topicSelectPaperList.addEventListener('change', () => {
        lastSelectedTopic = topicSelectPaperList.value;
        loadPaperListByTopic(lastSelectedTopic);
    });
});

let selectedPaper = null;

menuPaperAnalysis.addEventListener('click', () => {
    if (selectedPaper) {
        showPaperDetails(selectedPaper);
    } else {
        content.innerHTML = '<h2>Paper Analysis</h2><p>Please select a paper from the search results to see the details.</p>';
    }
});

/**
 * Loads the list of topics from the server and renders them on the page.
 * Each topic entry includes a rename and delete button.
 */
async function loadTopics() {
    const response = await fetch('/api/topics');
    const topics = await response.json();
    topics.sort((a, b) => a.localeCompare(b)); // Sort topics alphabetically
    const topicList = document.getElementById('topic-list');
    topicList.innerHTML = '';
    topics.forEach(topic => {
        const row = document.createElement('tr');

        const topicCell = document.createElement('td');
        topicCell.textContent = topic;
        row.appendChild(topicCell);

        const actionCell = document.createElement('td');
        const renameButton = document.createElement('button');
        renameButton.textContent = 'Rename';
        renameButton.addEventListener('click', () => {
            const newTopic = prompt(`Enter a new name for '${topic}':`);
            if (newTopic) {
                renameTopic(topic, newTopic);
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTopic(topic));

        actionCell.appendChild(renameButton);
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        topicList.appendChild(row);
    });
}

/**
 * Adds a new topic.
 * Reads the value from the input field, sends a POST request,
 * and reloads the topic list upon success.
 */
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
        alert('Failed to add topic: ' + await response.text());
    }
}

/**
 * Renames an existing topic.
 * 
 * @param {string} oldTopic - The current name of the topic.
 * @param {string} newTopic - The new name to assign to the topic.
 */
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
        alert('Failed to rename topic: ' + await response.text());
    }
}

/**
 * Deletes a topic.
 * Prompts the user for confirmation and sends a DELETE request.
 * 
 * @param {string} topic - The name of the topic to delete.
 */
async function deleteTopic(topic) {
    if (!confirm(`Are you sure you want to delete the topic '${topic}'?`)) return;

    const response = await fetch(`/api/topics/${topic}`, {
        method: 'DELETE',
    });

    if (response.ok) {
        loadTopics();
    } else {
        alert('Failed to delete topic: ' + await response.text());
    }
}

// Load initial screen
menuTopicManagement.click();

/**
 * Searches academic papers using the arXiv API.
 * Retrieves query input and max result count, sends the request,
 * and displays the search results.
 */
async function searchPapers() {
    const query = document.getElementById('search-query-input').value;
    const maxResults = document.getElementById('max-results-select').value;

    if (!query) {
        alert('Please enter a search term.');
        return;
    }

    lastSearchQuery = query;
    lastMaxResults = maxResults;

    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    const results = await response.json();
    lastSearchResults = results;

    displaySearchResults(results);
}

/**
 * Renders the list of search results (papers) to the page.
 * Each paper entry includes author, title (clickable), and publication year.
 * 
 * @param {Array<Object>} results - Array of paper objects returned from arXiv.
 */
function displaySearchResults(results) {
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '';

    if (results.error) {
        resultsDiv.innerHTML = `<p>Error: ${results.error}</p>`;
        return;
    }

    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    const ul = document.createElement('ul');
    results.forEach(paper => {
        const li = document.createElement('li');

        const titleSpan = document.createElement('span');
        titleSpan.style.color = 'dodgerblue';
        titleSpan.style.cursor = 'pointer';
        titleSpan.textContent = paper.title;
        titleSpan.addEventListener('click', () => showPaperDetails(paper));

        const authorSpan = document.createElement('span');
        authorSpan.style.color = 'black';
        authorSpan.textContent = paper.author;

        const yearSpan = document.createElement('span');
        yearSpan.style.color = 'black';
        yearSpan.textContent = ` (${paper.year})`;

        li.appendChild(titleSpan);
        li.appendChild(document.createTextNode(' by '));
        li.appendChild(authorSpan);
        li.appendChild(yearSpan);

        ul.appendChild(li);
    });

    resultsDiv.appendChild(ul);
}

/**
 * Displays detailed information for a selected paper.
 * Includes title, author(s), publication year, abstract, and a link to the original paper.
 * 
 * @param {Object} paper - The selected paper object.
 */
async function showPaperDetails(paper) {
    selectedPaper = paper;
    const paperId = paper.id.split('/').pop();
    const summaryFileName = `${paperId}.json`;
    const response = await fetch(`/api/summary/${summaryFileName}`);

    let summaryContent;
    let showSummarizeButton = true;

    if (response.ok) {
        const savedPaper = await response.json();
        summaryContent = marked.parse(savedPaper.summary);
        showSummarizeButton = false;
    } else {
        summaryContent = '';
    }

    const paperAnalysisContent = `
        <h2 id="paper-analysis-title">Paper Analysis</h2>
        <div id="paper-info-container">
            <h3>${paper.title}</h3>
            <p><strong>Author(s):</strong> ${paper.author}</p>
            <p><strong>Publication Year:</strong> ${paper.year}</p>
            <p><strong>Abstract:</strong></p>
            <p>${paper.abstract}</p>
            <a href="${paper.id}" target="_blank">View Full Paper on arXiv</a>
            <span class="paper-analysis-topic-selector">
                <label for="topic-select-paper-analysis">Add to Topic:</label>
                <select id="topic-select-paper-analysis"></select>
                <button id="add-paper-to-topic-btn">Add Paper</button>
            </span>
            <span class="summarize-button-container">
                ${showSummarizeButton ? '<button id="summarize-btn">Summarize the paper</button>' : ''}
            </span>
        </div>
        <div class="paper-info-toggle-container">
            <button id="toggle-paper-info-btn">Hide paper info</button>
        </div>
        <table class="paper-analysis-layout" height="100%">
            <tr>
                <td class="pdf-viewer-cell">
                    <iframe id="pdf-viewer" src="${paper.id.replace('/abs/', '/pdf/')}.pdf" width="100%" height="100%"></iframe>
                </td>
                <td class="summary-content-cell">
                    <div id="summary-container" height="100%">${summaryContent}</div>
                </td>
            </tr>
        </table>
    `;
    content.innerHTML = paperAnalysisContent;

    if (showSummarizeButton) {
        document.getElementById('summarize-btn').addEventListener('click', () => summarizePaper(paper));
    }

    const paperAnalysisTitle = document.getElementById('paper-analysis-title');
    const toggleButton = document.getElementById('toggle-paper-info-btn');
    const paperInfoContainer = document.getElementById('paper-info-container');
    let isPaperInfoVisible = true;

    toggleButton.addEventListener('click', () => {
        if (isPaperInfoVisible) {
            paperAnalysisTitle.style.display = 'none';
            paperInfoContainer.style.display = 'none';
            toggleButton.textContent = 'Show paper info';
        } else {
            paperAnalysisTitle.style.display = 'block';
            paperInfoContainer.style.display = 'block';
            toggleButton.textContent = 'Hide paper info';
        }
        isPaperInfoVisible = !isPaperInfoVisible;
    });

    // Populate topic select and add event listener for saving paper
    const topicSelectPaperAnalysis = document.getElementById('topic-select-paper-analysis');
    const addPaperToTopicBtn = document.getElementById('add-paper-to-topic-btn');

    await populateTopicSelect(topicSelectPaperAnalysis);

    addPaperToTopicBtn.addEventListener('click', async () => {
        const selectedTopic = topicSelectPaperAnalysis.value;
        if (selectedTopic) {
            await savePaperToTopic(paper, selectedTopic);
        } else {
            alert('Please select a topic.');
        }
    });

    // Typeset MathJax after content is loaded
    if (window.MathJax) {
        MathJax.typesetPromise(['#summary-container']);
    }
}

/**
 * Populates a given select element with topics fetched from the server.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 */
async function populateTopicSelect(selectElement) {
    const response = await fetch('/api/topics');
    const topics = await response.json();
    selectElement.innerHTML = '<option value="">--No Topic Specified--</option>'; // Default option
    topics.sort((a, b) => a.localeCompare(b));
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        selectElement.appendChild(option);
    });
}

/**
 * Saves paper details to a specific topic folder on the server.
 * @param {Object} paper - The paper object to save.
 * @param {string} topic - The topic name to save the paper under.
 */
async function savePaperToTopic(paper, topic) {
    const paperId = paper.id.split('/').pop();
    const paperFileName = `${paperId}.json`;
    const paperData = {
        id: paper.id,
        title: paper.title,
        author: paper.author,
        year: paper.year,
        abstract: paper.abstract
    };

    const response = await fetch(`/api/topics/${topic}/papers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(paperData),
    });

    if (response.ok) {
        alert(`Paper added to topic "${topic}" successfully!`);
    } else {
        alert('Failed to add paper to topic: ' + await response.text());
    }
}

/**
 * Sends a paper to the server to be summarized using the Gemini model,
 * streams and displays the summary result, and saves the final summary
 * along with the paper metadata back to the server.
 * 
 * @param {Object} paper - The paper object to summarize.
 */
async function summarizePaper(paper) {
    const summarizeBtn = document.getElementById('summarize-btn');
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = 'Summarizing...';

    const summaryContainer = document.getElementById('summary-container');
    summaryContainer.innerHTML = '';

    const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(paper),
    });

    if (!response.body) {
        summaryContainer.innerHTML = '<p>Error: Could not get summary stream.</p>';
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let summaryText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        summaryText += chunk;
        summaryContainer.innerHTML = marked.parse(summaryText);
        if (window.MathJax) {
            MathJax.typesetPromise(['#summary-container']);
        }
    }

    summarizeBtn.style.display = 'none';

    const finalPaperData = { ...paper, summary: summaryText };

    await fetch('/api/paper', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPaperData),
    });
}

/**
 * Loads the list of papers for a selected topic and displays them.
 * @param {string} topic - The selected topic name.
 */
async function loadPaperListByTopic(topic) {
    const paperListResults = document.getElementById('paper-list-results');
    paperListResults.innerHTML = '';

    if (!topic) {
        paperListResults.innerHTML = '<p>Please select a topic to view papers.</p>';
        return;
    }

    const response = await fetch(`/api/topics/${topic}/papers`);
    const papers = await response.json();

    if (papers.length === 0) {
        paperListResults.innerHTML = '<p>No papers found for this topic.</p>';
        return;
    }

    const ul = document.createElement('ul');
    papers.forEach(paper => {
        const li = document.createElement('li');

        const titleSpan = document.createElement('span');
        titleSpan.style.color = 'dodgerblue';
        titleSpan.style.cursor = 'pointer';
        titleSpan.textContent = paper.title;
        titleSpan.addEventListener('click', () => showPaperDetails(paper));

        const authorSpan = document.createElement('span');
        authorSpan.style.color = 'black';
        authorSpan.textContent = ` by ${paper.author}`;

        const yearSpan = document.createElement('span');
        yearSpan.style.color = 'black';
        yearSpan.textContent = ` (${paper.year})`;

        li.appendChild(titleSpan);
        li.appendChild(authorSpan);
        li.appendChild(yearSpan);

        ul.appendChild(li);
    });
    paperListResults.appendChild(ul);
}