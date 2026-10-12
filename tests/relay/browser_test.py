"""Browser checks for the Relay demo and pilot pages.

Run from the repository root:
    python3 tests/relay/browser_test.py

Needs Python Playwright with Chromium (pip install playwright && playwright install chromium).
Serves the repository root on a local port; nothing is deployed or sent anywhere.
"""
import functools
import http.server
import json
import pathlib
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
failures = []


def check(name, condition):
    print(("PASS " if condition else "FAIL ") + name)
    if not condition:
        failures.append(name)


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def visible(page, selector):
    return page.locator(selector).first.is_visible()


def announced(page):
    page.wait_for_timeout(150)
    return page.evaluate("(document.getElementById('announcer') || {}).textContent || ''")


def demo_checks(page, base):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base + "/relay/")
    page.evaluate("localStorage.clear()")
    page.reload()

    check("demo: dashboard visible to Sarah", visible(page, "#dashboard"))
    check("demo: dementia note hidden for staff", not visible(page, "#family-context"))
    check("demo: family supply alert hidden for staff", not visible(page, "#family-supply-alert"))

    # Family observer must not see an unpublished draft.
    page.select_option("#role", "jess")
    check("demo: draft hidden from family", not visible(page, "#dashboard"))
    check("demo: family sees empty state", visible(page, "#observer-empty"))
    check("demo: family sees dementia note", visible(page, "#family-context"))

    # Sarah adds a remark and publishes.
    page.select_option("#role", "sarah")
    chip = page.locator("[data-remark]").first
    chip.click()
    check("demo: chip reports pressed state", chip.get_attribute("aria-pressed") == "true")
    page.click("#publish")
    check("demo: status published", page.text_content("#status").strip().lower() == "published")
    check("demo: action announced", "published" in announced(page).lower())

    # Family can now see it, but cannot edit supplies.
    page.select_option("#role", "jess")
    check("demo: published handover visible to family", visible(page, "#dashboard"))
    check("demo: family cannot adjust supplies", not visible(page, ".supply-controls button"))
    check("demo: family sees low-supply alert", visible(page, "#family-supply-alert"))
    check("demo: family sees published remark", visible(page, "#published-remarks"))

    # Tom accepts and ticks the task.
    page.select_option("#role", "tom")
    page.click("#accept")
    check("demo: accepted", page.text_content("#status").strip().lower() == "accepted")
    page.check("#task")

    # Supplies.
    page.click('[data-restock="wipes"]')
    check("demo: restock wipes", page.text_content('[data-count="wipes"]') == "6")
    check("demo: supply change announced", "wipes" in announced(page).lower())

    # State survives reload; reset restores.
    page.reload()
    page.select_option("#role", "tom")
    check("demo: state persisted", page.text_content("#status").strip().lower() == "accepted")
    page.click("#reset")
    check("demo: reset to draft", page.text_content("#status").strip().lower() == "draft")

    # Corrupt or unexpected storage must not break the page.
    page.evaluate("localStorage.setItem('relay-fictional-demo-v3', JSON.stringify({region:'fr', remarks: 5, supplies: null}))")
    page.reload()
    check("demo: survives corrupt storage", visible(page, "#publish"))

    # Remarks are capped even when added via chips.
    page.evaluate("localStorage.setItem('relay-fictional-demo-v3', JSON.stringify({remarks: 'x'.repeat(275)}))")
    page.reload()
    page.locator("[data-remark]").nth(2).click()
    check("demo: remarks stay within 280", len(page.input_value("#remarks")) <= 280)

    check("demo: no script errors", not errors)
    if errors:
        print("  errors:", errors)


def mobile_checks(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 800})
    for path in ["/relay/", "/relay/pilot/", "/relay/admin/"]:
        page.goto(base + path)
        overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        check(f"mobile: no horizontal scroll on {path}", not overflow)
    page.close()


def pilot_checks(page, base):
    page.goto(base + "/relay/pilot/")
    labels_ok = page.evaluate("""() => [...document.querySelectorAll('#pilot-form input:not([name=website]), #pilot-form select, #pilot-form textarea')]
        .every(el => el.labels && el.labels.length > 0)""")
    check("pilot: every field labelled", labels_ok)

    def fill():
        page.fill('[name="name"]', "Test Person")
        page.fill('[name="email"]', "test@example.com")
        page.fill('[name="location"]', "Leeds, UK")
        page.select_option('[name="applicant_type"]', "family")
        page.fill('[name="participant_count"]', "3")
        page.fill('[name="problem"]', "Shift handovers get lost between siblings.")
        page.check('[name="consent"]')

    # Server returns non-JSON (e.g. a platform error page).
    page.route("**/api/relay-pilot", lambda route: route.fulfill(status=502, body="<html>Bad gateway</html>", content_type="text/html"))
    fill()
    page.click('button[type="submit"]')
    page.wait_for_function("document.getElementById('form-status').classList.contains('error')")
    message = page.text_content("#form-status")
    check("pilot: friendly message on non-JSON error", "Unexpected" not in message and "JSON" not in message)
    check("pilot: button re-enabled after error", page.is_enabled('button[type="submit"]'))

    page.unroute("**/api/relay-pilot")
    sent = {}

    def ok(route):
        sent.update(json.loads(route.request.post_data))
        route.fulfill(status=201, body='{"received":true}', content_type="application/json")

    page.route("**/api/relay-pilot", ok)
    page.click('button[type="submit"]')
    page.wait_for_function("document.getElementById('form-status').classList.contains('success')")
    check("pilot: success message", "received" in page.text_content("#form-status"))
    check("pilot: sends consent", sent.get("consent") == "yes")


def admin_checks(page, base):
    page.route("**/api/admin/relay-leads", lambda route: route.abort())
    page.goto(base + "/relay/admin/")
    page.wait_for_function("!document.getElementById('lead-list').textContent.includes('Loading')", timeout=5000)
    check("admin: network failure shows message", "unavailable" in page.text_content("#lead-list").lower())
    page.unroute("**/api/admin/relay-leads")
    lead = {"id": "1", "created_at": "2026-10-01 10:00:00", "name": "<img src=x onerror=alert(1)>", "email": "a@b.co",
            "organisation": "", "location": "York", "applicant_type": "family", "participant_count": 3,
            "problem": "p", "status": "new", "owner": "Unassigned", "updated_at": None}
    page.route("**/api/admin/relay-leads", lambda route: route.fulfill(status=200, body=json.dumps({"leads": [lead]}), content_type="application/json"))
    page.goto(base + "/relay/admin/")
    page.wait_for_selector(".lead-card")
    check("admin: lead names rendered as text", page.locator(".lead-card img").count() == 0)


def main():
    server = serve()
    base = f"http://127.0.0.1:{server.server_port}"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        demo_checks(page, base)
        pilot_checks(browser.new_page(), base)
        admin_checks(browser.new_page(), base)
        mobile_checks(browser, base)
        browser.close()
    server.shutdown()
    print(f"\n{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
