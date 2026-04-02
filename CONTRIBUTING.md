# Contributing to LLM Gateway

Thank you for your interest in contributing to LLM Gateway! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/llm-gateway.git
   cd llm-gateway
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 20 or later
- npm or yarn
- Redis (optional, for caching and rate limiting)
- SQLite (included with the project)

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

### Running in Development

```bash
# Start gateway with hot reload
npm run dev

# Start admin UI with hot reload
npm run dev:admin

# Start both concurrently
npm run dev:all
```

## Making Changes

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```
feat(provider): add support for Groq API
fix(cache): resolve tenant isolation issue in semantic cache
docs(readme): update Docker deployment instructions
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in the `tests/` directory
- Mirror the source structure: `tests/unit/path/to/module.test.ts`
- Use descriptive test names
- Test edge cases and error conditions

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { MyService } from '@/services/my-service';

describe('MyService', () => {
  it('should handle valid input', () => {
    const service = new MyService();
    const result = service.process('input');
    expect(result).toBeDefined();
  });

  it('should throw on invalid input', () => {
    const service = new MyService();
    expect(() => service.process(null)).toThrow();
  });
});
```

## Submitting Changes

### Pull Request Process

1. Ensure all tests pass:

   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

2. Update documentation if needed

3. Push your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request on GitHub

5. Fill in the PR template completely

6. Wait for review and address feedback

### PR Checklist

- [ ] Tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] CHANGELOG updated (if applicable)
- [ ] PR description is clear and complete

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Avoid `any` types when possible
- Use interfaces for object shapes
- Document public APIs with JSDoc comments

### Code Style

- Use Prettier for formatting
- Use ESLint for linting
- Follow existing code patterns

### Formatting

```bash
# Format code
npm run format

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

### File Organization

```
src/
├── core/           # Core business logic
├── providers/      # LLM provider adapters
├── routes/         # API route handlers
├── services/       # Service layer
├── middleware/     # Express/Fastify middleware
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)

## Questions?

Open an issue for:

- Bug reports
- Feature requests
- Questions about the codebase

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
