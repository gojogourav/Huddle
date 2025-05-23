## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm, yarn, or pnpm (pnpm recommended for monorepos)
*   PostgreSQL Database running locally or accessible URL
*   Redis instance running locally or accessible URL (e.g., from Upstash)
*   Resend API Key (Sign up at [https://resend.com/](https://resend.com/))
*   Git

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/gojogourav/huddle-mono.git # Replace with your repo URL
    cd huddle-mono
    ```

2.  **Install dependencies (from the root):**
    ```bash
    pnpm install # Or npm install / yarn install
    ```

3.  **Environment Variables:**
    *   Create a `.env` file in the **root** directory (or separate `.env` files within `apps/backend` and `apps/frontend` if preferred).
    *   Add the following variables (replace placeholders with your actual values):

        ```dotenv
        # Backend (.env or apps/backend/.env)
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
        UPSTASH_REDIS_URL="rediss://default:PASSWORD@HOST:PORT" # Or your local Redis URL: redis://localhost:6379
        JWT_SECRET="YOUR_VERY_STRONG_JWT_SECRET_HERE"
        RESEND_API_KEY="re_YOUR_RESEND_API_KEY"
        SENDER_EMAIL="Your Name <you@yourverifieddomain.com>" # Verified sender with Resend
        PORT=5000 # Backend port
        FRONTEND_URL="http://localhost:3000" # Frontend origin for CORS
        NODE_ENV=development

        # Frontend (.env.local or apps/frontend/.env.local)
        NEXT_PUBLIC_BACKEND_URL="http://localhost:5000" # Make sure this matches backend PORT
        # NEXT_PUBLIC_... other public frontend variables
        ```

4.  **Database Setup:**
    *   Navigate to the backend directory: `cd apps/backend`
    *   Apply database migrations:
        ```bash
        npx prisma migrate dev --name init # Or your migration name
        ```
    *   Generate Prisma Client:
        ```bash
        npx prisma generate
        ```
    *   (Optional) Seed the database:
        ```bash
        # npx prisma db seed # If you have a seed script configured
        ```
    *   Navigate back to the root: `cd ../..`

5.  **Build Shared Packages (If any):**
    ```bash
    # pnpm run build --filter @huddle/common-types # Example if using shared packages
    ```

### Running the Application

You need to run the Backend Server, Frontend Server, and the BullMQ Worker(s) concurrently.

1.  **Run the Backend Worker(s) (from root):**
    *   Open a terminal tab/window.
    *   Build the backend (if needed, depends on your setup): `pnpm --filter backend build`
    *   Start the worker (adjust path based on your compiled output):
        ```bash
        node apps/backend/dist/workers/emailWorker.js # Adjust path as needed
        # If you have a notification worker, start it too
        # node apps/backend/dist/workers/notificationWorker.js
        ```
    *   *Alternatively, use ts-node for development:*
        ```bash
        # Requires ts-node and tsconfig-paths installed in backend workspace
        # pnpm --filter backend exec -- ts-node -r tsconfig-paths/register src/workers/emailWorker.ts
        ```

2.  **Run the Backend API Server (from root):**
    *   Open another terminal tab/window.
    *   Start the backend dev server:
        ```bash
        pnpm --filter backend run dev # Assuming 'dev' script uses ts-node-dev
        ```
    *   *Or run the compiled version:*
        ```bash
        # pnpm --filter backend build
        # pnpm --filter backend start
        ```

3.  **Run the Frontend Development Server (from root):**
    *   Open a third terminal tab/window.
    *   Start the frontend dev server:
        ```bash
        pnpm --filter frontend run dev
        ```

4.  **Access the Application:** Open your browser and navigate to `http://localhost:3000` (or your frontend port).

## API Endpoints

(List major API endpoints here, e.g.)

*   `POST /api/auth/register` - Register user
*   `POST /api/auth/login` - Initiate login, send OTP
*   `POST /api/auth/verify/:id` - Verify OTP, set cookies
*   `POST /api/auth/logout` - Logout user
*   `GET /api/users/profile` - Get current user's profile
*   `GET /api/posts/feed` - Get user's feed
*   `POST /api/posts` - Create post
*   ... etc.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/YourFeature`).
6.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file (if you have one) for details.

## Acknowledgements

*   Prisma Team
*   Next.js Team
*   BullMQ Maintainers
*   (Any other libraries or resources you want to thank)

---
_Created by gojogourav_
