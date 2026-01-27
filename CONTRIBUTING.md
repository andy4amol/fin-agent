# Contributing to Fin-Agent

Thank you for your interest in contributing to Fin-Agent!

## Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd fin-agent

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests
python3 tests/test_l2_l4_consistency.py
```

## Code Style

- Follow PEP 8 guidelines
- Use meaningful variable and function names
- Add docstrings to all functions and classes
- Keep functions focused and small

## Commit Message Format

We use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

Examples:
```
feat(l1): add L2 consistency verification
fix(l2): correct PnL calculation for edge cases
docs: update README with new features
test: add test for risk model
```

## Testing

Before submitting a PR:
1. Ensure all tests pass
2. Add tests for new features
3. Update documentation if needed

```bash
# Run all tests
python3 tests/test_l2_l4_consistency.py
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

## Architecture Guidelines

### Adding New Layers

When adding new layers:
1. Follow the existing folder structure
2. Implement proper interfaces
3. Add tests for new components
4. Update documentation

### L2→L4 Consistency

When modifying L2 or L4:
- Ensure L2 calculations remain accurate
- Update Prompt constraints if needed
- Verify consistency checks still pass
- Run the full test suite

## Issue Reporting

When reporting issues:
1. Use the issue template
2. Provide clear reproduction steps
3. Include relevant logs
4. Specify your environment

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Happy contributing! 🚀
