# Finanzas04

Finanzas04 is a personal finance management application built with React, TypeScript, and Vite. The application allows users to track their income and expenses, manage transactions, and view financial data through an intuitive dashboard.

## Features

- User authentication with Firebase
- Registration and login functionality
- Dashboard for viewing financial data
- Transaction management for income and expenses
- Responsive design for mobile and desktop devices

## Project Structure

```
finanzas04
├── src
│   ├── components
│   │   ├── auth          # Components related to user authentication
│   │   ├── dashboard     # Components for the dashboard
│   │   ├── transactions   # Components for managing transactions
│   │   └── common        # Common components used throughout the application
│   ├── contexts
│   │   └── AuthContext.tsx # Authentication context for managing user state
│   ├── pages
│   │   ├── Landing.tsx   # Landing page of the application
│   │   ├── Login.tsx     # Login page for user authentication
│   │   ├── Register.tsx   # Registration page for new users
│   │   ├── ResetPassword.tsx # Password reset functionality
│   │   └── Dashboard.tsx  # Main dashboard for financial data
│   ├── services
│   │   ├── auth.ts       # Authentication related functions
│   │   ├── users.ts      # User data management functions
│   │   └── transactions.ts # Transaction management functions
│   ├── types
│   │   └── index.ts      # TypeScript types and interfaces
│   ├── utils
│   │   └── dates.ts      # Utility functions for date handling
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point of the application
│   └── index.css         # Global styles
├── public                 # Static assets
├── package.json           # npm configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── eslint.config.js       # ESLint configuration
```

## Getting Started

To get started with the project, follow these steps:

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd finanzas04
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.