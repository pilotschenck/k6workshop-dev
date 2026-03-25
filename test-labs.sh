#!/bin/bash

#
# k6 Workshop Lab Test Harness
#
# This script runs all lab solution tests against the local Docker infrastructure.
#
# Usage:
#   ./test-labs.sh [options]
#
# Options:
#   --help, -h           Show help message
#   --start-infra        Start Docker Compose infrastructure before tests
#   --stop-infra         Stop Docker Compose infrastructure after tests
#   --cleanup            Stop infrastructure and clean up containers/volumes
#   --verbose, -v        Show detailed k6 output
#   --filter=<pattern>   Run only tests matching pattern
#   --list               List all available tests
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/infra"
COMPOSE_FILE="$INFRA_DIR/docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

# Default options
START_INFRA=0
STOP_INFRA=0
CLEANUP=0
RUNNER_ARGS=()

# Parse arguments
for arg in "$@"; do
  case $arg in
    --start-infra)
      START_INFRA=1
      ;;
    --stop-infra)
      STOP_INFRA=1
      ;;
    --cleanup)
      CLEANUP=1
      STOP_INFRA=1
      ;;
    --help|-h|--list|--verbose|-v|--filter=*|--skip-docker-check)
      RUNNER_ARGS+=("$arg")
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${RESET}"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

# Check prerequisites
check_prerequisites() {
  local missing=0

  # Check for docker
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed${RESET}"
    missing=1
  fi

  # Check for docker compose
  if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: docker compose is not installed${RESET}"
    missing=1
  fi

  # Check for k6
  if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${RESET}"
    echo -e "${YELLOW}Install k6 from: https://k6.io/docs/get-started/installation/${RESET}"
    missing=1
  fi

  # Check for node
  if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node is not installed${RESET}"
    missing=1
  fi

  if [ $missing -eq 1 ]; then
    exit 1
  fi
}

# Start infrastructure
start_infrastructure() {
  echo -e "${CYAN}Starting Docker Compose infrastructure...${RESET}"

  if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: docker-compose.yml not found at $COMPOSE_FILE${RESET}"
    exit 1
  fi

  cd "$INFRA_DIR"
  docker compose up -d

  echo -e "${YELLOW}Waiting for services to be healthy...${RESET}"
  sleep 5

  # Check service health
  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    # Check if all services are running (simple check without jq)
    local all_running=$(docker compose ps --format "{{.Service}}\t{{.State}}" 2>/dev/null | grep -v "running" || true)

    if [ -z "$all_running" ]; then
      echo -e "${GREEN}✓ All services are running${RESET}"
      cd "$SCRIPT_DIR"
      return 0
    fi

    attempt=$((attempt + 1))
    echo -e "${GRAY}Waiting... ($attempt/$max_attempts)${RESET}"
    sleep 2
  done

  echo -e "${YELLOW}Warning: Some services may not be fully healthy yet${RESET}"
  docker compose ps
  cd "$SCRIPT_DIR"
}

# Stop infrastructure
stop_infrastructure() {
  echo -e "${CYAN}Stopping Docker Compose infrastructure...${RESET}"

  cd "$INFRA_DIR"

  if [ $CLEANUP -eq 1 ]; then
    echo -e "${YELLOW}Cleaning up containers and volumes...${RESET}"
    docker compose down -v
  else
    docker compose down
  fi

  cd "$SCRIPT_DIR"
  echo -e "${GREEN}✓ Infrastructure stopped${RESET}"
}

# Show infrastructure status
show_status() {
  echo -e "\n${BOLD}${CYAN}Infrastructure Status:${RESET}\n"

  cd "$INFRA_DIR"

  if docker compose ps --format json &> /dev/null; then
    docker compose ps
  else
    echo -e "${GRAY}No services running${RESET}"
  fi

  cd "$SCRIPT_DIR"
  echo ""
}

# Main execution
main() {
  # Check prerequisites first
  check_prerequisites

  # Start infrastructure if requested
  if [ $START_INFRA -eq 1 ]; then
    start_infrastructure
  fi

  # Show current status if not in list mode
  if [[ ! " ${RUNNER_ARGS[@]} " =~ " --list " ]] && [[ ! " ${RUNNER_ARGS[@]} " =~ " --help " ]]; then
    show_status
  fi

  # Run the test runner
  echo -e "${BOLD}${CYAN}Running k6 Lab Tests${RESET}\n"
  node "$SCRIPT_DIR/test-runner.js" "${RUNNER_ARGS[@]}"
  TEST_EXIT_CODE=$?

  # Stop infrastructure if requested
  if [ $STOP_INFRA -eq 1 ]; then
    stop_infrastructure
  fi

  exit $TEST_EXIT_CODE
}

# Trap to ensure cleanup on exit if STOP_INFRA is set
trap_handler() {
  if [ $STOP_INFRA -eq 1 ]; then
    echo -e "\n${YELLOW}Interrupted. Stopping infrastructure...${RESET}"
    stop_infrastructure
  fi
  exit 1
}

trap trap_handler INT TERM

# Run main
main
