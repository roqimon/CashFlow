"""Browser regression: saved data renders on the first paint after an update."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from functools import partial

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}/"

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        )
        context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, service_workers="block")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url, wait_until="load")
        page.evaluate("""() => {
          localStorage.setItem('aruskas_cleared', '1');
          localStorage.setItem('aruskas_transactions_v4_st', JSON.stringify([{
            id: 'update-repro-1', title: 'Tes update', amount: 123456,
            type: 'income', category: 'Pemasukan', source: 'personal',
            createdAt: new Date().toISOString()
          }]));
          localStorage.setItem('aruskas_savings_goals_v1', JSON.stringify({
            goals: [{id: 'repro-goal', name: 'Tes tabungan', targetAmount: 500000,
              iconKey: 'general', status: 'active', createdAt: new Date().toISOString()}],
            entries: []
          }));
        }""")
        errors.clear()
        page.reload(wait_until="load")
        assert "123.456" in page.locator("#incomeTotal").inner_text(), errors
        assert "Tes tabungan" in page.locator("#homeSavingsList").inner_text(), errors
        assert not errors, (errors, page.evaluate("typeof window.ReceiptGallery"))
        page.locator('[data-nav="settings"]').first.click()
        with page.expect_navigation(wait_until="load", timeout=20000):
            page.locator('[data-action="force-update"]').click()
        assert "123.456" in page.locator("#incomeTotal").inner_text(), errors
        assert "Tes tabungan" in page.locator("#homeSavingsList").inner_text(), errors
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
