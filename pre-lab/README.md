# Pre-Lab: Environment Setup

Complete these steps before the workshop begins. Estimated time: 20-30 minutes.

---

## 1. Create a Grafana Cloud Free Tier Account

Grafana Cloud is required for labs 09 and later. The free tier is sufficient for all workshop exercises.

1. Go to [grafana.com/get](https://grafana.com/get)
2. Click **Start for free**
3. Sign up with your email address or a GitHub/Google account
4. Choose the **Free** plan when prompted
5. Select a region closest to you
6. Note your Grafana Cloud stack URL — it will look like `https://<your-org>.grafana.net`

---

## 2. Get Your k6 Cloud API Token

The k6 Cloud API token is used to stream results to Grafana Cloud and to create Synthetic Monitoring checks.

1. Log in to your Grafana Cloud account at [grafana.com](https://grafana.com)
2. From the Grafana Cloud Portal, click on your stack (the tile with your org name)
3. In the left sidebar, find **k6** and click on it
4. Go to **Settings** → **API Token**
5. Click **Generate Token** (or copy an existing token if one exists)
6. Copy the token value — you will not be able to view it again after leaving the page

---

## 3. Install k6 Locally

Choose the instructions for your operating system.

### Linux (apt)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Linux (Homebrew)

```bash
brew install k6
```

### macOS (Homebrew)

```bash
brew install k6
```

### Windows (Chocolatey)

```powershell
choco install k6
```

### Windows (winget)

```powershell
winget install k6 --source winget
```

For the full list of installation options including binary downloads, see the [official k6 installation docs](https://k6.io/docs/get-started/installation).

---

## 4. Verify k6 Installation

Run the following command to confirm k6 is installed and on your PATH:

```bash
k6 version
```

Expected output (version number will vary):

```
k6 v0.54.0 (go1.23.1, linux/amd64)
```

If the command is not found, ensure the k6 binary location is included in your `PATH` environment variable.

---

## 5. Install k6 Studio

k6 Studio is a desktop application for recording browser sessions and automatically generating k6 browser scripts from the recording. It gives you a visual way to create scripts without writing them from scratch — useful when you need to reproduce a complex multi-step user journey.

**What you will use it for:** Lab 24 uses k6 Studio to record a browser session against the demo app and convert it into a runnable k6 script.

### On the Instruqt Workstation

k6 Studio is pre-installed. Verify it is available by running:

```bash
k6-studio --version
```

Alternatively, search for **k6 Studio** in the Applications menu of the desktop environment.

### If k6 Studio Is Not Present

Download the latest release from GitHub:

```
https://github.com/grafana/k6-studio/releases
```

Choose the package matching your system:

| Format | Use when |
|--------|----------|
| `.AppImage` | Any Linux distribution (no install required) |
| `.deb` | Debian / Ubuntu |
| `.rpm` | Fedora / RHEL |
| `.dmg` | macOS |
| `.exe` | Windows |

**Linux AppImage (quick start):**

```bash
chmod +x k6-studio-*.AppImage
./k6-studio-*.AppImage
```

**Linux deb package:**

```bash
sudo dpkg -i k6-studio-*.deb
k6-studio
```

---

## 6. Set Environment Variables

Export your k6 Cloud API token so it is available to all workshop scripts.

### Linux / macOS

```bash
export K6_CLOUD_TOKEN=<your-token>
```

To persist this across terminal sessions, add the line to your `~/.bashrc`, `~/.zshrc`, or equivalent shell profile file.

### Windows (PowerShell)

```powershell
$env:K6_CLOUD_TOKEN = "<your-token>"
```

Replace `<your-token>` with the token you copied in step 2.

---

## 7. Verify Docker and Start the Local Stack

Confirm Docker Compose is available:

```bash
docker compose version
```

Expected output (version will vary):

```
Docker Compose version v2.29.0
```

Start the local Grafana and InfluxDB stack from the `infra/` directory:

```bash
cd infra
docker compose up -d
```

Wait about 15-20 seconds for the containers to finish starting. You can check their status with:

```bash
docker compose ps
```

All services should show a status of `running`.

---

## 8. Run the Smoke Check

From the repository root, run the smoke check script to verify the full pipeline — k6 running, InfluxDB receiving metrics, and Grafana displaying results:

```bash
k6 run scripts/smoke-check.js
```

Expected output ends with something like:

```
✓ status was 200

checks.........................: 100.00% ✓ 10 ✗ 0
data_received..................: ...
http_req_duration..............: avg=...
```

If any checks fail, revisit steps 7 and ensure the Docker stack is healthy.

---

## 9. Access the Grafana Dashboard

Open your browser and navigate to:

```
http://localhost:3030
```

Default credentials:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin` |

You will be prompted to change the password on first login — you can skip this for workshop purposes.

Navigate to **Dashboards** → **k6 Overview** to see the pre-built dashboard. After running the smoke check in step 8, you should see data populated in the panels.
