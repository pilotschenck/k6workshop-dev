#!/usr/bin/env node

/**
 * k6 Workshop Test Runner
 *
 * Validates all lab solution scripts against local Docker infrastructure.
 * Run with: node test-runner.js [options]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  skipDocker: args.includes('--skip-docker-check'),
  filter: args.find(arg => arg.startsWith('--filter='))?.split('=')[1],
  list: args.includes('--list'),
  help: args.includes('--help') || args.includes('-h'),
};

// Load test configuration
const configPath = path.join(__dirname, 'test-config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`${colors.red}Error loading test-config.json:${colors.reset}`, error.message);
  process.exit(1);
}

// Filter tests based on command line options
let tests = config.tests.filter(test => test.enabled);
if (options.filter) {
  const filterRegex = new RegExp(options.filter, 'i');
  tests = tests.filter(test =>
    test.id.match(filterRegex) || test.name.match(filterRegex)
  );
}

// Show help
if (options.help) {
  console.log(`
${colors.bright}k6 Workshop Test Runner${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node test-runner.js [options]

${colors.cyan}Options:${colors.reset}
  --help, -h              Show this help message
  --list                  List all available tests
  --verbose, -v           Show detailed k6 output for each test
  --skip-docker-check     Skip Docker Compose health checks
  --filter=<pattern>      Run only tests matching pattern (regex)

${colors.cyan}Examples:${colors.reset}
  node test-runner.js                    # Run all enabled tests
  node test-runner.js --verbose          # Run with verbose output
  node test-runner.js --filter=lab-0[1-5] # Run only labs 01-05
  node test-runner.js --filter=browser   # Run only browser tests
  node test-runner.js --list             # List all tests
`);
  process.exit(0);
}

// List tests
if (options.list) {
  console.log(`\n${colors.bright}Available Tests:${colors.reset}\n`);
  config.tests.forEach(test => {
    const status = test.enabled
      ? `${colors.green}enabled${colors.reset}`
      : `${colors.gray}disabled${colors.reset} (${test.skipReason || 'no reason given'})`;
    console.log(`  ${colors.cyan}${test.id}${colors.reset}: ${test.name} [${status}]`);
    if (test.services && test.services.length > 0) {
      console.log(`    ${colors.gray}Services: ${test.services.join(', ')}${colors.reset}`);
    }
    if (test.requiresGrafanaCloud) {
      console.log(`    ${colors.yellow}Requires: Grafana Cloud${colors.reset}`);
    }
  });
  console.log();
  process.exit(0);
}

// Helper: Check if Docker Compose services are running
function checkDockerServices(requiredServices) {
  if (options.skipDocker || requiredServices.length === 0) {
    return true;
  }

  try {
    const output = execSync('docker compose -f infra/docker-compose.yml ps --format json', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const services = output.trim().split('\n')
      .filter(line => line)
      .map(line => JSON.parse(line));

    const runningServices = services
      .filter(svc => svc.State === 'running')
      .map(svc => svc.Service);

    const missingServices = requiredServices.filter(
      svc => !runningServices.includes(svc)
    );

    if (missingServices.length > 0) {
      console.error(`${colors.red}Missing services:${colors.reset} ${missingServices.join(', ')}`);
      console.error(`${colors.yellow}Start services with:${colors.reset} docker compose -f infra/docker-compose.yml up -d`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`${colors.red}Error checking Docker services:${colors.reset}`, error.message);
    console.error(`${colors.yellow}Make sure Docker Compose is running.${colors.reset}`);
    return false;
  }
}

// Helper: Wait for service health
function waitForHealthCheck(service, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const output = execSync(
        `docker compose -f infra/docker-compose.yml ps ${service} --format json`,
        { cwd: __dirname, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const serviceInfo = JSON.parse(output.trim());
      if (serviceInfo.Health === 'healthy' || serviceInfo.Health === '') {
        return true;
      }
    } catch (error) {
      // Service not found or other error
    }
    // Wait 1 second before checking again
    execSync('sleep 1', { stdio: 'ignore' });
  }
  return false;
}

// Helper: Run setup commands
function runSetup(setupCommands) {
  if (!setupCommands || setupCommands.length === 0) return true;

  for (const cmd of setupCommands) {
    try {
      execSync(cmd, { cwd: __dirname, stdio: options.verbose ? 'inherit' : 'ignore' });
    } catch (error) {
      console.error(`${colors.red}Setup command failed:${colors.reset} ${cmd}`);
      return false;
    }
  }
  return true;
}

// Helper: Run a single test
function runTest(test) {
  const scriptPath = path.join(__dirname, test.script);

  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      error: 'Script file not found',
      duration: 0,
    };
  }

  // Build k6 command
  const k6Args = test.k6Args || [];
  const cmdArgs = ['run', ...k6Args, test.script];

  // Build environment
  const env = {
    ...process.env,
    ...test.env,
  };

  const startTime = Date.now();

  try {
    const result = execSync(`k6 ${cmdArgs.join(' ')}`, {
      cwd: __dirname,
      encoding: 'utf8',
      env: env,
      stdio: options.verbose ? 'inherit' : 'pipe',
      timeout: test.timeout * 1000,
    });

    return {
      success: true,
      duration: Date.now() - startTime,
      output: options.verbose ? '' : result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      output: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
    };
  }
}

// Main test execution
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}k6 Workshop Test Runner${colors.reset}\n`);
  console.log(`Running ${colors.bright}${tests.length}${colors.reset} test(s)...\n`);

  // Check Docker services
  if (!options.skipDocker) {
    console.log(`${colors.gray}Checking Docker Compose services...${colors.reset}`);
    const allServices = new Set();
    tests.forEach(test => {
      if (test.services) {
        test.services.forEach(svc => allServices.add(svc));
      }
    });

    if (allServices.size > 0 && !checkDockerServices(Array.from(allServices))) {
      console.error(`\n${colors.red}Docker services check failed. Exiting.${colors.reset}\n`);
      process.exit(1);
    }
    console.log(`${colors.green}✓${colors.reset} Docker services ready\n`);
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const testLabel = `${colors.cyan}${test.id}${colors.reset}: ${test.name}`;
    process.stdout.write(`${testLabel} ... `);

    // Run setup commands
    if (test.setup && !runSetup(test.setup)) {
      console.log(`${colors.red}FAILED${colors.reset} (setup)`);
      failed++;
      results.push({ test, success: false, error: 'Setup failed' });
      continue;
    }

    // Check required services
    if (test.services && test.services.length > 0 && !options.skipDocker) {
      const servicesOk = checkDockerServices(test.services);
      if (!servicesOk) {
        console.log(`${colors.red}FAILED${colors.reset} (services)`);
        failed++;
        results.push({ test, success: false, error: 'Required services not available' });
        continue;
      }
    }

    // Run the test
    const result = runTest(test);
    results.push({ test, ...result });

    if (result.success) {
      const duration = (result.duration / 1000).toFixed(1);
      console.log(`${colors.green}PASSED${colors.reset} ${colors.gray}(${duration}s)${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}FAILED${colors.reset}`);
      if (options.verbose) {
        console.log(`${colors.gray}Error: ${result.error}${colors.reset}`);
        if (result.stderr) {
          console.log(`${colors.gray}${result.stderr}${colors.reset}`);
        }
      }
      failed++;
    }
  }

  // Summary
  console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`  ${colors.red}Failed:${colors.reset} ${failed}`);
  console.log(`  ${colors.cyan}Total:${colors.reset}  ${tests.length}\n`);

  // Show failures
  if (failed > 0 && !options.verbose) {
    console.log(`${colors.bright}Failed Tests:${colors.reset}`);
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`\n  ${colors.red}✗${colors.reset} ${r.test.id}: ${r.test.name}`);
        console.log(`    ${colors.gray}${r.error}${colors.reset}`);
        if (r.stderr) {
          const lines = r.stderr.split('\n').slice(0, 5);
          lines.forEach(line => console.log(`    ${colors.gray}${line}${colors.reset}`));
          if (r.stderr.split('\n').length > 5) {
            console.log(`    ${colors.gray}...${colors.reset}`);
          }
        }
      });
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run the test suite
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
