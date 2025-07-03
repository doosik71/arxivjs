# arxivjs

arxivjs is a Node.js-based web application that interacts with the arXiv API. It allows users to manage paper topics, search for papers related to those topics on arxiv.org, automatically summarize them using Gemini, and save the information for easy retrieval.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/arxivjs.git
cd arxivjs
```

### 2. Install dependencies

Make sure you have Node.js and npm installed. Then, run the following command in the project root directory:

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add your Gemini API key:

```ini
GEMINI_API_KEY=YOUR_API_KEY
```

### 4. Write user prompt

Write a user prompt to `data/userprompt.txt` file.
Following shows an example.

```text
Please summarize the following paper.

The summary **must be written in Korean** and **must follow Markdown syntax** using a clear hierarchical structure with headings, bullet points, and formatting where appropriate.

Please follow these formatting rules:

- At the very top, display:
  - The **paper title** on the first line as a `#` heading.
  - The **author list** on the second line as plain text (comma-separated), below the title.

- Then use the following summary structure:
  - `## Problem to Solve`
    - Clearly describe the main research problem or question the paper aims to address.
  - `## Key Contributions`
    - List the core findings and novel contributions as bullet points.
  - `## Methodology`
    - Describe the approach or algorithm used, preferably with steps or bullet points.
  - `## Results (if available)`
    - Summarize quantitative or qualitative results briefly.
- Use **bold** for emphasis and `inline code` for method names or technical terms.
- If there are equations or mathematical expressions, use `$...$` or `$$...$$` for LaTeX-style math (MathJax compatible).
- Ensure the content is **concise, accurate, and easy to understand** for a technical but general audience.

Here is the paper content:

{context}
```

## Usage

To start the application, run the following command from the project root directory:

```bash
node index.js
```

This will start the server.

Once the server is running, open your web browser and navigate to `http://localhost:3000` (or the port specified in your configuration).

## Screenshot

![Topic list](./public/topic_list.png)

![Paper List](./public/paper_list.png)

![Paper Detail](./public/paper_detail.png)
