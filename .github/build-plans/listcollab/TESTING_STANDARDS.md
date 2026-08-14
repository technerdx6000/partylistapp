# TESTING STANDARDS

> This file is a standing instruction for the coding agent. It applies to every phase unless a phase file explicitly overrides a specific rule. When writing or modifying tests, follow every section below.

---

## 1. The Core Obligation

Write the tests you would be embarrassed not to have if this code went to production and broke.

Coverage metrics are a floor, not a goal. The goal is confidence that the code does what it claims under real conditions, including the conditions the code wasn't written for.

---

## 2. Coverage Requirements

- Achieve **≥90% branch coverage** on all new code
- After writing tests, **run coverage** and add tests for any uncovered branch before marking a task complete
- Do not pad coverage with assertions that only test framework or mock behaviour (e.g. asserting that a mock returns what you configured it to return)
- Every `if`, `else`, `switch` case, `catch`, and early `return` must have at least one test that executes it

---

## 3. What to Test — Required Cases

For **every function or module**, tests must cover:

### Happy Path
- Expected inputs producing expected outputs
- The primary use case as documented or implied

### Boundary Values
- At the limit, just below, and just above (e.g. `0`, `1`, `max - 1`, `max`)
- Empty strings, empty arrays, empty objects
- Single-element collections where arrays are expected
- Very large inputs where performance or overflow is relevant

### Null / Undefined / Missing
- `null`, `undefined`, and missing optional arguments
- Partially populated objects where full population is expected
- Fields present but with falsy values (`0`, `""`, `false`)

### Invalid Inputs
- Wrong types where the runtime won't catch them automatically
- Out-of-range values
- Malformed data (bad dates, invalid enums, corrupt strings)

### Error & Exception Paths
- Assert the **correct error type** is thrown, not just that *an* error is thrown
- Assert error messages where they are part of the public contract
- Assert that errors don't silently swallow state or produce partial side effects
- For async code: assert rejected promises are handled and do not produce unhandled rejections

### Concurrent / Async
- Functions called in rapid succession where ordering matters
- Race conditions where relevant (flag these with a `// race-condition-test` comment)
- Timeout and retry behaviour

---

## 4. Test Structure

### Naming
Test names must describe the **scenario and expected outcome**, not the implementation:

```
✅ "returns empty array when input is null"
✅ "throws RangeError when index exceeds collection length"
✅ "sends notification email only when status transitions to APPROVED"

❌ "test null"
❌ "error case"
❌ "works correctly"
```

### Arrangement
Use **Arrange / Act / Assert** structure. For non-trivial tests, add inline comments marking each section:

```ts
// Arrange
const input = buildValidPayload({ status: 'PENDING' });
const service = new DocumentService(mockRepo);

// Act
const result = await service.approve(input.id);

// Assert
expect(result.status).toBe('APPROVED');
expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
```

### Granularity
- **One concept per test** — don't stack unrelated assertions in a single test case
- If a test requires more than ~15 lines of setup, consider whether the code under test has too many responsibilities
- Group tests by the **unit under test**, not by test type

---

## 5. Mocking & Isolation

- **Mock all external dependencies by default**: databases, APIs, file system, queues, email, clocks
- Tests must not require network access, disk I/O, or a running database
- Assert that mocks were called with the **correct arguments**, not just that they were called
- For side-effect-producing functions: assert the side effect **does** occur under valid conditions AND **does not** occur when it shouldn't
- Do not mock the unit under test — only its dependencies

---

## 6. Determinism

Tests must be fully deterministic. Violations are not acceptable:

- ❌ `Math.random()` inside test logic
- ❌ `Date.now()` or `new Date()` without injection or mocking
- ❌ Tests that depend on execution order
- ❌ Shared mutable state between test cases

**Each test must set up and tear down its own state.** Use `beforeEach`/`afterEach` for shared setup, never `beforeAll` for state that gets mutated.

Mock or inject time wherever real time is used:
```ts
jest.useFakeTimers();
jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
```

---

## 7. Integration Tests

When writing integration tests (multiple real units working together):

- Clearly mark them as integration tests (e.g., file suffix `.integration.test.ts` or a `@integration` tag)
- They may use real implementations of internal modules but must still mock external I/O
- Each integration test must justify its existence — if a unit test would catch the same failure, write the unit test instead
- Integration tests must not share state across test files

---

## 8. Regression Tests

If a bug is fixed during a task:

- Write a test that **would have caught the bug before the fix**
- Name it with a `regression:` prefix: `"regression: does not duplicate entries when called twice in the same tick"`
- Add a comment referencing the issue or PR if one exists

---

## 9. Running Tests

After writing or modifying tests, the agent must:

1. **Run the full test suite** — not just the tests for the changed file
2. **Run coverage** and verify ≥90% branch coverage on changed files
3. If any test fails: fix the implementation **or** fix the test with a written justification — do not suppress or skip
4. **Never leave a `.only`, `.skip`, or `xit` in the final committed code**
5. If the test suite exceeds **30 seconds**, flag it and propose optimisations before completing the task

---

## 10. Test Anti-Patterns — Never Do These

| Anti-Pattern | Why It's Rejected |
|---|---|
| Testing that a mock returns what you told it to return | Tautological — proves nothing |
| `expect(true).toBe(true)` style placeholder tests | Worthless coverage padding |
| Tests with no assertions | Will always pass regardless of breakage |
| Asserting only that no error was thrown | Doesn't verify correct behaviour |
| Using production data or real credentials in tests | Security and reproducibility risk |
| Hardcoding timestamps or IDs that will expire | Causes future false failures |
| Testing private/internal methods directly | Couples tests to implementation, not contract |
| Skipping teardown because "it's just tests" | Causes cross-test contamination |

---

## 11. What "Done" Means for Any Testing Task

A testing task is not complete until:

- [ ] All required cases from Section 3 are covered for the unit under test
- [ ] Test suite passes with zero failures
- [ ] Branch coverage ≥90% on changed files (verified by running coverage report)
- [ ] No `.only`, `.skip`, or `xit` in committed code
- [ ] Any bug fixed during the task has a regression test
- [ ] Test names clearly describe the scenario without reading the test body
