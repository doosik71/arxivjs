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
    const pdfSummaryMenu = getElement('pdf-summary-menu');
    const optionMenu = getElement('option-menu');
    const topicListView = getElement('topic-list-view');
    const paperListView = getElement('paper-list-view');
    const paperDetailView = getElement('paper-detail-view');
    const pdfSummaryView = getElement('pdf-summary-view');
    const optionView = getElement('option-view');
    const addTopicForm = getElement('add-topic-form');
    const topicListCards = getElement('topic-list-cards');
    const searchTopicsInput = getElement('search-topics-input');
    const clearSearchTopicsButton = getElement('clear-search-topics');
    const searchPaperForm = getElement('search-paper-form');
    const addPaperByUrlForm = getElement('add-paper-by-url-form');
    const searchPapersInput = getElement('search-papers-input');
    const clearSearchPapersButton = getElement('clear-search-papers');
    const paperListTableBody = querySelector('#paper-list-table tbody');
    const searchResultsTableBody = querySelector('#search-results-table tbody');
    const summarizeButton = getElement('summarize-button');
    const splitter = getElement('splitter');
    const summaryView = getElement('summary-view');
    const abstractCell = getElement('paper-detail-info-table-abstract');
    const themeSelect = getElement('theme-select');
    const themeLink = getElement('theme-loader');
    const pdfFileInput = getElement('pdf-file-input');
    const pdfUrlInput = getElement('pdf-url-input');
    const pdfSummarizeButton = getElement('pdf-summarize-button');
    const pdfSummaryContent = getElement('pdf-summary-content');
    const pdfMethodUrl = getElement('pdf-method-url');
    const pdfMethodFile = getElement('pdf-method-file');
    const pdfUrlSection = getElement('pdf-url-section');
    const pdfFileSection = getElement('pdf-file-section');
    const pdfSaveSection = getElement('pdf-save-section');
    const pdfPaperTitle = getElement('pdf-paper-title');
    const pdfPaperAuthors = getElement('pdf-paper-authors');
    const pdfPaperYear = getElement('pdf-paper-year');
    const pdfSaveButton = getElement('pdf-save-button');
    const pdfCancelSaveButton = getElement('pdf-cancel-save-button');

    // Validate that all critical elements were found before proceeding.
    const criticalElements = [
        sidebar, mainContent, toggleMenuButton, toggleMenuIcon, menuContainer,
        topicListMenu, paperListMenu, paperDetailMenu, pdfSummaryMenu, optionMenu, topicListView, paperListView,
        paperDetailView, pdfSummaryView, optionView, addTopicForm, topicListCards, searchTopicsInput, clearSearchTopicsButton,
        searchPaperForm, addPaperByUrlForm, searchPapersInput, clearSearchPapersButton, paperListTableBody,
        searchResultsTableBody, summarizeButton, splitter, summaryView, abstractCell, themeSelect, themeLink, pdfFileInput, pdfUrlInput, pdfSummarizeButton, pdfSummaryContent, pdfMethodUrl, pdfMethodFile, pdfUrlSection, pdfFileSection, pdfSaveSection, pdfPaperTitle, pdfPaperAuthors, pdfPaperYear, pdfSaveButton, pdfCancelSaveButton
    ];

    if (criticalElements.some(el => !el)) {
        console.error("Stopping script execution due to missing critical elements.");
        return;
    }

    // State Variables
    let currentTopic = null;
    let currentPaper = null;
    let currentPdfSummary = null;
    let currentPdfUrl = null;

    // --- Function Definitions ---

    /**
     * Updates the enabled/disabled state of the sidebar menu items.
     */
    function updateMenuState() {
        if (currentTopic) {
            paperListMenu.classList.remove('disabled');
            pdfSummaryMenu.classList.remove('disabled');
        } else {
            paperListMenu.classList.add('disabled');
            pdfSummaryMenu.classList.add('disabled');
        }

        if (currentPaper) {
            paperDetailMenu.classList.remove('disabled');
        } else {
            paperDetailMenu.classList.add('disabled');
        }
    }

    /**
     * Shows a specific view (topic list, paper list, or paper detail) and hides the others.
     * @param {HTMLElement} view - The view element to display.
     */
    function showView(view) {
        topicListView.style.display = 'none';
        paperListView.style.display = 'none';
        paperDetailView.style.display = 'none';
        pdfSummaryView.style.display = 'none';
        optionView.style.display = 'none';
        view.style.display = 'block';
        updateMenuState();
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

        // Toggle menu text visibility based on sidebar state
        const menuSpans = menuContainer.querySelectorAll('span');
        menuSpans.forEach(span => {
            if (isHidden) {
                // Show text when expanding (was hidden, now showing)
                span.style.display = 'inline';
            } else {
                // Hide text when collapsing (was showing, now hiding)
                span.style.display = 'none';
            }
        });
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
        if (paperListMenu.classList.contains('disabled'))
            return;

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
        if (paperDetailMenu.classList.contains('disabled'))
            return;

        if (currentPaper) {
            showView(paperDetailView);
        }
        else {
            alert('Please select a paper first.');
        }
    }

    /**
     * Handles the click event on the "PDF Summary" menu item.
     * Shows the PDF summary view if a topic has been selected.
     */
    function handlePdfSummaryMenuClick() {
        if (pdfSummaryMenu.classList.contains('disabled'))
            return;

        if (currentTopic) {
            showView(pdfSummaryView);
        }
        else {
            alert('Please select a topic first.');
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
            loadPapers(currentTopic, true);
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
     * Filters the displayed topic cards based on the search input.
     */
    function handleSearchTopicsInput() {
        const searchTerm = searchTopicsInput.value.toLowerCase();
        const cards = topicListCards.querySelectorAll('.topic-card');
        cards.forEach(card => {
            const topicName = card.querySelector('.topic-name').textContent.toLowerCase();
            if (topicName.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Clears the topic search input and shows all topics.
     */
    function handleClearSearchTopicsClick() {
        searchTopicsInput.value = '';
        handleSearchTopicsInput();
    }

    /**
     * Fetches and displays the list of papers for a given topic.
     * @param {string} topicName - The name of the topic to load papers for.
     */
    async function loadPapers(topicName, updateKeyword = false) {
        document.getElementById('paper-list-topic-name').textContent = topicName;

        if (updateKeyword) {
            document.getElementById('search-keyword').value = topicName;
        }

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
        let keyword = document.getElementById('search-keyword').value || currentTopic;
        const year = document.getElementById('search-year').value;
        const count = document.getElementById('search-count').value;
        const sort = document.getElementById('search-sort').value;
        const loadingMessage = document.getElementById('search-loading-message');

        searchResultsTableBody.innerHTML = '';
        loadingMessage.innerHTML = '<div class="user-message">Searching...<div class="spinner"></div></div>';
        loadingMessage.style.display = 'block';

        try {
            keyword = keyword.replace(/[<>#%{}|\^~\[\]`'"`;\/?@&=+$,!\s]/g, " ").replace(/\s+/g, " ").trim().replace(/\s/g, "+")
            const response = await fetch(`/search?keyword=${keyword}&year=${year}&count=${count}&sort=${sort}`);
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
     * Handles the submission of the "add paper by URL" form.
     * Fetches paper data from the server, saves it, and displays the details.
     * @param {SubmitEvent} e - The form submission event.
     */
    async function handleAddPaperByUrlFormSubmit(e) {
        e.preventDefault();
        const paperUrlInput = document.getElementById('paper-url');
        const paperUrl = paperUrlInput.value;
        if (!paperUrl) {
            alert('Please enter a paper URL.');
            return;
        }
        if (!currentTopic) {
            alert('Please select a topic first.');
            return;
        }

        try {
            const response = await fetch('/paper-by-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paperUrl, topicName: currentTopic })
            });

            if (response.ok) {
                const paper = await response.json();
                showPaperDetail(paper);
                paperUrlInput.value = '';
                loadPapers(currentTopic);
            } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error('Failed to add paper by URL:', error);
            alert('Failed to add paper. Please check the URL and try again.');
        }
    }

    /**
     * Filters the displayed paper results based on the search input.
     */
    function handleSearchPapersInput() {
        const searchTerm = searchPapersInput.value.toLowerCase();
        const rows = searchResultsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const title = row.querySelector('.paper-title').textContent.toLowerCase();
            if (title.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * Clears the paper search filter and shows all results.
     */
    function handleClearSearchPapersClick() {
        searchPapersInput.value = '';
        handleSearchPapersInput();
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
            showPaperDetail(paperData);
        }
    }

    /**
     * Displays the detailed view for a selected paper.
     * @param {object} paper - The paper data object.
     */
    async function showPaperDetail(paper) {
        currentPaper = JSON.stringify(paper);
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
        const paper = JSON.parse(currentPaper);
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = '<div class="user-message">Summarizing...<div class="spinner"></div></div>';
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
        summaryContent.innerHTML = ''; // Clear the "Summarizing..." message

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

    /**
     * Handles the option menu click event.
     * Shows the option view.
     * @param {Event} e - The click event.
     */
    function handleOptionMenuClick(e) {
        e.preventDefault();
        showView(optionView);
    }

    /**
     * Handles the theme selection change event.
     * Changes the theme by updating the href of the theme stylesheet.
     * @param {Event} e - The change event.
     */
    function handleThemeChange(e) {
        const selectedTheme = e.target.value;
        if (themeLink) {
            themeLink.href = `theme/theme-${selectedTheme}.css`;
        }
        // Save theme preference to localStorage
        localStorage.setItem('arxivjs-theme', selectedTheme);
    }

    /**
     * Loads the saved theme from localStorage or sets default theme.
     */
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem('arxivjs-theme') || 'classic';
        themeSelect.value = savedTheme;
        if (themeLink) {
            themeLink.href = `theme/theme-${savedTheme}.css`;
        }
    }

    /**
     * Fetches and displays the server information.
     */
    async function loadServerInfo() {
        try {
            const response = await fetch('/server-info');
            const info = await response.json();
            getElement('server-hostname').textContent = info.hostname;
            getElement('server-port').textContent = info.port;
            getElement('server-datapath').textContent = info.dataPath;
        } catch (error) {
            console.error('Failed to load server info:', error);
        }
    }

    /**
     * Extracts text from PDF using PDF.js
     */
    async function extractTextFromPdf(source) {
        try {
            // Check if PDF.js is loaded
            if (typeof window.pdfjsLib === 'undefined') {
                throw new Error('PDF.js library is not loaded');
            }

            // Set PDF.js worker if not already set
            if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            let arrayBuffer;
            if (typeof source === 'string') {
                // URL source - use server proxy to avoid CORS
                const response = await fetch('/fetch-pdf-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: source })
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch PDF from URL');
                }
                arrayBuffer = await response.arrayBuffer();
            } else {
                // File source
                arrayBuffer = await source.arrayBuffer();
            }

            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            
            // Extract text from all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            return fullText;
            
        } catch (error) {
            console.error('PDF text extraction failed:', error);
            throw error;
        }
    }

    /**
     * Handles PDF file upload and text extraction using client-side PDF.js.
     */
    async function handlePdfFileUpload() {
        const file = pdfFileInput.files[0];
        if (!file) {
            return;
        }

        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }

        try {
            const extractedText = await extractTextFromPdf(file);
            // Store extracted text for summarization
            window.pdfExtractedText = extractedText;
        } catch (error) {
            console.error('PDF file upload text extraction failed:', error);
            alert('Failed to extract text from PDF file');
        }
    }

    /**
     * Handles the PDF summarize button click.
     * Extracts text from PDF (URL or file) and requests summarization.
     */
    async function handlePdfSummarizeButtonClick() {
        if (!currentTopic) {
            alert('Please select a topic first.');
            return;
        }

        const selectedMethod = document.querySelector('input[name="pdf-method"]:checked').value;
        const pdfUrl = pdfUrlInput.value.trim();
        const pdfFile = pdfFileInput.files[0];
        
        if (selectedMethod === 'url' && !pdfUrl) {
            alert('Please enter a PDF URL.');
            return;
        }
        
        if (selectedMethod === 'file' && !pdfFile) {
            alert('Please upload a PDF file.');
            return;
        }

        pdfSummaryContent.innerHTML = '<div class="user-message">Extracting text from PDF...<div class="spinner"></div></div>';

        try {
            let extractedText;
            
            if (selectedMethod === 'url') {
                // Extract text from URL
                extractedText = await extractTextFromPdf(pdfUrl);
            } else {
                // Use already extracted text or extract from file
                if (window.pdfExtractedText) {
                    extractedText = window.pdfExtractedText;
                } else {
                    extractedText = await extractTextFromPdf(pdfFile);
                }
            }

            if (!extractedText) {
                throw new Error('No text extracted from PDF');
            }

            // Send text to server for summarization
            pdfSummaryContent.innerHTML = '<div class="user-message">Summarizing...<div class="spinner"></div></div>';

            const response = await fetch('/summarize-pdf-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: extractedText, topicName: currentTopic })
            });

            if (!response.ok || !response.body) {
                const text = await response.text();
                console.error('Failed to fetch summary:', text);
                pdfSummaryContent.innerHTML = 'Error: Invalid response!';
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let summary = '';
            pdfSummaryContent.innerHTML = ''; // Clear the "Summarizing..." message

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            summary += JSON.parse(line.substring(6));
                            pdfSummaryContent.innerHTML = markdown2html(summary);
                            MathJax.typeset();
                        } catch (e) {
                            // Ignore empty data chunks
                        }
                    }
                }
            }

            // Show save section after successful summarization (only for URL input)
            if (selectedMethod === 'url') {
                currentPdfSummary = summary;
                currentPdfUrl = pdfUrl;
                pdfSaveSection.style.display = 'block';
            }

        } catch (error) {
            console.error('PDF summarization failed:', error);
            pdfSummaryContent.innerHTML = '<div class="user-message">Failed to summarize PDF</div>';
        }
    }

    /**
     * Handles PDF method selection (URL or File)
     */
    function handlePdfMethodChange() {
        if (pdfMethodUrl.checked) {
            pdfUrlSection.style.display = 'flex';
            pdfFileSection.style.display = 'none';
        } else {
            pdfUrlSection.style.display = 'none';
            pdfFileSection.style.display = 'flex';
        }
        // Hide save section when method changes
        pdfSaveSection.style.display = 'none';
    }

    /**
     * Handles saving PDF paper information to the current topic
     */
    async function handlePdfSaveButtonClick() {
        const title = pdfPaperTitle.value.trim();
        const authors = pdfPaperAuthors.value.trim();
        const year = parseInt(pdfPaperYear.value);

        if (!title) {
            alert('Please enter the paper title.');
            return;
        }

        if (!authors) {
            alert('Please enter the paper authors.');
            return;
        }

        if (!year || year < 1900 || year > 2099) {
            alert('Please enter a valid year.');
            return;
        }

        if (!currentTopic) {
            alert('Please select a topic first.');
            return;
        }

        if (!currentPdfSummary || !currentPdfUrl) {
            alert('No PDF summary available to save.');
            return;
        }

        try {
            const paperData = {
                title: title,
                authors: authors,
                year: year,
                url: currentPdfUrl,
                abstract: '' // Placeholder abstract
            };

            const response = await fetch('/save-pdf-paper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paper: paperData,
                    summary: currentPdfSummary,
                    topicName: currentTopic
                })
            });

            if (response.ok) {
                alert('Paper saved successfully!');
                // Clear form and hide save section
                pdfPaperTitle.value = '';
                pdfPaperAuthors.value = '';
                pdfPaperYear.value = '';
                pdfSaveSection.style.display = 'none';
                
                // Clear summary content
                pdfSummaryContent.innerHTML = '';
                
                // Clear URL input
                pdfUrlInput.value = '';
                
                // Reset state
                currentPdfSummary = null;
                currentPdfUrl = null;
            } else {
                const error = await response.json();
                alert(`Error saving paper: ${error.message}`);
            }
        } catch (error) {
            console.error('Failed to save PDF paper:', error);
            alert('Failed to save paper. Please try again.');
        }
    }

    /**
     * Handles canceling the PDF save operation
     */
    function handlePdfCancelSaveButtonClick() {
        // Clear form and hide save section
        pdfPaperTitle.value = '';
        pdfPaperAuthors.value = '';
        pdfPaperYear.value = '';
        pdfSaveSection.style.display = 'none';
        
        // Reset state
        currentPdfSummary = null;
        currentPdfUrl = null;
    }

    // --- Event Listener Assignments ---
    toggleMenuButton.addEventListener('click', handleToggleMenuClick);
    topicListMenu.addEventListener('click', handleTopicListMenuClick);
    paperListMenu.addEventListener('click', handlePaperListMenuClick);
    paperDetailMenu.addEventListener('click', handlePaperDetailMenuClick);
    pdfSummaryMenu.addEventListener('click', handlePdfSummaryMenuClick);
    optionMenu.addEventListener('click', handleOptionMenuClick);
    addTopicForm.addEventListener('submit', handleAddTopicFormSubmit);
    topicListCards.addEventListener('click', handleTopicListCardsClick);
    searchTopicsInput.addEventListener('input', handleSearchTopicsInput);
    clearSearchTopicsButton.addEventListener('click', handleClearSearchTopicsClick);
    searchPaperForm.addEventListener('submit', handleSearchPaperFormSubmit);
    addPaperByUrlForm.addEventListener('submit', handleAddPaperByUrlFormSubmit);
    searchPapersInput.addEventListener('input', handleSearchPapersInput);
    clearSearchPapersButton.addEventListener('click', handleClearSearchPapersClick);
    paperListTableBody.addEventListener('click', handlePaperListTableClick);
    searchResultsTableBody.addEventListener('click', handleSearchResultsTableClick);
    summarizeButton.addEventListener('click', handleSummarizeButtonClick);
    splitter.addEventListener('pointerdown', handleSplitterPointerDown);
    themeSelect.addEventListener('change', handleThemeChange);
    pdfFileInput.addEventListener('change', handlePdfFileUpload);
    pdfSummarizeButton.addEventListener('click', handlePdfSummarizeButtonClick);
    pdfMethodUrl.addEventListener('change', handlePdfMethodChange);
    pdfMethodFile.addEventListener('change', handlePdfMethodChange);
    pdfSaveButton.addEventListener('click', handlePdfSaveButtonClick);
    pdfCancelSaveButton.addEventListener('click', handlePdfCancelSaveButtonClick);

    // --- Initial Application Setup ---
    loadSavedTheme();
    loadTopics();
    populateYearFilter();
    loadServerInfo();
    showView(topicListView);
}