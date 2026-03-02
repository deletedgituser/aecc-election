# AECC Election - Real-Time Voting Display System

A modern, fast, and real-time election voting display system for Aneco Employees' Credit Cooperative using Next.js, MySQL, and Prisma.

## Features

- **Public Landing Page**: Beautiful, responsive display of candidate results sorted by vote count
- **Real-Time Updates**: Server-Sent Events (SSE) for instant updates without page refresh
- **Admin Control Panel**: Manage candidates and votes with password protection
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Database Persistence**: MySQL database with Prisma ORM
- **High Performance**: Fast initial load and smooth real-time updates

## Quick Start

### Prerequisites

- Node.js 16+ installed
- MySQL 5.7+ running locally or accessible

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up MySQL database:**

   Create a new database:
   ```sql
   CREATE DATABASE aecc_election CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Configure environment variables:**

   Edit `.env.local` and update the database URL:
   ```
   DATABASE_URL="mysql://root:password@localhost:3306/aecc_election"
   ```
   
   Replace `root` and `password` with your MySQL credentials.

4. **Run Prisma migrations:**
   ```bash
   npx prisma migrate deploy
   ```
   Or for a fresh setup: `npm run db:setup`

5. **Regenerate Prisma client** (if you get "Failed to create candidate" or "Unknown argument category"):
   ```bash
   npx prisma generate
   ```
   Stop the dev server first, then run this, then restart.

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Access the application:**
   - **Landing Page**: http://localhost:3000 (public view)
   - **Admin Panel**: http://localhost:3000/admin (password: `@n3c0`)

## Usage

### Landing Page (Public View)

- Displays all candidates sorted by vote count (highest first)
- Shows real-time vote counts and vote percentage
- Auto-updates every second via Server-Sent Events
- Responsive design adapts to all screen sizes
- Live connection indicator

### Admin Panel

1. Navigate to `/admin`
2. Enter password: `@n3c0`
3. **Add Candidates**: Enter candidate name and click "Add"
4. **Update Votes**: Use + and − buttons to adjust vote counts
5. **Search**: Filter candidates by name in real-time
6. **Delete**: Remove candidates from the system
7. Updates instantly reflect on the landing page

## Project Structure

```
aecc-election/
├── app/
│   ├── page.tsx                 # Landing page (public view)
│   ├── admin/
│   │   └── page.tsx             # Admin control panel
│   ├── api/
│   │   ├── candidates/
│   │   │   ├── route.ts         # GET/POST candidates
│   │   │   └── [id]/route.ts    # PATCH/DELETE specific candidate
│   │   └── stream/
│   │       └── route.ts         # Server-Sent Events for real-time updates
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── lib/
│   ├── prisma.ts                # Prisma client configuration
│   └── types.ts                 # TypeScript type definitions
├── prisma/
│   └── schema.prisma            # Database schema
├── .env.local                   # Environment variables
└── package.json                 # Dependencies and scripts
```

## Database Schema

```sql
CREATE TABLE candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  voteCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### GET /api/candidates
Returns all candidates sorted by vote count (descending).

### POST /api/candidates
Add a new candidate. Requires JSON body:
```json
{
  "name": "Candidate Name"
}
```

### PATCH /api/candidates/:id
Update a candidate's vote count. Requires JSON body:
```json
{
  "voteCount": 42
}
```

### DELETE /api/candidates/:id
Delete a candidate.

### GET /api/stream
Server-Sent Events stream for real-time updates. Client receives updates every second.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:migrate` - Run Prisma migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Technology Stack

- **Framework**: Next.js 16
- **UI Library**: React 19
- **Database**: MySQL
- **ORM**: Prisma 5
- **Styling**: Tailwind CSS
- **Real-Time**: Server-Sent Events (SSE)
- **Language**: TypeScript

## Admin Password

- Default password: `@n3c0`
- Change this in `/app/admin/page.tsx` (ADMIN_PASSWORD constant)

## Performance Optimizations

- Efficient database queries with Prisma
- Real-time updates via SSE (low overhead)
- Responsive design with Tailwind CSS
- Optimized component rendering with React hooks
- Server-stream data updates minimize latency

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check `.env.local` DATABASE_URL is correct
- Ensure database exists: `SHOW DATABASES;`

### Migrations Failed
```bash
# Reset migrations (WARNING: deletes data)
npx prisma migrate reset

# Or manually run:
npx prisma migrate dev
```

### Real-Time Updates Not Working
- Check browser console for errors
- Verify `/api/stream` endpoint is accessible
- Refresh page to reconnect

## Future Enhancements

- WebSocket support for multi-client synchronization
- Vote history and audit logs
- Export results as CSV/PDF
- Multiple election support
- User authentication improvements
- Animation and transition improvements

## License

This project is proprietary and designed for Aneco Employees' Credit Cooperative.

## Support

For issues or questions, refer to the troubleshooting section or check the browser console for error messages.
