# README

This is a Node.js-based project that uses MongoDB as the backend database. The project follows an MVC architecture with folders for routes, models, controllers, and repositories.

### What is this repository for?

- Quick summary
- Version

### Installation & Setup

Prerequisites

Ensure you have the following installed:

- Node.js (v18+ recommended)
- MongoDB (local or cloud instance)
- npm or yar

### Configure Environment

Create a .env file in the root directory.

### Contribution guidelines

Author: Mindfire Solutions

### Project Structure

- controllers/ # Business logic and request handling
- models/ # Database models (MongoDB schemas)
- repositories/ # Data access layer for MongoDB
- routes/ # Express routes for API endpoints
- config/ # Configuration files (DB connection, environment variables)
- middleware/ # Custom middleware (auth, logging, etc.)
- utils/ # Utility functions
- server.js # Entry point of the application
- package.json # Project metadata and dependencies
- .env.example # Environment variable example file
- README.md # Project documentation

### Running the Project

To start the development server: npm run dev

### Coding Standards

    folder Naming Convention			: flatcase
    file Naming Convention			    : camelCasing
    Function Naming Convention			: camelCasing
    Variable Naming Convention          : camelCasing

Below coding practices are followed throughout the application:
###############################################################

1.  Use Constants in place of messages.

2.  For api-documentation, follow /api-docs

# Prettier Configuration for Code Formatting

This guide explains how to set up **Prettier** using a configuration file instead of relying on IDE extensions. This ensures consistent formatting across all environments, projects, and team members.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Creating Prettier Configuration File](#creating-prettier-configuration-file)
4. [Common Configuration Options](#common-configuration-options)
5. [Using Prettier](#using-prettier)
6. [Adding Prettier Scripts to Package.json](#adding-prettier-scripts-to-packagejson)

---

## Prerequisites

- Node.js installed (v14+ recommended)
- npm or yarn

---

## Installation

Install Prettier as a development dependency:

```bash
# Using npm
npm install --save-dev prettier
```

## Creating Prettier Configuration File

Instead of relying on IDE formatting, create a configuration file in the project root:

.prettierrc (JSON format)

{
"semi": true,
"singleQuote": true,
"trailingComma": "es5",
"tabWidth": 2,
"printWidth": 80,
"endOfLine": "lf"
}

## Using Prettier

Format all files

```bash
npx prettier --write .
npx prettier --check .
```

## Adding Prettier Scripts to package.json

"scripts": {
"format": "prettier --write .",
"format:check": "prettier --check ."
}

Now you can run:

```bash
npm run format
npm run format:check
```
