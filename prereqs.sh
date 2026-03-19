#!/bin/bash
# prereqs.sh — Instruqt environment setup for the k6 + Grafana Synthetic Monitoring workshop.
# Run as root during Instruqt challenge setup. Installs all dependencies, pre-pulls Docker
# images, builds local app images, and starts the infrastructure stack so students arrive
# to a ready environment.

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
WORKSHOP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo aschenck)}"
WORKSHOP_DIR="/home/${WORKSHOP_USER}/lab/k6workshop-dev"
LOG_FILE="/var/log/workshop-prereqs.log"

echo "=== k6 Workshop Prerequisites ===" | tee "$LOG_FILE"
echo "User: $WORKSHOP_USER" | tee -a "$LOG_FILE"
echo "Workshop dir: $WORKSHOP_DIR" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# ── Helper ────────────────────────────────────────────────────────────────────
step() { echo "── $1" | tee -a "$LOG_FILE"; }

# ── 1. System packages ────────────────────────────────────────────────────────
step "1/10  Installing base system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >> "$LOG_FILE" 2>&1
apt-get install -y \
  curl \
  wget \
  jq \
  git \
  nano \
  vim \
  unzip \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common \
  >> "$LOG_FILE" 2>&1

# ── 2. Docker CE ──────────────────────────────────────────────────────────────
step "2/10  Installing Docker CE + Compose plugin"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y >> "$LOG_FILE" 2>&1
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >> "$LOG_FILE" 2>&1
else
  echo "  docker already installed: $(docker --version)" | tee -a "$LOG_FILE"
fi

systemctl enable docker >> "$LOG_FILE" 2>&1
systemctl start docker  >> "$LOG_FILE" 2>&1
usermod -aG docker "$WORKSHOP_USER"

# ── 3. k6 ─────────────────────────────────────────────────────────────────────
step "3/10  Installing k6"
if ! command -v k6 &>/dev/null; then
  curl -fsSL https://dl.k6.io/key.gpg \
    | gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
    https://dl.k6.io/deb stable main" \
    > /etc/apt/sources.list.d/k6.list
  apt-get update -y >> "$LOG_FILE" 2>&1
  apt-get install -y k6 >> "$LOG_FILE" 2>&1
else
  echo "  k6 already installed: $(k6 version)" | tee -a "$LOG_FILE"
fi

# ── 4. Chromium (required for k6 browser module in headless mode) ─────────────
step "4/10  Installing Chromium"
if ! command -v chromium-browser &>/dev/null && ! command -v chromium &>/dev/null; then
  apt-get install -y chromium-browser >> "$LOG_FILE" 2>&1 \
    || apt-get install -y chromium >> "$LOG_FILE" 2>&1
else
  echo "  Chromium already installed" | tee -a "$LOG_FILE"
fi

# ── 5. k6 Studio ─────────────────────────────────────────────────────────────
step "5/10  Installing k6 Studio"
if ! command -v k6-studio &>/dev/null; then
  # Try to find a .deb package in the latest GitHub release
  LATEST_RELEASE=$(curl -fsSL https://api.github.com/repos/grafana/k6-studio/releases/latest 2>/dev/null)
  DEB_URL=$(echo "$LATEST_RELEASE" | jq -r '.assets[] | select(.name | endswith(".deb")) | .browser_download_url' 2>/dev/null | head -1)

  if [ -n "$DEB_URL" ] && [ "$DEB_URL" != "null" ]; then
    echo "  Downloading k6 Studio .deb from: $DEB_URL" | tee -a "$LOG_FILE"
    wget -q -O /tmp/k6-studio.deb "$DEB_URL" >> "$LOG_FILE" 2>&1
    apt-get install -y /tmp/k6-studio.deb >> "$LOG_FILE" 2>&1
    rm -f /tmp/k6-studio.deb
  else
    # Fall back to AppImage
    APPIMAGE_URL=$(echo "$LATEST_RELEASE" | jq -r '.assets[] | select(.name | test("linux.*\\.AppImage$|AppImage.*linux")) | .browser_download_url' 2>/dev/null | head -1)
    if [ -n "$APPIMAGE_URL" ] && [ "$APPIMAGE_URL" != "null" ]; then
      echo "  Downloading k6 Studio AppImage from: $APPIMAGE_URL" | tee -a "$LOG_FILE"
      wget -q -O /usr/local/bin/k6-studio "$APPIMAGE_URL" >> "$LOG_FILE" 2>&1
      chmod +x /usr/local/bin/k6-studio
    else
      echo "  WARNING: Could not locate k6 Studio release asset. Install manually from:" | tee -a "$LOG_FILE"
      echo "  https://github.com/grafana/k6-studio/releases" | tee -a "$LOG_FILE"
    fi
  fi
else
  echo "  k6 Studio already installed" | tee -a "$LOG_FILE"
fi

# ── 6. Environment variables ──────────────────────────────────────────────────
step "6/10  Configuring environment variables"
# Write to /etc/environment (system-wide, applies to all users)
grep -q "K6_BROWSER_HEADLESS" /etc/environment 2>/dev/null \
  || echo 'K6_BROWSER_HEADLESS=true' >> /etc/environment

grep -q "K6_PROMETHEUS_RW_SERVER_URL" /etc/environment 2>/dev/null \
  || echo 'K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write' >> /etc/environment

# Also write to workshop user's .bashrc so they take effect in interactive shells
USER_BASHRC="/home/${WORKSHOP_USER}/.bashrc"
grep -q "K6_BROWSER_HEADLESS" "$USER_BASHRC" 2>/dev/null \
  || echo 'export K6_BROWSER_HEADLESS=true' >> "$USER_BASHRC"
grep -q "K6_PROMETHEUS_RW_SERVER_URL" "$USER_BASHRC" 2>/dev/null \
  || echo 'export K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write' >> "$USER_BASHRC"

# Placeholder reminder for K6_CLOUD_TOKEN — students set this in pre-lab
grep -q "K6_CLOUD_TOKEN" "$USER_BASHRC" 2>/dev/null \
  || echo '# export K6_CLOUD_TOKEN=<set-this-in-pre-lab>' >> "$USER_BASHRC"

# ── 7. Clone workshop repository (if not already present) ─────────────────────
step "7/10  Setting up workshop repository"
if [ ! -d "$WORKSHOP_DIR/.git" ]; then
  mkdir -p "$(dirname "$WORKSHOP_DIR")"
  sudo -u "$WORKSHOP_USER" git clone https://github.com/pilotschenck/k6workshop-dev.git "$WORKSHOP_DIR" \
    >> "$LOG_FILE" 2>&1
  echo "  Cloned to $WORKSHOP_DIR" | tee -a "$LOG_FILE"
else
  echo "  Repository already present at $WORKSHOP_DIR" | tee -a "$LOG_FILE"
fi

# ── 8. Pre-pull Docker images ─────────────────────────────────────────────────
step "8/10  Pre-pulling Docker images (this may take a few minutes)"
IMAGES=(
  "kennethreitz/httpbin"
  "wiremock/wiremock:3.3.1"
  "influxdb:1.8"
  "grafana/grafana:10.4.0"
  "prom/prometheus:v2.51.0"
  "otel/opentelemetry-collector-contrib:0.96.0"
  "jaegertracing/all-in-one:1.56"
  "jmalloc/echo-server"
  "grafana/synthetic-monitoring-agent:latest"
  "node:18-alpine"
)

for image in "${IMAGES[@]}"; do
  echo "  Pulling $image..." | tee -a "$LOG_FILE"
  docker pull "$image" >> "$LOG_FILE" 2>&1
done

# ── 9. Build local Docker images ──────────────────────────────────────────────
step "9/10  Building local Docker images"
cd "$WORKSHOP_DIR/infra"
docker compose build >> "$LOG_FILE" 2>&1
echo "  Built: demo-app, broken-app, fake-dd-agent" | tee -a "$LOG_FILE"

# ── 10. Start the infrastructure stack ───────────────────────────────────────
step "10/10  Starting infrastructure stack"
docker compose up -d >> "$LOG_FILE" 2>&1

# Brief wait then show status
sleep 5
docker compose ps | tee -a "$LOG_FILE"

# ── Verification summary ──────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo "=== Verification ===" | tee -a "$LOG_FILE"

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" >> "$LOG_FILE" 2>&1; then
    echo "  ✓  $label" | tee -a "$LOG_FILE"
  else
    echo "  ✗  $label  (check $LOG_FILE for details)" | tee -a "$LOG_FILE"
  fi
}

check "docker"          "docker info"
check "docker compose"  "docker compose version"
check "k6"             "k6 version"
check "jq"             "jq --version"
check "curl"           "curl --version"
check "git"            "git --version"
check "k6 Studio"      "command -v k6-studio || ls /usr/local/bin/k6-studio"

# Service health checks (give the stack a moment to fully start)
echo "  Waiting 15s for services to become healthy..." | tee -a "$LOG_FILE"
sleep 15

check "demo-app (3000)"    "curl -sf http://localhost:3000/health"
check "InfluxDB (8086)"    "curl -sf http://localhost:8086/ping"
check "Grafana (3030)"     "curl -sf http://localhost:3030/api/health"
check "Prometheus (9090)"  "curl -sf http://localhost:9090/-/ready"
check "Jaeger (16686)"     "curl -sf -o /dev/null http://localhost:16686/"
check "ws-echo (8765)"     "curl -sf http://localhost:8765"

echo "" | tee -a "$LOG_FILE"
echo "=== Setup complete. Log: $LOG_FILE ===" | tee -a "$LOG_FILE"
echo "NOTE: Students must set K6_CLOUD_TOKEN in their shell before labs 09+." | tee -a "$LOG_FILE"
