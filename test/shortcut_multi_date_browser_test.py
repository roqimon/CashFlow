"""Browser regression for shortcut date ranges, saved destinations, and confirmation."""
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


server = HTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        )
        context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, service_workers="block")
        context.add_init_script("""(() => {
          localStorage.setItem('aruskas_cleared', '1');
          localStorage.setItem('aruskas_pockets_cleared', '0');
          localStorage.setItem('aruskas_transactions_v4_st', '[]');
          localStorage.setItem('aruskas_shortcuts_v3_fixed', '[]');
          localStorage.setItem('aruskas_budget_pockets_v1', JSON.stringify([{id:'pocket-st',name:'ST Oktober',icon:'📋',amount:3000000,categories:['st','perjalanan']} ]));
          localStorage.setItem('aruskas_st_sessions_v1', JSON.stringify([{id:'session-st',label:'Oktober',status:'active'}]));
          localStorage.setItem('aruskas_category_records_v1', JSON.stringify([]));
          localStorage.removeItem('aruskas_active_page');
          class MockRecognition {
            start() { window.__activeRecognition = this; this.onstart?.(); }
            stop() {}
            abort() {}
          }
          window.SpeechRecognition = MockRecognition;
        })();""")
        page = context.new_page()
        page.route("**/*", lambda route: route.continue_() if route.request.is_navigation_request() or route.request.url.endswith((".html", ".js", ".css", ".svg", ".png", ".webp", ".woff2")) else route.continue_())
        page.set_default_timeout(3000)
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: page_errors.append(message.text) if message.type == "error" and "fonts.googleapis.com" not in message.text else None)
        page.on("requestfailed", lambda request: page_errors.append(f"request failed: {request.url} {request.failure}") if "fonts.googleapis.com" not in request.url and "fonts.gstatic.com" not in request.url else None)
        page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
        page.route("https://fonts.gstatic.com/**", lambda route: route.fulfill(status=200, content_type="font/woff2", body=b""))
        page.goto(f"http://127.0.0.1:{server.server_port}/", wait_until="load")

        page.locator('[data-nav="settings"]').click()
        page.locator('[data-action="open-shortcut-editor"]').click()
        target_options = page.locator("#scTargetPocket option").all_text_contents()
        assert any("ST Oktober" in label for label in target_options), target_options
        for code, title, amount in [("UPD", "UPD", "79.500"), ("UPD Full", "UPD Full", "132.500")]:
            page.locator("#scCode").fill(code)
            page.locator("#scTitle").fill(title)
            page.locator("#scCategory").select_option(label="Lainnya")
            page.locator("#scType").select_option("expense")
            page.locator("#scAmount").fill(amount)
            page.locator("#scTargetPocket").select_option("pocket-st")
            page.locator('#shortcutForm button[type="submit"]').click()
            if code == "UPD":
                page.locator('[data-action="open-shortcut-editor"]').click()

        shortcuts = page.evaluate("JSON.parse(localStorage.getItem('aruskas_shortcuts_v3_fixed'))")
        by_code = {item["code"]: item for item in shortcuts}
        assert by_code["upd"]["targetPocketId"] == "pocket-st", shortcuts
        assert by_code["upd-full"]["targetPocketId"] == "pocket-st", shortcuts

        page.evaluate("document.querySelector('[data-nav=home]').click()")
        input_box = page.locator("#quickInput")
        save_button = page.locator('[data-action="save-quick"]')

        for phrase in ["UPD Full 1-5", "UPD Full 1 sampai 5 Oktober 2026"]:
            input_box.fill(phrase)
            save_button.click()
            assert page.locator("#confirmModal").is_visible(), (phrase, page.evaluate("({value:document.querySelector('#quickInput')?.value,preview:document.querySelector('#quickPreview')?.innerText,dateApi:typeof window.ShortcutDate,active:[...document.querySelectorAll('.page.active')].map(x=>x.dataset.page)})"), page_errors)
            assert "5 transaksi" in page.locator("#confirmMessage").inner_text()
            before = page.evaluate("JSON.parse(localStorage.getItem('aruskas_transactions_v4_st')).length")
            assert before == 0, "Preview must not save before confirmation"
            page.locator("#confirmCancel").click()
            assert page.evaluate("JSON.parse(localStorage.getItem('aruskas_transactions_v4_st')).length") == 0

        page.locator("#voiceBtn").click()
        recognition = page.evaluate("Boolean(window.__activeRecognition)")
        assert recognition, "Voice input should start the browser recognizer"
        page.evaluate("""() => {
          const result = [{transcript:'UPD Full dari tanggal satu sampai lima Oktober dua ribu dua puluh enam'}];
          result.isFinal = true;
          window.__activeRecognition.onresult({results:[result]});
        }""")
        assert "1 sampai 5 oktober 2026" in input_box.input_value().lower(), input_box.input_value()
        page.evaluate("window.__activeRecognition.onend()")
        summary = page.locator("#confirmMessage").inner_text()
        summary = " ".join(summary.split())
        assert "1 Oktober 2026" in summary and "5 Oktober 2026" in summary, summary
        assert "Rp 132.500 per hari" in summary and "Rp 662.500" in summary, summary
        page.locator("#confirmOk").click()
        transactions = page.evaluate("JSON.parse(localStorage.getItem('aruskas_transactions_v4_st'))")
        assert len(transactions) == 5, transactions
        assert [item["createdAt"][:10] for item in transactions] == [
            "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"
        ], transactions
        for item in transactions:
            assert item["amount"] == 132500
            assert item["category"] == "Lainnya"
            assert item["source"] == "st" and item["pocketId"] == "pocket-st"
            assert item["stSessionId"] == "session-st"
            assert item["reimburseStatus"] == "pending"
            assert item["shortcutCode"] == "upd-full"

        # A clearly marked single date follows the normal single-transaction path and keeps the shortcut's pos.
        for phrase, expected_date in [
            ("UPD Full 1 Okt", "2026-10-01"),
            ("UPD Full tanggal 1/10/2025", "2025-10-01"),
            ("UPD Full tanggal 1 10 2025", "2025-10-01"),
        ]:
            input_box.fill(phrase)
            save_button.click()
            current = page.evaluate("JSON.parse(localStorage.getItem('aruskas_transactions_v4_st'))")
            assert len(current) == len(transactions) + 1, (phrase, current)
            newest = current[0]
            assert newest["createdAt"][:10] == expected_date, newest
            assert newest["source"] == "st" and newest["pocketId"] == "pocket-st", newest
            transactions = current

        # Plain D M YYYY is ambiguous; it must show an error and save nothing.
        input_box.fill("UPD Full 1 10 2025")
        save_button.click()
        assert not page.locator("#confirmModal").is_visible()
        assert "pemisah" in page.locator("#quickPreview").inner_text()
        assert page.evaluate("JSON.parse(localStorage.getItem('aruskas_transactions_v4_st')).length") == len(transactions)

        # Voice confirmation is only activated by the visible explicit mic button.
        input_box.fill("UPD 1-5 Oktober 2026")
        save_button.click()
        page.locator("#confirmVoice").click()
        page.evaluate("window.__activeRecognition.onresult({results:[[{transcript:'Oke'}]]})")
        page.wait_for_selector("#confirmModal", state="hidden")
        final_items = page.evaluate("JSON.parse(localStorage.getItem('aruskas_transactions_v4_st'))")
        assert len(final_items) == len(transactions) + 5, len(final_items)
        assert page.evaluate("({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth})")["scrollWidth"] <= 390
        assert not page_errors, page_errors
        browser.close()
        print("Shortcut targets, date formats, batch preview/cancel/save, ST fields, single dates, ambiguity guard, voice-confirm mock, and 390px overflow verified.")
finally:
    server.shutdown()
