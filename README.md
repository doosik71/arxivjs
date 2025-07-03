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
