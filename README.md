# DataScrapeAI

This project is an AI-powered data scraping platform.

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone [your-repository-url]
    cd DataScrapeAI
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory of the project. This file will store your sensitive information, such as database URLs and API keys. An example `.env` file might look like this:

    ```
    DATABASE_URL="your_mongodb_connection_string"
    PORT=5002
    OPENAI_API_KEY="your_openai_api_key"
    ```
    **Important:** The `.env` file is included in `.gitignore` to prevent your credentials from being committed to version control.

4.  **Run the application:**
    ```bash
    npm run dev
    ```

## Project Structure

-   `client/`: Frontend application (React, Vite)
-   `server/`: Backend application (Express, WebSocket, OpenAI integration)
-   `shared/`: Shared types and schemas

## API Endpoints

(To be filled with detailed API documentation)

## How to Handle Environment Variables in Production

When deploying to a production environment, you should not rely on a `.env` file directly. Instead, configure your hosting provider (e.g., Vercel, Netlify, AWS, Heroku) to set these environment variables securely. This ensures that your sensitive information is not exposed in your codebase.

For example, in most cloud platforms, you can add environment variables through their dashboard or CLI tools.
