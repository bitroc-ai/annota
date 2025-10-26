# Contributing to Annota

Thank you for your interest in contributing to Annota! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/annota.git
   cd annota
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/bitroc-ai/annota.git
   ```

## Development Setup

### Prerequisites

- Node.js 18+ or 20+
- pnpm 8+ (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run tests
pnpm test

# Start documentation site (in docs directory)
cd docs
pnpm dev
```

### Development Commands

```bash
# Type checking
pnpm typecheck

# Run tests in watch mode
pnpm test:watch

# Build library
pnpm build

# Run documentation site
cd docs && pnpm dev
```

## Project Structure

```
annota/
├── src/                    # Source code
│   ├── core/              # Core annotation engine
│   ├── adapters/          # Viewer integrations (OpenSeadragon)
│   ├── rendering/         # Rendering engines (PixiJS)
│   ├── tools/             # Interactive drawing tools
│   ├── loaders/           # File format loaders
│   └── react/             # React components and hooks
├── tests/                 # Test files
├── docs/                  # Documentation site (Nextra)
├── examples/              # Example applications
└── dist/                  # Built output (generated)
```

### Key Directories

- **`src/core/`**: Core annotation logic, data structures, and type definitions
- **`src/adapters/openseadragon/`**: OpenSeadragon integration and annotator instance
- **`src/rendering/pixi/`**: PixiJS rendering with viewport culling and LOD
- **`src/tools/`**: Interactive annotation tools (point, rectangle, polygon, contour, push)
- **`src/loaders/`**: Data loaders for H5, JSON, PGM formats
- **`src/react/`**: React components, hooks, and context providers

## Development Workflow

### Creating a Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description
```

### Making Changes

1. **Write your code** following the [code style guidelines](#code-style)
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** to ensure nothing is broken:
   ```bash
   pnpm typecheck
   pnpm test
   ```

### Testing Your Changes

```bash
# Run type checking
pnpm typecheck

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Test in the documentation playground
cd docs
pnpm dev
# Navigate to http://localhost:3000/playground
```

## Testing

### Writing Tests

- Place test files next to the source files with `.test.ts` or `.test.tsx` extension
- Use Vitest for testing (Jest-compatible API)
- Aim for high test coverage, especially for core functionality

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { YourComponent } from './your-component';

describe('YourComponent', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = YourComponent.process(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Test Coverage

- Aim for at least 80% code coverage for new features
- Core functionality should have higher coverage (90%+)
- Run coverage reports with `pnpm test:coverage`

## Code Style

### TypeScript Guidelines

- **Use TypeScript** for all source files
- **Strict typing**: No `any` types (use `unknown` if necessary)
- **Explicit types**: Add return types to all public functions
- **Interfaces over types**: Prefer `interface` for object shapes

Example:

```typescript
// Good
interface AnnotationOptions {
  color: string;
  opacity: number;
}

function createAnnotation(options: AnnotationOptions): Annotation {
  // Implementation
}

// Avoid
function createAnnotation(options: any) {
  // Implementation
}
```

### React Guidelines

- **Functional components** with hooks
- **Custom hooks** for reusable logic
- **PropTypes via TypeScript**: Use interface definitions for component props
- **Avoid inline functions** in JSX when possible (use `useCallback`)

Example:

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Code Formatting

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Add **semicolons** at the end of statements
- Max line length: **100 characters**
- Use **Prettier** for automatic formatting (config included)

### Naming Conventions

- **PascalCase**: Components, classes, interfaces, types
- **camelCase**: Functions, variables, methods
- **UPPER_SNAKE_CASE**: Constants
- **kebab-case**: File names for components (`my-component.tsx`)

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring (no feature or bug fix)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build config)

### Examples

```bash
# Feature
git commit -m "feat(tools): add ellipse annotation tool"

# Bug fix
git commit -m "fix(rendering): resolve z-index ordering issue for overlapping annotations"

# Documentation
git commit -m "docs: update installation guide with troubleshooting section"

# Performance
git commit -m "perf(rendering): optimize viewport culling for large datasets"
```

### Commit Message Guidelines

- Use the **imperative mood** ("add feature" not "added feature")
- Keep the subject line **under 72 characters**
- Capitalize the subject line
- Do not end the subject line with a period
- Separate subject from body with a blank line
- Use the body to explain **what** and **why**, not how

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main:
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks**:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm build
   ```

3. **Update documentation** if needed

### Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin your-branch
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title following commit conventions
   - Description of changes
   - Related issue numbers (if applicable)
   - Screenshots/videos for UI changes
   - Test results

### Pull Request Template

```markdown
## Description
Brief description of what this PR does.

## Related Issues
Fixes #123

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Manually tested in playground

## Screenshots (if applicable)
Add screenshots or videos here

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my own code
- [ ] Commented complex code sections
- [ ] Updated documentation
- [ ] No new warnings introduced
- [ ] Added tests that prove my fix/feature works
```

### Review Process

- At least one maintainer review is required
- Address all review comments
- Keep PRs focused and reasonably sized
- Be responsive to feedback

## Documentation

### Updating Documentation

Documentation is located in the `docs/` directory and built with [Nextra](https://nextra.site).

```bash
cd docs
pnpm dev  # Start dev server at http://localhost:3000
```

### Documentation Guidelines

- Use **MDX format** for all documentation pages
- Include **code examples** for all features
- Add **type definitions** for API documentation
- Use **Nextra components** (Cards, Callout, Steps) for better UX
- Keep examples **practical** and **copy-paste ready**

### Documentation Structure

```
docs/content/
├── index.mdx                    # Landing page
├── docs/
│   ├── getting-started/         # Installation, quick start, concepts
│   ├── guides/                  # Tools, events, loaders, styling
│   └── examples/                # Practical examples
└── api/                         # API reference
    ├── components.mdx
    ├── annotator.mdx
    └── types.mdx
```

## Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with the latest version**
3. **Isolate the problem** (minimal reproduction case)

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Annota version: x.x.x
- Browser: Chrome 120
- OS: macOS 14.0
- Node: 20.x
- React: 18.x

## Minimal Reproduction
Link to CodeSandbox or repository with minimal reproduction

## Screenshots/Videos
Add if applicable
```

## Feature Requests

We welcome feature requests! Please provide:

1. **Use case**: What problem does this solve?
2. **Proposed solution**: How would you like it to work?
3. **Alternatives considered**: What other solutions did you consider?
4. **Additional context**: Any other relevant information

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any other relevant information
```

## Getting Help

- **Documentation**: https://annota.bitroc.ai
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and community support

## License

By contributing to Annota, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Annota!
