# // OPENPRIX
High-performance Engineering ERP & Server Daemon. OpenPrix is built with a highly decoupled, enterprise-grade architecture featuring a Rust-based backend, an embedded React web application, a native Terminal User Interface (TUI), and a dedicated Electron thin-client.

## 🏗️ Architecture Overview
* **The Server (`openprix`)**: A multi-threaded Rust (Axum) daemon with an embedded SQLite database. It serves the REST API and *directly embeds* the compiled React web application inside the binary using `rust-embed`.
* **The Console (`openprix-tui`)**: A native Rust (Ratatui) terminal dashboard for server monitoring and quick kanban management.
* **The Web App (`react`)**: A React/Vite frontend. It dynamically discovers the server port and communicates purely over REST.
* **The Client (`electron`)**: A lightweight native desktop portal that connects to the local (or remote) daemon without carrying the weight of the web build.

---

## 🛠️ Prerequisites
Before building OpenPrix from source, ensure you have the following installed on your system:
1. **[Node.js](https://nodejs.org/)** (v18+ recommended)
2. **[Rust & Cargo](https://rustup.rs/)** (Latest stable version)
3. *Windows Only:* **[WiX Toolset v3.11](https://wixtoolset.org/releases/)** (Required to build the `.msi` backend installer). Make sure to add the WiX `bin` folder to your System PATH.

---

## 🚀 Building from Source

Because the Rust backend embeds the frontend web files, **you must build the React app first.**

### Step 1: Build the Web App
```bash
# From the root directory, install dependencies and build the Vite React app
npm install
npm run build

```

*(This generates the `dist/` folder, which the Rust compiler will embed).*

### Step 2: Build the Rust Binaries (Daemon & TUI)

```bash
cd core
cargo build --release

```

*(This creates `openprix` and `openprix-tui` inside `core/target/release/`).*

### Step 3: Run the Local Setup Script (Windows Only)

If you aren't creating an installer and just want to run the tools locally, use the provided PowerShell script to add the binaries to your environment variables:

```powershell
.\setup_env.ps1

```

---

## 📦 Packaging & Installers

### 🪟 Windows (MSI & EXE)

Windows packaging utilizes WiX Toolset for the backend and NSIS for the frontend client.

**1. Build the Backend Installer (.msi)**

```powershell
cd core
cargo wix -p openprix

```

*Outputs:* `core/target/wix/openprix.msi`. This installs the daemon, the TUI, and injects them into the System PATH.

**2. Build the Electron Client Installer (.exe)**

```powershell
# From the root directory
npm run build:electron

```

*Outputs:* `release-electron/OpenPrix Setup.exe`.

### 🍎 macOS (DMG)

**1. Backend Installation**
macOS does not use WiX installers. To install the backend system-wide:

```bash
cd core
cargo build --release
# Copy the compiled binaries to your local bin directory
sudo cp target/release/openprix /usr/local/bin/
sudo cp target/release/openprix-tui /usr/local/bin/

```

**2. Build the Electron Client (.dmg)**

```bash
# From the root directory
npm run build:electron -- --mac

```

### 🐧 Linux (AppImage & Snap)

**1. Backend Installation**
Similar to macOS, Linux users can easily move the compiled binaries to their local path.

```bash
cd core
cargo build --release
# Move binaries to your user path
sudo cp target/release/openprix /usr/local/bin/
sudo cp target/release/openprix-tui /usr/local/bin/

```

**2. Build the Electron Client (.AppImage)**

```bash
# From the root directory
npm run build:electron -- --linux

```

---

## 💻 Usage & CLI Commands

Once installed or added to your PATH, OpenPrix acts as a native operating system utility.

| Command | Action |
| --- | --- |
| `openprix` | Boots the Background Server on a dynamic secure port. |
| `openprix-t` | Launches the Terminal Dashboard. |

**Connecting the Client:**
Open the OpenPrix desktop icon. On the connection screen, the portal will automatically detect your local daemon (usually `http://127.0.0.1:<dynamic_port>`). Click Connect to initialize your secure ERP session.

---

## 📜 License

This project is licensed under the terms of the MIT License.

```

```