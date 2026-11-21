import http.server
import socketserver
import json
import os
import base64
import subprocess

PORT = 8080
REPO_DIR = os.path.dirname(os.path.abspath(__file__))

class StudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=REPO_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/local-publish":
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode("utf-8")
            payload = json.loads(raw)
            files = payload.get("files", [])
            msg = payload.get("message", "feat(projects): оновлення карток вітрини 4і4")

            written = []
            for f in files:
                rel_path = f.get("path", "").lstrip("/\\")
                if not rel_path or ".." in rel_path or rel_path == "googlec65157ff176b6222.html":
                    continue
                abs_path = os.path.join(REPO_DIR, rel_path.replace("/", os.sep))
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)

                if "contentBase64" in f:
                    data = base64.b64decode(f["contentBase64"])
                    with open(abs_path, "wb") as out:
                        out.write(data)
                elif "content" in f:
                    with open(abs_path, "w", encoding="utf-8", newline="\n") as out:
                        out.write(f["content"])
                written.append(rel_path)

            import re, time
            html_file = os.path.join(REPO_DIR, "projects.html")
            if os.path.exists(html_file):
                with open(html_file, "r", encoding="utf-8") as hf:
                    h_txt = hf.read()
                h_new = re.sub(r'projects-data\.js(\?v=[^"]*)?', f'projects-data.js?v={int(time.time())}', h_txt)
                if h_new != h_txt:
                    with open(html_file, "w", encoding="utf-8", newline="\n") as hf:
                        hf.write(h_new)
                    written.append("projects.html")
            subprocess.run(["git", "add", "projects-data.js", "projects.html", "projects"], cwd=REPO_DIR, check=False)
            for w in written:
                subprocess.run(["git", "add", w], cwd=REPO_DIR, check=False)

            commit_res = subprocess.run(
                ["git", "commit", "-m", msg],
                cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace"
            )
            push_res = subprocess.run(
                ["git", "push"],
                cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace"
            )

            ok = push_res.returncode == 0
            resp = {
                "ok": ok,
                "written": len(written),
                "commit": (commit_res.stdout or commit_res.stderr).strip(),
                "push": (push_res.stdout or push_res.stderr).strip()
            }
            body = json.dumps(resp, ensure_ascii=False).encode("utf-8")
            self.send_response(200 if ok else 500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            err = json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers()
            self.wfile.write(err)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    with ReusableTCPServer(("127.0.0.1", PORT), StudioHandler) as httpd:
        print(f"4i4 Local Studio Server running at http://127.0.0.1:{PORT}")
        httpd.serve_forever()