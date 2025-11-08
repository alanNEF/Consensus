# Consensus

The website that will help you become a better citizen.

Track U.S. bills, understand them with AI-powered summaries, endorse what matters to you, and contact your representatives—all in one place.

## Features

- 📜 **Bill Feed**: Browse current U.S. congressional bills
- 🤖 **AI Summaries**: Get human-friendly explanations of complex bills
- 👍 **Endorsements**: Endorse bills you support
- 📋 **Saved Bills**: Track bills you're interested in
- 🔐 **Authentication**: Secure user accounts with NextAuth

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Auth**: NextAuth.js
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI & Anthropic (stubbed)
- **External API**: Congress.gov (stubbed)
- **Python**: Vector indexing and recommendations (pgvector)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- PostgreSQL database (Supabase recommended)
- Python 3.9+ (for Python package)
- OpenAI API key (optional, for AI summaries)
- Congress.gov API key (optional, for real bill data)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd Consensus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your values:
   - `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)
   - `NEXTAUTH_SECRET`: Generate a secret: `openssl rand -base64 32`
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `DATABASE_URL`: PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key (optional)
   - `ANTHROPIC_API_KEY`: Your Anthropic API key (optional)
   - `CONGRESS_GOV_API_KEY`: Your Congress.gov API key (optional)

4. **Set up the database**:
   ```bash
   # Apply schema
   npm run db:apply
   
   # Seed sample data (optional)
   npm run db:seed
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
.
├── app/                      # Next.js App Router
│   ├── (marketing)/         # Public pages
│   ├── (auth)/              # Authentication pages
│   ├── (app)/               # Protected app pages
│   └── api/                 # API routes
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── nav/                 # Navigation components
│   └── bills/               # Bill-related components
├── lib/                     # Utility libraries
│   ├── auth.ts              # NextAuth configuration
│   ├── supabase.ts          # Supabase client
│   ├── ai/                  # AI providers (OpenAI, Anthropic)
│   └── congress/            # Congress.gov client
├── db/                      # Database files
│   ├── schema.sql           # Database schema
│   └── seed.sql             # Sample data
├── python/                  # Python package
│   ├── src/                 # Python source code
│   │   ├── ingest.py        # Bill ingestion
│   │   └── recommend.py     # Vector recommendations
│   └── README.md            # Python package docs
├── scripts/                 # Utility scripts
└── types/                   # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server (with env check)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run db:apply` - Apply database schema
- `npm run db:seed` - Seed sample data

## Python Package

See [python/README.md](./python/README.md) for details on the Python package for vector indexing and recommendations.

### Quick Start (Python)

```bash
cd python

# Using Poetry
poetry install
poetry run python src/ingest.py
poetry run python src/recommend.py --query "climate change"

# Using pip/venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/ingest.py
python src/recommend.py --query "climate change"
```

## Database Schema

The database includes the following tables:

- `users` - User accounts and profiles
- `bills` - Congressional bills
- `bill_summaries` - AI-generated bill summaries
- `bill_embeddings` - Vector embeddings for similarity search (pgvector)
- `endorsements` - User bill endorsements
- `saved_bills` - User saved bills

See [db/schema.sql](./db/schema.sql) for the complete schema.

## API Routes

### Bills

- `GET /api/bills` - Get paginated list of bills
- `GET /api/bills/[billId]` - Get a specific bill
- `POST /api/bills/[billId]/summary` - Generate AI summary for a bill

### Endorsements

- `GET /api/endorsements` - Get user's endorsements
- `POST /api/endorsements` - Create an endorsement
- `DELETE /api/endorsements` - Delete an endorsement

### Auth

- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

## Authentication

The app uses NextAuth.js with email (magic link) authentication. 

**Note**: Email functionality requires SMTP configuration. For development, you can use a service like [Mailtrap](https://mailtrap.io/) or [Resend](https://resend.com/).

To configure email:

1. Add SMTP environment variables to `.env`:
   ```
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASSWORD=your-password
   SMTP_FROM=noreply@example.com
   ```

2. Alternatively, use a Supabase adapter for authentication (see `lib/auth.ts` for TODO comments).

## Development

### Environment Variable Check

The dev server automatically runs `scripts/load-env-check.ts` to verify environment variables and show which features are available.

### Mock Mode

The app gracefully handles missing API keys and database connections by:
- Returning mock data when database is not configured
- Showing placeholder AI summaries when API keys are missing
- Using mock Congress.gov data when API key is not set

This allows development without full configuration, but you'll want to configure all services for production.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Docker (see Dockerfile example in TODO)

## TODO

- [ ] Implement actual Congress.gov API integration
- [ ] Complete Supabase adapter for NextAuth
- [ ] Add email templates for magic links
- [ ] Implement vector similarity search in Python package
- [ ] Add user preference-based recommendations
- [ ] Add "contact representative" functionality
- [ ] Add bill tracking and notifications
- [ ] Add comprehensive error handling
- [ ] Add tests (unit, integration, e2e)
- [ ] Add Docker support
- [ ] Add CI/CD pipeline

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your license here]

## Support

For support, please open an issue on GitHub.
