# k6 Workshop Lab Testing

This document describes how to use the automated test harness to validate all lab solution scripts.

## Overview

The test harness automatically runs all lab solution scripts against the local Docker infrastructure to verify they work correctly. This is useful for:

- **Validating changes** to the workshop materials
- **Ensuring all labs work** after updating dependencies
- **CI/CD integration** for automated testing
- **Quick verification** before delivering the workshop

## Quick Start

### Prerequisites

Ensure you have the following installed:

- **Docker** and **Docker Compose** (for running the infrastructure)
- **k6** (the load testing tool)
- **Node.js** (for running the test runner script)

### Run All Tests

The simplest way to run all tests:

```bash
# Start infrastructure, run tests, and stop infrastructure
./test-labs.sh --start-infra --stop-infra
```

### Run Tests with Existing Infrastructure

If you already have the Docker infrastructure running:

```bash
# Just run the tests
./test-labs.sh
```

Or directly with Node.js:

```bash
node test-runner.js
```

## Command Line Options

### test-labs.sh Options

```bash
./test-labs.sh [options]
```

| Option | Description |
|--------|-------------|
| `--start-infra` | Start Docker Compose infrastructure before running tests |
| `--stop-infra` | Stop Docker Compose infrastructure after tests complete |
| `--cleanup` | Stop infrastructure and remove containers/volumes |
| `--verbose`, `-v` | Show detailed k6 output for each test |
| `--filter=<pattern>` | Run only tests matching the regex pattern |
| `--list` | List all available tests without running them |
| `--help`, `-h` | Show help message |

### test-runner.js Options

The Node.js test runner supports the same filtering and verbosity options:

```bash
node test-runner.js [options]
```

| Option | Description |
|--------|-------------|
| `--verbose`, `-v` | Show detailed k6 output for each test |
| `--skip-docker-check` | Skip Docker Compose health checks |
| `--filter=<pattern>` | Run only tests matching the regex pattern |
| `--list` | List all available tests |
| `--help`, `-h` | Show help message |

## Usage Examples

### List All Tests

See what tests are available:

```bash
./test-labs.sh --list
```

Output:
```
Available Tests:

  lab-01: Lab 01: First k6 Script [enabled]
    Services: demo-app
  lab-02: Lab 02: Checks and Thresholds [enabled]
    Services: demo-app
  ...
```

### Run Specific Lab Tests

Run only labs 01-05 (fundamentals):

```bash
./test-labs.sh --filter="lab-0[1-5]"
```

Run only browser tests:

```bash
./test-labs.sh --filter="browser"
```

Run a single lab:

```bash
./test-labs.sh --filter="^lab-14$"
```

### Verbose Output

See detailed k6 output for debugging:

```bash
./test-labs.sh --verbose
```

### Development Workflow

When developing or modifying labs:

```bash
# Start infrastructure once
cd infra
docker compose up -d
cd ..

# Run tests as you make changes
./test-labs.sh --filter="lab-06"

# When done, stop infrastructure
cd infra
docker compose down
```

### CI/CD Integration

For automated testing in CI/CD pipelines:

```bash
# Complete test run with infrastructure lifecycle
./test-labs.sh --start-infra --stop-infra --cleanup
```

This will:
1. Start all required Docker services
2. Wait for services to be healthy
3. Run all enabled tests
4. Stop services and clean up containers/volumes
5. Exit with code 0 (success) or 1 (failure)

## Test Configuration

Tests are configured in `test-config.json`. Each test entry includes:

```json
{
  "id": "lab-01",
  "name": "Lab 01: First k6 Script",
  "script": "scripts/solutions/lab-01-solution.js",
  "services": ["demo-app"],
  "env": {
    "BASE_URL": "http://localhost:3000"
  },
  "timeout": 60,
  "enabled": true
}
```

### Configuration Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier for the test |
| `name` | Human-readable test name |
| `script` | Path to the k6 script to run |
| `services` | Array of required Docker services |
| `env` | Environment variables to set |
| `k6Args` | Additional k6 command line arguments |
| `setup` | Shell commands to run before the test |
| `timeout` | Test timeout in seconds |
| `enabled` | Whether to run this test |
| `requiresGrafanaCloud` | Indicates need for Grafana Cloud credentials |
| `skipReason` | Explanation for disabled tests |

## Enabled vs Disabled Tests

### Enabled Tests (Run by Default)

These tests run against the local Docker infrastructure:

- **Lab 01-08**: k6 fundamentals and local observability outputs
- **Lab 14-16**: Browser testing (headless mode)
- **Lab 18-21**: Advanced features (tracing, logging, metrics, extensions)
- **Lab 27**: DataDog migration (using fake-dd-agent)
- **Lab 29**: End-to-end observability

### Disabled Tests (Require Grafana Cloud)

These tests are disabled by default because they require Grafana Cloud credentials:

- **Lab 09**: Grafana Cloud Integration
- **Lab 10-13**: Synthetic Monitoring (requires SM setup)
- **Lab 17**: Browser Synthetics (requires SM)
- **Lab 22-28** (some): SLOs, alerting, private probes (require Grafana Cloud)

### Enabling Cloud Tests

To test labs that require Grafana Cloud:

1. Set up Grafana Cloud credentials:
   ```bash
   export GRAFANA_CLOUD_TOKEN="your-token"
   export GRAFANA_SM_ACCESS_TOKEN="your-sm-token"
   ```

2. Edit `test-config.json` and set `"enabled": true` for the desired tests

3. Run the tests:
   ```bash
   ./test-labs.sh --filter="lab-09"
   ```

## Infrastructure Services

The test harness expects the following Docker services to be available:

| Service | Port | Used By |
|---------|------|---------|
| `demo-app` | 3000 | Most labs |
| `broken-app` | 3001 | Lab 02 (threshold failures) |
| `httpbin` | 8080 | Labs 01, 14 |
| `wiremock` | 8888 | Advanced labs |
| `influxdb` | 8086 | Labs 06, 29 |
| `grafana` | 3030 | Labs 06, 29 |
| `prometheus` | 9090 | Lab 07 |
| `alloy` | 4317, 4318 (OTLP), 12345 (UI) | Lab 18 |
| `tempo` | 3200 | Lab 18 |
| `ws-echo` | 8765 | WebSocket tests |
| `fake-dd-agent` | 8125, 8126 | Lab 27 |

### Starting Infrastructure Manually

```bash
cd infra
docker compose up -d
docker compose ps  # Check status
```

### Stopping Infrastructure

```bash
cd infra
docker compose down      # Stop but keep volumes
docker compose down -v   # Stop and remove volumes
```

## Troubleshooting

### Tests Fail with "Connection Refused"

**Problem**: Docker services aren't running or aren't healthy yet.

**Solution**:
```bash
cd infra
docker compose ps  # Check service status
docker compose logs demo-app  # Check logs for specific service
```

### Browser Tests Fail

**Problem**: k6 browser module may not have Chromium installed.

**Solution**:
```bash
# Browser tests run in headless mode by default
# Ensure K6_BROWSER_HEADLESS=true is set
K6_BROWSER_HEADLESS=true k6 run scripts/solutions/lab-14-solution.js
```

### "Script file not found"

**Problem**: The solution script doesn't exist.

**Solution**: Check that all solution files are present in `scripts/solutions/`. Some labs may not have solution files yet.

### Tests Time Out

**Problem**: Tests are taking longer than expected.

**Solution**: Increase the timeout in `test-config.json` for specific tests:
```json
{
  "timeout": 120  // Increase from 60 to 120 seconds
}
```

### InfluxDB/Grafana Tests Fail

**Problem**: Metrics aren't being written or dashboards aren't accessible.

**Solution**:
```bash
# Check InfluxDB is accepting writes
curl -G http://localhost:8086/query --data-urlencode "q=SHOW DATABASES"

# Check Grafana is accessible
curl http://localhost:3030/api/health
```

## Test Output

### Successful Run

```
k6 Workshop Test Runner

Running 15 test(s)...

Checking Docker Compose services...
✓ Docker services ready

lab-01: Lab 01: First k6 Script ... PASSED (32.1s)
lab-02: Lab 02: Checks and Thresholds ... PASSED (35.4s)
lab-03: Lab 03: VU Stages ... PASSED (55.2s)
...

Test Summary:
  Passed: 15
  Failed: 0
  Total:  15
```

### Failed Run

```
lab-06: Lab 06: InfluxDB Output ... FAILED

Test Summary:
  Passed: 14
  Failed: 1
  Total:  15

Failed Tests:

  ✗ lab-06: Lab 06: InfluxDB Output
    Command failed with exit code 1
    ERRO[0001] connection refused
```

Use `--verbose` to see full k6 output for debugging.

## Adding New Tests

To add a new test:

1. Create the solution script in `scripts/solutions/`
2. Add an entry to `test-config.json`:
   ```json
   {
     "id": "lab-30",
     "name": "Lab 30: My New Lab",
     "script": "scripts/solutions/lab-30-solution.js",
     "services": ["demo-app"],
     "env": {
       "BASE_URL": "http://localhost:3000"
     },
     "timeout": 60,
     "enabled": true
   }
   ```
3. Run the test:
   ```bash
   ./test-labs.sh --filter="lab-30"
   ```

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Test k6 Labs

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Lab Tests
        run: ./test-labs.sh --start-infra --stop-infra --cleanup
```

### GitLab CI

```yaml
test-labs:
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache nodejs npm bash curl
    - curl -L https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz | tar xvz
    - mv k6-v0.49.0-linux-amd64/k6 /usr/local/bin/
  script:
    - ./test-labs.sh --start-infra --stop-infra --cleanup
```

## Contributing

When contributing changes to labs:

1. Update the solution script
2. Run the test harness to verify it still works:
   ```bash
   ./test-labs.sh --filter="lab-XX"
   ```
3. Update `test-config.json` if the lab requirements changed
4. Submit your pull request with test results

## Support

For issues with the test harness:

- Check this documentation
- Review test output with `--verbose` flag
- Check Docker service logs: `docker compose -f infra/docker-compose.yml logs`
- Open an issue in the repository

---

**Happy Testing!** 🧪
