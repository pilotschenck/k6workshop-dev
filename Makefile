.PHONY: help test test-all test-verbose test-list start-infra stop-infra clean

help: ## Show this help message
	@echo 'k6 Workshop Lab Test Harness'
	@echo ''
	@echo 'Usage:'
	@echo '  make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

test: ## Run all enabled tests (requires running infrastructure)
	./test-labs.sh

test-all: ## Start infra, run all tests, stop infra
	./test-labs.sh --start-infra --stop-infra

test-verbose: ## Run tests with verbose k6 output
	./test-labs.sh --verbose

test-list: ## List all available tests
	./test-labs.sh --list

test-filter: ## Run specific tests (usage: make test-filter FILTER=lab-01)
	./test-labs.sh --filter="$(FILTER)"

start-infra: ## Start Docker Compose infrastructure
	cd infra && docker compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	cd infra && docker compose ps

stop-infra: ## Stop Docker Compose infrastructure
	cd infra && docker compose down

clean: ## Stop infrastructure and remove volumes
	cd infra && docker compose down -v

smoke: ## Run the smoke check script
	k6 run scripts/smoke-check.js

# Examples:
# make test-all           # Full test run with infra lifecycle
# make test               # Run tests against existing infra
# make test-filter FILTER="lab-0[1-5]"  # Test only labs 1-5
# make test-filter FILTER="browser"     # Test only browser labs
