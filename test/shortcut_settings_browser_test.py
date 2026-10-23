"""Browser regression for the shortcut manager on a phone-sized viewport."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        )
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            color_scheme="dark",
            service_workers="allow",
        )
        page = context.new_page()
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        page.route("https://fonts.gstatic.com/**", lambda route: route.abort())
        page.goto(f"http://127.0.0.1:{server.server_port}/", wait_until="load")
        assert page.locator("html").get_attribute("data-theme") == "light", "New PWA sessions must use the designed light theme even when the phone uses dark mode"
        cache_state = page.evaluate("""async () => {
          const registration = await navigator.serviceWorker.ready;
          const cacheNames = await caches.keys();
          const shell = await caches.open('aruskas-pwa-v94');
          const shellUrls = (await shell.keys()).map(request => request.url);
          return {
            activeWorker: Boolean(registration.active),
            cachePresent: cacheNames.includes('aruskas-pwa-v94'),
            stylesheetCached: shellUrls.some(url => url.includes('shortcut-date.js?v=20261023.2')),
            iconsCached: shellUrls.some(url => url.includes('ui-icons.js?v=20261023.1'))
          };
        }""")
        assert cache_state["activeWorker"] and cache_state["cachePresent"] and cache_state["stylesheetCached"] and cache_state["iconsCached"], f"PWA must activate the new cache and icon catalog: {cache_state}"
        page.evaluate("""() => {
          localStorage.setItem('aruskas_cleared', '1');
          localStorage.setItem('aruskas_shortcuts_v3_fixed', '[]');
          localStorage.setItem('aruskas_transactions_v4_st', '[]');
          localStorage.removeItem('aruskas_active_page');
        }""")
        page.reload(wait_until="load")
        page.locator('[data-nav="settings"]').click()
        for name, panel_id in [("pockets", "settingsPocketsPanel"), ("categories", "settingsCategoriesPanel")]:
            toggle = page.locator(f'[data-settings-toggle="{name}"]')
            panel = page.locator(f"#{panel_id}")
            assert not panel.is_visible(), f"{name} settings must start collapsed"
            toggle.click()
            assert panel.is_visible(), f"{name} settings must open when pressed"
            toggle.click()
            assert not panel.is_visible(), f"{name} settings must close when pressed again"

        page.locator('[data-action="open-shortcut-editor"]').click()
        assert page.locator("#shortcutEditor").is_visible(), "Create Shortcut must show the editor form"

        page.locator("#scCode").fill("uji")
        page.locator("#scTitle").fill("Pintasan Uji")
        page.locator("#scCategory").select_option(label="Lainnya")
        page.locator("#scType").select_option("expense")
        page.locator("#scAmount").fill("25000")
        page.locator('#shortcutForm button[type="submit"]').click()
        shortcut = page.locator("#shortcutList [data-sc-id]").first
        assert shortcut.is_visible(), "Saved shortcut must appear in the list"
        assert "Pintasan Uji" in shortcut.inner_text()

        shortcut.locator("[data-toggle-sc-home]").click()
        assert shortcut.locator("[data-toggle-sc-home]").inner_text() == "Taruh", "Shortcut can be removed from Home"
        shortcut.locator("[data-toggle-sc-home]").click()
        assert shortcut.locator("[data-toggle-sc-home]").inner_text() == "Lepas", "Shortcut can be restored to Home"

        shortcut.locator("[data-edit-sc]").click()
        assert page.locator("#shortcutEditor").is_visible(), "Edit Shortcut must show the editor form"
        page.locator("#scTitle").fill("Pintasan Diperbarui")
        page.locator('#shortcutForm button[type="submit"]').click()
        assert "Pintasan Diperbarui" in page.locator("#shortcutList [data-sc-id]").first.inner_text()

        dimensions = page.evaluate("({width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth})")
        assert dimensions["scrollWidth"] <= dimensions["width"], f"Shortcut settings overflow on mobile: {dimensions}"
        assert page.locator('[data-page="settings"] .settings-card').last.locator("#shortcutList").count() == 1, "Quick Shortcuts must be the final settings card"
        assert not page_errors, page_errors
        browser.close()
        print("PWA cache, shortcut create/edit/Home visibility, final placement, light-mode default, and mobile overflow verified.")
finally:
    server.shutdown()
