/**
 * @file script.js
 * @description This file contains the client-side logic for the arxivjs application.
 * It handles user interactions, fetches data from the server, and dynamically updates the UI.
 */

document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);

/**
 * Main function that runs when the DOM is fully loaded.
 * Initializes the application by setting up constants, variables, and event listeners.
 */
function handleDOMContentLoaded() {
    // Helper function to get an element by ID and log an error if not found.
    const getElement = (id, container = document) => {
        const el = container.getElementById(id);
        if (!el) {
            console.error(`Initialization failed: Element with ID '${id}' not found.`);
        }
        return el;
    };

    // Helper function to get an element by selector and log an error if not found.
    const querySelector = (selector, container = document) => {
        const el = container.querySelector(selector);
        if (!el) {
            console.error(`Initialization failed: Element with selector '${selector}' not found.`);
        }
        return el;
    };

    // DOM Element Constants
    const sidebar = getElement('sidebar');
    const mainContent = getElement('main-content');
    const toggleMenuButton = getElement('toggle-menu');
    const toggleMenuIcon = getElement('toggle-menu-icon');
    const menuContainer = getElement('menu-container');
    const topicListMenu = getElement('topic-list-menu');
    const paperListMenu = getElement('paper-list-menu');
    const paperDetailMenu = getElement('paper-detail-menu');
    const topicListView = getElement('topic-list-view');
    const paperListView = getElement('paper-list-view');
    const paperDetailView = getElement('paper-detail-view');
    const addTopicForm = getElement('add-topic-form');
    const topicListCards = getElement('topic-list-cards');
    const searchPaperForm = getElement('search-paper-form');
    const paperListTableBody = querySelector('#paper-list-table tbody');
    const searchResultsTableBody = querySelector('#search-results-table tbody');
    const summarizeButton = getElement('summarize-button');
    const splitter = getElement('splitter');
    const summaryView = getElement('summary-view');
    const abstractCell = getElement('paper-detail-info-table-abstract');

    // Validate that all critical elements were found before proceeding.
    const criticalElements = [
        sidebar, mainContent, toggleMenuButton, toggleMenuIcon, menuContainer,
        topicListMenu, paperListMenu, paperDetailMenu, topicListView, paperListView,
        paperDetailView, addTopicForm, topicListCards, searchPaperForm, paperListTableBody,
        searchResultsTableBody, summarizeButton, splitter, summaryView, abstractCell
    ];

    if (criticalElements.some(el => !el)) {
        console.error("Stopping script execution due to missing critical elements.");
        return;
    }

    // State Variables
    let currentTopic = null;

    // --- Function Definitions ---

    /**
     * Shows a specific view (topic list, paper list, or paper detail) and hides the others.
     * @param {HTMLElement} view - The view element to display.
     */
    function showView(view) {
        topicListView.style.display = 'none';
        paperListView.style.display = 'none';
        paperDetailView.style.display = 'none';
        view.style.display = 'block';
    }

    /**
     * Toggles the visibility of the sidebar menu.
     * Expands or collapses the sidebar, and updates the menu item text accordingly.
     */
    function handleToggleMenuClick() {
        const isHidden = sidebar.classList.contains('hidden');
        sidebar.classList.toggle('hidden');
        mainContent.classList.toggle('wide');
        toggleMenuIcon.classList.toggle('arrow-left');
        toggleMenuIcon.classList.toggle('arrow-right');

        const menuTopicList = document.getElementById('topic-list-menu');
        const menuPaperList = document.getElementById('paper-list-menu');
        const menuPaperDetail = document.getElementById('paper-detail-menu');
        const topicListIcon = `
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="silver" stroke-width="2" width="1em">
            <polyline points="6.4,20 16,20" />
            <rect x="17.6" y="16.8" width="38.4" height="6.4" rx="1" fill="gray"/>
            <polyline points="6.4,20 6.4,34.4 16,34.4" />
            <rect x="17.6" y="31.2" width="38.4" height="6.4" rx="1" fill="gray"/>
            <polyline points="6.4,34.4 6.4,48.8 16,48.8 25.6,48.8" />
            <rect x="27.2" y="45.6" width="28.8" height="6.4" rx="1" fill="gray"/>
            </svg>`;
        const paperListIcon = `
            <svg viewBox="0 0 64 64" fill="gray" xmlns="http://www.w3.org/2000/svg" width="1em">
            <rect x="8" y="12" width="8" height="8" fill="silver"/>
            <rect x="8" y="28" width="8" height="8" fill="silver"/>
            <rect x="8" y="44" width="8" height="8" fill="silver"/>
            <rect x="20" y="12" width="36" height="8"/>
            <rect x="20" y="28" width="36" height="8"/>
            <rect x="20" y="44" width="36" height="8"/>
            </svg>`;
        const paperDetailIcon = `
            <svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="silver" stroke-width="4" width="1em">
            <path d="M12,12 H52 A4,4 0 0 1 56,16 V56 A4,4 0 0 1 52,60 H12 A4,4 0 0 1 8,56 V16 A4,4 0 0 1 12,12 Z" fill="none" stroke="gray"/>
            <line x1="16" y1="28" x2="48" y2="28"/>
            <line x1="16" y1="34" x2="48" y2="34"/>
            <line x1="16" y1="40" x2="42" y2="40"/>
            <line x1="16" y1="46" x2="38" y2="46"/>
            </svg>`;

        // The state before the toggle is in `isHidden`.
        // If it was hidden, it is now visible.
        if (isHidden) {
            menuTopicList.innerHTML = topicListIcon + ' Topic List';
            menuPaperList.innerHTML = paperListIcon + ' Paper List';
            menuPaperDetail.innerHTML = paperDetailIcon + ' Paper Detail';
        } else {
            menuTopicList.innerHTML = topicListIcon;
            menuPaperList.innerHTML = paperListIcon;
            menuPaperDetail.innerHTML = paperDetailIcon;
        }
    }

    /**
     * Handles the click event on the "Topic List" menu item.
     * Shows the topic list view.
     */
    function handleTopicListMenuClick() {
        showView(topicListView);
    }

    /**
     * Handles the click event on the "Paper List" menu item.
     * Shows the paper list view for the currently selected topic.
     */
    function handlePaperListMenuClick() {
        if (currentTopic) {
            showView(paperListView);
            loadPapers(currentTopic);
        } else {
            alert('Please select a topic first.');
        }
    }

    /**
     * Handles the click event on the "Paper Detail" menu item.
     * Shows the paper detail view if a paper has been selected.
     */
    function handlePaperDetailMenuClick() {
        if (paperDetailView.dataset.paper) {
            showView(paperDetailView);
        }
        else {
            alert('Please select a paper first.');
        }
    }

    /**
     * Fetches topics from the server and displays them as cards.
     */
    async function loadTopics() {
        const response = await fetch('/topics');
        const topics = await response.json();
        topicListCards.innerHTML = '';
        topics.forEach(topic => {
            const card = document.createElement('div');
            card.className = 'topic-card';
            card.innerHTML = `
                <div class="topic-name">${topic}</div>
                <div class="topic-actions" style="display: none;">
                    <button class="rename-topic card-button">Rename</button>
                    <button class="delete-topic card-button">Delete</button>
                </div>
            `;
            card.addEventListener('mouseenter', handleTopicCardMouseEnter);
            card.addEventListener('mouseleave', handleTopicCardMouseLeave);
            topicListCards.appendChild(card);
        });
    }

    /**
     * Shows the action buttons on a topic card when the mouse enters.
     * @param {MouseEvent} e - The mouse event.
     */
    function handleTopicCardMouseEnter(e) {
        e.currentTarget.querySelector('.topic-actions').style.display = 'flex';
    }

    /**
     * Hides the action buttons on a topic card when the mouse leaves.
     * @param {MouseEvent} e - The mouse event.
     */
    function handleTopicCardMouseLeave(e) {
        e.currentTarget.querySelector('.topic-actions').style.display = 'none';
    }

    /**
     * Handles the submission of the "add topic" form.
     * Sends a request to the server to create a new topic.
     * @param {SubmitEvent} e - The form submission event.
     */
    async function handleAddTopicFormSubmit(e) {
        e.preventDefault();
        const newTopicNameInput = document.getElementById('new-topic-name');
        const newTopicName = newTopicNameInput.value;
        await fetch('/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicName: newTopicName })
        });
        loadTopics();
        newTopicNameInput.value = '';
    }

    /**
     * Handles click events within the topic list container.
     * Manages selecting, renaming, and deleting topics.
     * @param {MouseEvent} e - The click event.
     */
    async function handleTopicListCardsClick(e) {
        const target = e.target;
        const card = target.closest('.topic-card');
        if (!card) return;

        const topicName = card.querySelector('.topic-name').textContent;

        if (target.classList.contains('topic-name')) {
            currentTopic = topicName;
            showView(paperListView);
            loadPapers(currentTopic);
            document.querySelector('#search-results-table tbody').innerHTML = "";
        } else if (target.classList.contains('rename-topic')) {
            const newName = prompt('Enter new topic name:', topicName);
            if (newName) {
                await fetch(`/topics/${topicName}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newName })
                });
                loadTopics();
            }
        } else if (target.classList.contains('delete-topic')) {
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
    }

    /**
     * Fetches and displays the list of papers for a given topic.
     * @param {string} topicName - The name of the topic to load papers for.
     */
    async function loadPapers(topicName) {
        document.getElementById('paper-list-topic-name').textContent = topicName;
        document.getElementById('search-keyword').value = topicName;

        const response = await fetch(`/papers/${topicName}`);
        const papers = await response.json();
        paperListTableBody.innerHTML = '';
        papers.forEach(paper => {
            const tr = document.createElement('tr');
            tr.dataset.paper = JSON.stringify(paper);
            tr.innerHTML = `
                <td class="paper-title">${paper.title}</td>
                <td>${paper.authors}</td>
                <td>
                    <button class="move-paper card-button">Move</button>
                    <button class="delete-paper card-button">Delete</button>
                </td>
                <td>${paper.year}</td>
                <td><a href="${paper.url}" target="_blank" class="card-button">Link</a></td>
            `;
            paperListTableBody.appendChild(tr);
        });
    }

    /**
     * Handles the submission of the paper search form.
     * Fetches search results from the server and displays them.
     * @param {SubmitEvent} e - The form submission event.
     */
    async function handleSearchPaperFormSubmit(e) {
        e.preventDefault();
        const keyword = document.getElementById('search-keyword').value || currentTopic;
        const year = document.getElementById('search-year').value;
        const count = document.getElementById('search-count').value;
        const loadingMessage = document.getElementById('search-loading-message');

        searchResultsTableBody.innerHTML = '';
        loadingMessage.innerText = 'Searching for papers... Please wait.';
        loadingMessage.style.display = 'block';

        try {
            const response = await fetch(`/search?keyword=${keyword}&year=${year}&count=${count}`);
            const papers = await response.json();

            papers.forEach(paper => {
                const tr = document.createElement('tr');
                tr.dataset.paper = JSON.stringify(paper);
                tr.innerHTML = `
                    <td class="paper-title">${paper.title}</td>
                    <td>${paper.authors}</td>
                    <td>${paper.year}</td>
                    <td><a href="${paper.url}" target="_blank" class="card-button">Link</a></td>
                `;
                searchResultsTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Search failed:', error);
            searchResultsTableBody.innerHTML = '<tr><td colspan="4">Failed to load search results.</td></tr>';
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    /**
     * Populates the year filter dropdown with recent year ranges.
     */
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

    /**
     * Handles click events on the main paper list table.
     * Manages showing paper details, moving papers, and deleting papers.
     * @param {MouseEvent} e - The click event.
     */
    async function handlePaperListTableClick(e) {
        const tr = e.target.closest('tr');
        if (!tr || !tr.dataset.paper) return;

        const paperData = JSON.parse(tr.dataset.paper);
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
    }

    /**
     * Handles click events on the search results table.
     * Shows the paper detail view for the clicked paper.
     * @param {MouseEvent} e - The click event.
     */
    function handleSearchResultsTableClick(e) {
        if (e.target.classList.contains('paper-title')) {
            const paperData = JSON.parse(e.target.closest('tr').dataset.paper);
            showPaperDetail(paperData, true);
        }
    }

    /**
     * Displays the detailed view for a selected paper.
     * @param {object} paper - The paper data object.
     * @param {boolean} [fromSearch=false] - Indicates if the paper was selected from search results.
     */
    async function showPaperDetail(paper, fromSearch = false) {
        paperDetailView.dataset.paper = JSON.stringify(paper);
        showView(paperDetailView);

        document.getElementById('paper-detail-info-table-title').innerText = paper.title;
        document.getElementById('paper-detail-info-table-authors').innerText = paper.authors;
        document.getElementById('paper-detail-info-table-year').innerText = paper.year;
        document.getElementById('paper-detail-info-table-url').innerHTML = `<a href="${paper.url}" target="_blank" class="card-button">Link</a>`;
        document.getElementById('paper-detail-info-table-abstract').innerText = paper.abstract.replaceAll('\n', ' ');

        const pdfUrl = paper.url.replace('/abs/', '/pdf/');
        document.getElementById('pdf-view-frame').src = pdfUrl;

        const summaryContent = document.getElementById('summary-content');

        summarizeButton.style.display = 'none';
        summaryContent.innerHTML = 'Loading summary...';
        const paperId = btoa(paper.url);
        try {
            const response = await fetch(`/paper-summary/${currentTopic}/${paperId}`);
            if (response.ok) {
                const data = await response.json();
                summaryContent.innerHTML = markdown2html(data.summary);
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

    /**
     * Encodes a string to a Base64 string, compatible with URL-safe encoding.
     * @param {string} str - The string to encode.
     * @returns {string} The Base64 encoded string.
     */
    function base64Encode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        ));
    }

    /**
     * Decodes a Base64 string that was encoded with `base64Encode`.
     * @param {string} str - The Base64 string to decode.
     * @returns {string} The decoded string.
     */
    function base64Decode(str) {
        return decodeURIComponent(
            Array.prototype.map.call(atob(str), c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
    }

    /**
     * Converts a Markdown string to HTML, handling MathJax expressions.
     * It protects MathJax delimiters ($...$ and $$...$$) during Markdown parsing.
     * @param {string} text - The Markdown text to convert.
     * @returns {string} The resulting HTML string.
     */
    function markdown2html(text) {
        const encoded = text
            .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `$$${base64Encode(inner)}$$`)
            .replace(/\$([^\n\r$]+?)\$/g, (_, inner) => `$${base64Encode(inner)}$`);

        const parsed = marked.parse(encoded);

        return parsed
            .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `$$${base64Decode(inner)}$$`)
            .replace(/\$([^\n\r$]+?)\$/g, (_, inner) => `$${base64Decode(inner)}$`)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }

    /**
     * Handles the click event for the "Summarize" button.
     * Sends the paper data to the server for summarization and streams the result.
     */
    async function handleSummarizeButtonClick() {
        const paper = JSON.parse(paperDetailView.dataset.paper);
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = 'Summarizing...';
        summarizeButton.style.display = 'none';

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
                        summaryContent.innerHTML = markdown2html(summary);
                        MathJax.typeset();
                    } catch (e) {
                        // Ignore empty data chunks
                    }
                }
            }
        }
    }

    /**
     * Handles the pointer move event on the splitter.
     * Resizes the summary and PDF view panels.
     * @param {PointerEvent} e - The pointer event.
     */
    function onPointerMove(e) {
        requestAnimationFrame(() => {
            const container = document.getElementById('splitter-container');
            const containerRect = container.getBoundingClientRect();
            const newSummaryWidth = e.clientX - containerRect.left;
            const newPdfWidth = containerRect.right - e.clientX;

            if (newSummaryWidth > 50 && newPdfWidth > 50) {
                summaryView.style.flexBasis = `${newSummaryWidth}px`;
            }
        });
    };

    /**
     * Handles the pointer up event on the splitter.
     * Stops the resizing operation.
     * @param {PointerEvent} e - The pointer event.
     */
    function onPointerUp(e) {
        splitter.releasePointerCapture(e.pointerId);
        splitter.removeEventListener('pointermove', onPointerMove);
        splitter.removeEventListener('pointerup', onPointerUp);
    };

    /**
     * Handles the pointer down event on the splitter.
     * Starts the resizing operation.
     * @param {PointerEvent} e - The pointer event.
     */
    function handleSplitterPointerDown(e) {
        e.preventDefault();
        splitter.setPointerCapture(e.pointerId);
        splitter.addEventListener('pointermove', onPointerMove);
        splitter.addEventListener('pointerup', onPointerUp);
    };

    // --- Event Listener Assignments ---
    toggleMenuButton.addEventListener('click', handleToggleMenuClick);
    topicListMenu.addEventListener('click', handleTopicListMenuClick);
    paperListMenu.addEventListener('click', handlePaperListMenuClick);
    paperDetailMenu.addEventListener('click', handlePaperDetailMenuClick);
    addTopicForm.addEventListener('submit', handleAddTopicFormSubmit);
    topicListCards.addEventListener('click', handleTopicListCardsClick);
    searchPaperForm.addEventListener('submit', handleSearchPaperFormSubmit);
    paperListTableBody.addEventListener('click', handlePaperListTableClick);
    searchResultsTableBody.addEventListener('click', handleSearchResultsTableClick);
    summarizeButton.addEventListener('click', handleSummarizeButtonClick);
    splitter.addEventListener('pointerdown', handleSplitterPointerDown);

    // --- Initial Application Setup ---
    loadTopics();
    populateYearFilter();
    showView(topicListView);
}