import argparse
import asyncio
import json
import os
import random
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

from playwright.async_api import async_playwright

# Anti-detection: playwright-stealth integration
try:
    from playwright_stealth import stealth_async
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False
    print("PUBLISH_WARN: playwright-stealth not installed, running without stealth", file=sys.stderr)

# Realistic User-Agent strings to rotate
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
]

DEFAULT_UA = random.choice(USER_AGENTS)

DEFAULT_DOWNLOAD_CONCURRENCY = 3

# Anti-detection delay configuration
MIN_DELAY_MS = int(os.environ.get("XHS_MIN_DELAY_MS", "500"))
MAX_DELAY_MS = int(os.environ.get("XHS_MAX_DELAY_MS", "2500"))
STEALTH_MODE = os.environ.get("XHS_STEALTH_MODE", "true").lower() in ("1", "true", "yes")

# Cookie persistence configuration (learned from xiaohongshu-mcp)
COOKIE_FILE = Path(os.environ.get("XHS_COOKIE_FILE", "")).expanduser() if os.environ.get("XHS_COOKIE_FILE") else None
COOKIE_AUTO_SAVE = os.environ.get("XHS_COOKIE_AUTO_SAVE", "true").lower() in ("1", "true", "yes")

# Rate limiting configuration (learned from xiaohongshu-mcp)
DAILY_LIMIT = int(os.environ.get("XHS_DAILY_LIMIT", "50"))  # xiaohongshu-mcp: 50 per day
MIN_INTERVAL_SECONDS = int(os.environ.get("XHS_MIN_INTERVAL_SECONDS", "1800"))  # 30 minutes
PUBLISH_LOG_FILE = Path(os.environ.get("XHS_PUBLISH_LOG", "")).expanduser() if os.environ.get("XHS_PUBLISH_LOG") else None


# ============= Cookie Persistence Functions =============

def get_cookie_file_path(base_dir):
    """Get cookie file path, create if needed."""
    if COOKIE_FILE:
        return COOKIE_FILE
    path = Path(base_dir) / "xhs_cookies.json"
    return path


def load_cookies_from_file(path):
    """Load cookies from JSON file."""
    try:
        if path.exists():
            cookies = json.loads(path.read_text(encoding="utf-8"))
            log_step(f"loaded {len(cookies)} cookies from {path}")
            return cookies
    except Exception as e:
        log_step(f"failed to load cookies: {e}")
    return None


def save_cookies_to_file(cookies, path):
    """Save cookies to JSON file."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cookies, indent=2, ensure_ascii=False), encoding="utf-8")
        log_step(f"saved {len(cookies)} cookies to {path}")
    except Exception as e:
        log_step(f"failed to save cookies: {e}")


async def save_context_cookies(context, path):
    """Save cookies from browser context to file."""
    if not COOKIE_AUTO_SAVE:
        return
    try:
        cookies = await context.cookies()
        save_cookies_to_file(cookies, path)
    except Exception as e:
        log_step(f"failed to save context cookies: {e}")


# ============= Rate Limiting Functions =============

def get_publish_log_path(base_dir):
    """Get publish log file path."""
    if PUBLISH_LOG_FILE:
        return PUBLISH_LOG_FILE
    return Path(base_dir) / "publish_history.json"


def load_publish_history(path):
    """Load publish history from file."""
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"publishes": []}


def save_publish_history(history, path):
    """Save publish history to file."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        log_step(f"failed to save publish history: {e}")


def check_rate_limit(base_dir):
    """
    Check if we can publish based on rate limits.
    Returns (can_publish, reason_if_not).
    """
    log_path = get_publish_log_path(base_dir)
    history = load_publish_history(log_path)
    
    now = time.time()
    today_start = now - (now % 86400)  # Start of today (UTC)
    
    # Filter publishes from today
    today_publishes = [p for p in history.get("publishes", []) if p.get("timestamp", 0) >= today_start]
    
    # Check daily limit
    if len(today_publishes) >= DAILY_LIMIT:
        return False, f"达到每日发布上限 ({DAILY_LIMIT} 篇)"
    
    # Check minimum interval
    if today_publishes:
        last_publish = max(p.get("timestamp", 0) for p in today_publishes)
        elapsed = now - last_publish
        if elapsed < MIN_INTERVAL_SECONDS:
            remaining = int(MIN_INTERVAL_SECONDS - elapsed)
            return False, f"距离上次发布时间不足，请等待 {remaining // 60} 分钟"
    
    return True, None


def record_publish(base_dir, title):
    """Record a successful publish."""
    log_path = get_publish_log_path(base_dir)
    history = load_publish_history(log_path)
    
    history.setdefault("publishes", []).append({
        "timestamp": time.time(),
        "title": title[:50],
        "date": time.strftime("%Y-%m-%d %H:%M:%S")
    })
    
    # Keep only last 100 records
    history["publishes"] = history["publishes"][-100:]
    save_publish_history(history, log_path)


# ============= End Cookie & Rate Limit Functions =============


def log_step(message):
    print(f"PUBLISH_STEP: {message}", file=sys.stderr)


def get_download_concurrency():
    raw = os.environ.get("XHS_DOWNLOAD_CONCURRENCY", "").strip()
    if not raw:
        return DEFAULT_DOWNLOAD_CONCURRENCY
    try:
        return max(1, int(raw))
    except ValueError:
        return DEFAULT_DOWNLOAD_CONCURRENCY


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True, help="Path to publish payload json")
    return parser.parse_args()


def parse_cookie(cookie_str):
    cookies = []
    for part in cookie_str.split(";"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        name, value = part.split("=", 1)
        cookies.append(
            {
                "name": name.strip(),
                "value": value.strip(),
                "domain": ".xiaohongshu.com",
                "path": "/",
            }
        )
    return cookies


def safe_filename(url, fallback):
    try:
        parsed = urllib.parse.urlparse(url)
        name = Path(parsed.path).name
        if name and "." in name:
            return name
    except Exception:
        pass
    return fallback


def build_headers(referer=None, cookie=None):
    headers = {
        "User-Agent": DEFAULT_UA,
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
    if referer:
        headers["Referer"] = referer
        parsed = urllib.parse.urlparse(referer)
        if parsed.scheme and parsed.netloc:
            headers["Origin"] = f"{parsed.scheme}://{parsed.netloc}"
    if cookie:
        headers["Cookie"] = cookie
    return headers


def download_file(url, dest_path, referer=None, cookie=None):
    referers = [referer, "https://www.xiaohongshu.com/", "https://www.xiaohongshu.com/explore"]
    last_exc = None
    for candidate in referers:
        if not candidate:
            continue
        headers = build_headers(candidate, cookie)
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp, open(dest_path, "wb") as fp:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    fp.write(chunk)
            return
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code != 403:
                break
        except Exception as exc:
            last_exc = exc
            break
    if isinstance(last_exc, urllib.error.HTTPError):
        raise RuntimeError(f"download failed {last_exc.code} for {url}") from last_exc
    raise RuntimeError(f"download failed for {url}") from last_exc


async def download_with_context(context, url, dest_path, referer=None, cookie=None):
    headers = build_headers(referer, cookie)
    response = await context.request.get(url, headers=headers, timeout=60000)
    status = response.status
    if status != 200:
        raise RuntimeError(f"download failed {status} for {url}")
    body = await response.body()
    Path(dest_path).write_bytes(body)


async def download_media_files(context, media_requests, download_dir, source_url, cookie):
    concurrency = get_download_concurrency()
    semaphore = asyncio.Semaphore(concurrency)

    async def download_one(kind, url, filename):
        dest_path = Path(download_dir) / filename
        async with semaphore:
            if kind == "video":
                await asyncio.to_thread(download_file, url, dest_path, referer=source_url, cookie=cookie)
            else:
                try:
                    await download_with_context(context, url, dest_path, referer=source_url, cookie=cookie)
                except Exception as exc:
                    print(f"PUBLISH_WARN: context download failed for {url} ({exc}), fallback to urllib", file=sys.stderr)
                    await asyncio.to_thread(download_file, url, dest_path, referer=source_url, cookie=cookie)
        return str(dest_path)

    tasks = [
        download_one(kind, url, filename)
        for kind, url, filename in media_requests
    ]
    return await asyncio.gather(*tasks)


def normalize_tags(tags):
    if not tags:
        return []
    cleaned = []
    for tag in tags:
        tag = str(tag).strip()
        if not tag:
            continue
        cleaned.append(tag.lstrip("#"))
    return cleaned


# ============= Anti-Detection: Human Behavior Simulation =============

async def human_delay(min_ms=None, max_ms=None):
    """Add random delay to simulate human behavior."""
    min_ms = min_ms or MIN_DELAY_MS
    max_ms = max_ms or MAX_DELAY_MS
    delay = random.uniform(min_ms / 1000, max_ms / 1000)
    await asyncio.sleep(delay)


async def human_type(page, text, min_delay_ms=50, max_delay_ms=150):
    """Type text with human-like variable speed."""
    for char in text:
        await page.keyboard.type(char)
        await asyncio.sleep(random.uniform(min_delay_ms / 1000, max_delay_ms / 1000))


async def human_click(page, locator):
    """Click with random delay before and after."""
    await human_delay(300, 800)
    await locator.click()
    await human_delay(200, 600)


async def human_scroll(page, direction="down", amount=None):
    """Simulate human-like scrolling."""
    amount = amount or random.randint(100, 300)
    if direction == "down":
        await page.mouse.wheel(0, amount)
    else:
        await page.mouse.wheel(0, -amount)
    await human_delay(500, 1500)


async def simulate_reading(page, seconds=None):
    """Simulate user reading content on page."""
    seconds = seconds or random.uniform(2, 5)
    log_step(f"simulating reading for {seconds:.1f}s")
    await asyncio.sleep(seconds)
    # Random small scrolls
    for _ in range(random.randint(1, 3)):
        await human_scroll(page, "down", random.randint(50, 150))


# ============= End Human Behavior Simulation =============


async def fill_first_selector(page, selectors, value):
    for selector in selectors:
        locator = page.locator(selector)
        if await locator.count():
            await locator.first.fill(value)
            return True
    return False


async def type_in_editor(page, selectors, content, tags):
    for selector in selectors:
        locator = page.locator(selector)
        if await locator.count():
            await locator.first.click()
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await page.keyboard.type(content)
            for tag in tags:
                await page.keyboard.type(f" #{tag} ")
            return True
    return False


async def wait_video_upload(page, timeout_seconds=180):
    start = time.time()
    while time.time() - start < timeout_seconds:
        try:
            upload_input = page.locator("input.upload-input")
            if await upload_input.count():
                preview = await upload_input.first.evaluate_handle("el => el.nextElementSibling")
                if preview:
                    stage = page.locator("div.stage")
                    stage_count = await stage.count()
                    for idx in range(stage_count):
                        text = await stage.nth(idx).inner_text()
                        if "上传成功" in text:
                            return True
        except Exception:
            pass
        await page.wait_for_timeout(1000)
    return False


async def collect_page_messages(page):
    try:
        messages = await page.evaluate(
            """
            () => {
              const selectors = [
                '.el-message', '.el-notification', '.ant-message', '.ant-notification',
                '.toast', '.toast-message', '[role=\"alert\"]', '.el-dialog__body',
                '.dialog', '.modal', '.ant-modal-body'
              ];
              const texts = [];
              selectors.forEach((selector) => {
                document.querySelectorAll(selector).forEach((el) => {
                  const text = (el.textContent || '').trim();
                  if (text && text.length < 200) texts.push(text);
                });
              });
              return Array.from(new Set(texts)).slice(0, 5);
            }
            """
        )
        return messages or []
    except Exception:
        return []


async def try_confirm_publish(page):
    selectors = [
        "button:has-text(\"确认发布\")",
        "button:has-text(\"确认\")",
        "button:has-text(\"继续\")",
        "button:has-text(\"知道了\")",
        "button:has-text(\"我知道了\")"
    ]
    for selector in selectors:
        locator = page.locator(selector)
        if await locator.count():
            try:
                if await locator.first.is_visible():
                    await locator.first.click()
                    await page.wait_for_timeout(800)
                    return True
            except Exception:
                continue
    return False


async def wait_for_publish_result(page, timeout_seconds=90):
    end_time = time.time() + timeout_seconds
    success_selectors = [
        "text=发布成功",
        "text=审核中",
        "text=发布完成",
        "text=发布成功，请稍后查看",
    ]
    error_keywords = [
        "发布失败", "失败", "错误", "验证码", "登录", "实名", "绑定",
        "超限", "限制", "标题最多", "内容不符合", "敏感", "违规"
    ]
    while time.time() < end_time:
        if re.search(r"/publish/success", page.url):
            return True
        for selector in success_selectors:
            if await page.locator(selector).count():
                return True
        messages = await collect_page_messages(page)
        if messages:
            print(f"PUBLISH_DEBUG: messages {messages}", file=sys.stderr)
            for msg in messages:
                if any(keyword in msg for keyword in error_keywords):
                    raise RuntimeError(f"publish failed: {msg}")
        await try_confirm_publish(page)
        await page.wait_for_timeout(1000)
    return False


def score_file_input(accept_value, is_multiple, note_type):
    accept_value = (accept_value or "").lower()
    has_video = "video" in accept_value or any(ext in accept_value for ext in ("mp4", "mov", "flv", "mkv", "rmvb", "m4v", "mpeg", "mpg", "ts"))
    has_image = "image" in accept_value or any(ext in accept_value for ext in ("jpg", "jpeg", "png", "gif", "webp", "heic"))

    if note_type == "video":
        score = 3 if has_video else (1 if not accept_value else 0)
        if has_image:
            score -= 2
        return score

    score = 3 if has_image else (1 if not accept_value else 0)
    if has_video:
        score -= 3
    if is_multiple:
        score += 1
    return score


async def collect_file_inputs(container, note_type):
    candidates = []
    locator = container.locator("input[type=\"file\"]")
    count = await locator.count()
    for idx in range(count):
        handle = locator.nth(idx)
        accept_value = await handle.evaluate("el => el.getAttribute('accept') || ''")
        is_multiple = await handle.evaluate("el => !!el.multiple")
        score = score_file_input(accept_value, is_multiple, note_type)
        candidates.append((score, handle, accept_value, is_multiple))
    return candidates


async def find_file_input(page, note_type):
    candidates = []
    candidates.extend(await collect_file_inputs(page, note_type))
    for frame in page.frames:
        candidates.extend(await collect_file_inputs(frame, note_type))
    if not candidates:
        return None
    best = max(candidates, key=lambda item: item[0])
    if best[0] < 0:
        return None
    return best[1], best[2], best[3]


async def get_input_info(handle, note_type):
    try:
        accept_value = await handle.evaluate("el => el.getAttribute('accept') || ''")
        is_multiple = await handle.evaluate("el => !!el.multiple")
    except Exception:
        return None
    score = score_file_input(accept_value, is_multiple, note_type)
    if score < 0:
        return None
    return handle, accept_value, is_multiple


async def find_file_input_by_selectors(container, selectors, note_type):
    for selector in selectors:
        locator = container.locator(selector)
        if await locator.count():
            info = await get_input_info(locator.first, note_type)
            if info:
                return info
    return None


async def wait_for_file_input(page, note_type, timeout_seconds=20):
    selectors = [
        "input.upload-input",
        "input[type=\"file\"][accept*=\".mp4\"]",
        "input[type=\"file\"][accept*=\"video\"]",
        "input[type=\"file\"][accept*=\"image\"]",
        "input[type=\"file\"]"
    ]
    start = time.time()
    while time.time() - start < timeout_seconds:
        file_input = await find_file_input_by_selectors(page, selectors, note_type)
        if file_input:
            return file_input
        for frame in page.frames:
            file_input = await find_file_input_by_selectors(frame, selectors, note_type)
            if file_input:
                return file_input
        file_input = await find_file_input(page, note_type)
        if file_input:
            return file_input
        await page.wait_for_timeout(500)
    return None


async def try_click_publish_tab(page, note_type):
    if note_type == "video":
        selectors = [
            "button:has-text(\"视频\")",
            "[role=\"tab\"]:has-text(\"视频\")",
            "[role=\"button\"]:has-text(\"视频\")",
            "text=发布视频",
            "text=视频"
        ]
    else:
        selectors = [
            ".creator-tab:has-text(\"上传图文\")",
            ".creator-tab:has-text(\"图文\")",
            "button:has-text(\"图文\")",
            "[role=\"tab\"]:has-text(\"图文\")",
            "[role=\"button\"]:has-text(\"图文\")",
            "text=上传图文",
            "text=图文笔记",
            "text=发布笔记",
            "text=笔记",
            "text=图文"
        ]
    for selector in selectors:
        locator = page.locator(selector)
        if await locator.count():
            try:
                await locator.first.click()
                await page.wait_for_timeout(1000)
                return True
            except Exception:
                continue
    return False


async def click_first_visible(page, selectors):
    for selector in selectors:
        locator = page.locator(selector)
        count = await locator.count()
        for idx in range(min(count, 5)):
            item = locator.nth(idx)
            try:
                if await item.is_visible():
                    await item.click()
                    await page.wait_for_timeout(800)
                    return True
            except Exception:
                continue
    return False


async def ensure_note_tab(page):
    selectors = [
        ".creator-tab:has-text(\"上传图文\")",
        ".creator-tab:has-text(\"图文\")",
        "[role=\"tab\"]:has-text(\"上传图文\")",
        "[role=\"tab\"]:has-text(\"图文\")",
        "button:has-text(\"上传图文\")",
        "button:has-text(\"图文\")",
        "text=上传图文",
        "text=发布笔记",
        "text=图文"
    ]
    clicked = await click_first_visible(page, selectors)
    if clicked:
        file_input = await wait_for_file_input(page, "note", timeout_seconds=8)
        if file_input:
            return True
    return False


async def log_upload_dom_state(page, label):
    try:
        info = await page.evaluate(
            """
            () => {
              const input = document.querySelector('input.upload-input');
              const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
              const uploadButton = document.querySelector('button.upload-button')
                || Array.from(document.querySelectorAll('button')).find(btn => (btn.textContent || '').includes('上传视频'));
              return {
                readyState: document.readyState,
                url: window.location.href,
                uploadInput: input ? input.outerHTML : null,
                uploadInputDisabled: input ? input.disabled : null,
                fileInputCount: fileInputs.length,
                hasUploadButton: !!uploadButton
              };
            }
            """
        )
        print(f"PUBLISH_DEBUG: dom_state {label} {info}", file=sys.stderr)
    except Exception as exc:
        print(f"PUBLISH_WARN: dom_state failed {label}: {exc}", file=sys.stderr)


async def log_file_inputs(container, label):
    try:
        info = await container.evaluate(
            """
            () => {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              const summary = (el) => ({
                id: el.id || null,
                name: el.name || null,
                className: el.className || '',
                accept: el.getAttribute('accept') || '',
                multiple: !!el.multiple,
                disabled: !!el.disabled,
                display: getComputedStyle(el).display,
                visibility: getComputedStyle(el).visibility,
                opacity: getComputedStyle(el).opacity,
                outerHTML: (el.outerHTML || '').slice(0, 300)
              });
              return {
                count: inputs.length,
                items: inputs.slice(0, 5).map(summary)
              };
            }
            """
        )
        print(f"PUBLISH_DEBUG: file_inputs {label} {info}", file=sys.stderr)
    except Exception as exc:
        print(f"PUBLISH_WARN: file_inputs failed {label}: {exc}", file=sys.stderr)


async def log_file_inputs_for_frames(page, label):
    await log_file_inputs(page, label)
    for frame in page.frames:
        if not frame.url or frame.url == page.url:
            continue
        await log_file_inputs(frame, f"{label} frame={frame.url}")


async def wait_for_input_enabled(container, selector, timeout_ms):
    try:
        await container.wait_for_function(
            "(sel) => { const el = document.querySelector(sel); return !!el && !el.disabled; }",
            selector,
            timeout=timeout_ms
        )
        return True
    except Exception:
        return False


async def try_open_publish_from_home(page, note_type):
    if note_type == "video":
        selectors = [
            "text=发布视频笔记",
            "text=发布视频",
            "button:has-text(\"发布视频笔记\")",
            "button:has-text(\"发布视频\")",
            "div:has-text(\"发布视频笔记\")",
            "div:has-text(\"发布视频\")",
        ]
    else:
        selectors = [
            "text=发布图文笔记",
            "text=发布笔记",
            "button:has-text(\"发布图文笔记\")",
            "button:has-text(\"发布笔记\")",
            "div:has-text(\"发布图文笔记\")",
            "div:has-text(\"发布笔记\")",
        ]
    for selector in selectors:
        locator = page.locator(selector)
        if await locator.count():
            try:
                await locator.first.click()
                await page.wait_for_timeout(1500)
                return True
            except Exception:
                continue
    return False


async def wait_for_publish_page(page, timeout_ms=15000):
    try:
        await page.wait_for_url(re.compile(r"/publish/publish"), timeout=timeout_ms)
    except Exception:
        pass
    return "/publish/publish" in page.url


async def try_file_chooser_upload(page, selectors, media_files):
    for selector in selectors:
        locator = page.locator(selector)
        if not await locator.count():
            continue
        try:
            async with page.expect_file_chooser(timeout=5000) as fc_info:
                await locator.first.click()
            chooser = await fc_info.value
            files = media_files
            if not chooser.is_multiple and media_files:
                files = [media_files[0]]
            await chooser.set_files(files)
            return True
        except Exception:
            continue
    return False


async def perform_upload(page, media_files, note_type):
    timeout_seconds = 60 if note_type == "video" else 20
    if note_type == "video":
        await log_upload_dom_state(page, "before_video_upload")
        await log_file_inputs_for_frames(page, "before_video_upload")
        selectors = [
            "#creator-publish-dom input.upload-input",
            "input.upload-input"
        ]
        last_exc = None
        for selector in selectors:
            try:
                handle = await page.wait_for_selector(selector, state="attached", timeout=timeout_seconds * 1000)
                if handle:
                    await wait_for_input_enabled(page, selector, timeout_ms=5000)
                    await handle.set_input_files(media_files[0])
                    return True
            except Exception as exc:
                last_exc = exc
                continue
        for frame in page.frames:
            for selector in selectors:
                try:
                    handle = await frame.wait_for_selector(selector, state="attached", timeout=timeout_seconds * 1000)
                    if handle:
                        await wait_for_input_enabled(frame, selector, timeout_ms=5000)
                        await handle.set_input_files(media_files[0])
                        return True
                except Exception as exc:
                    last_exc = exc
                    continue
        upload_button_selectors = [
            "button.upload-button",
            "button:has-text(\"上传视频\")",
            "text=上传视频"
        ]
        for selector in upload_button_selectors:
            try:
                button = await page.wait_for_selector(selector, state="attached", timeout=timeout_seconds * 1000)
                if not button:
                    continue
                async with page.expect_file_chooser(timeout=5000) as fc_info:
                    await button.click()
                chooser = await fc_info.value
                await chooser.set_files(media_files[0])
                return True
            except Exception as exc:
                last_exc = exc
                continue
        await log_upload_dom_state(page, "after_video_upload")
        await log_file_inputs_for_frames(page, "after_video_upload")
        if last_exc:
            print(f"PUBLISH_WARN: direct upload-input failed: {last_exc}", file=sys.stderr)
    else:
        await log_upload_dom_state(page, "before_note_upload")
        await log_file_inputs_for_frames(page, "before_note_upload")
    file_input_info = await wait_for_file_input(page, note_type, timeout_seconds=timeout_seconds)
    if file_input_info:
        file_input, accept_value, is_multiple = file_input_info
        if note_type == "video":
            await file_input.set_input_files([media_files[0]])
            return True
        if is_multiple:
            await file_input.set_input_files(media_files)
            return True
        await file_input.set_input_files([media_files[0]])
        remaining = media_files[1:]
        if remaining:
            add_selectors = [
                "button:has-text(\"添加\")",
                "[role=\"button\"]:has-text(\"添加\")",
                "text=添加图片",
                "text=继续添加",
                "text=上传图片",
                "text=点击上传",
                "text=选择文件",
            ]
            for file_path in remaining:
                success = await try_file_chooser_upload(page, add_selectors, [file_path])
                if not success:
                    break
        return True

    upload_selectors = [
        "input[type=\"file\"]",
        "input.upload-input",
        "[data-testid*=\"upload\"]",
        "[class*=\"upload\"]",
        "[role=\"button\"]:has-text(\"上传\")",
        "button:has-text(\"上传\")",
        "text=点击上传",
        "text=上传图片",
        "text=上传视频",
        "text=选择文件",
    ]
    if await try_file_chooser_upload(page, upload_selectors, media_files):
        return True
    if note_type == "video":
        fallback_input = page.locator("input[type=\"file\"]")
        if await fallback_input.count():
            try:
                await fallback_input.first.set_input_files([media_files[0]])
                return True
            except Exception as exc:
                print(f"PUBLISH_WARN: fallback file input failed: {exc}", file=sys.stderr)
    else:
        await log_upload_dom_state(page, "after_note_upload")
        await log_file_inputs_for_frames(page, "after_note_upload")
    return False


async def dump_publish_debug(page, base_dir):
    timestamp = int(time.time())
    html_path = Path(base_dir) / f"publish_debug_{timestamp}.html"
    png_path = Path(base_dir) / f"publish_debug_{timestamp}.png"
    try:
        html_path.write_text(await page.content(), encoding="utf-8")
    except Exception:
        pass
    try:
        await page.screenshot(path=str(png_path), full_page=True)
    except Exception:
        pass
    return html_path, png_path


async def publish(payload):
    cookie = os.environ.get("XHS_COOKIE", "").strip()
    if not cookie:
        raise RuntimeError("XHS_COOKIE is required")

    title = payload.get("title", "").strip()
    content = payload.get("content", "").strip()
    tags = normalize_tags(payload.get("tags"))
    note_type = payload.get("noteType") or ("video" if payload.get("videoUrl") else "note")
    source_url = payload.get("sourceUrl") or "https://www.xiaohongshu.com/"

    log_step(f"start note_type={note_type}")

    base_dir = Path(payload.get("workDir") or Path(__file__).resolve().parent.parent / "data" / "publish")
    base_dir.mkdir(parents=True, exist_ok=True)

    # Rate limiting check (learned from xiaohongshu-mcp)
    can_publish, reason = check_rate_limit(base_dir)
    if not can_publish:
        raise RuntimeError(f"发布频率限制: {reason}")

    # Cookie file path for persistence
    cookie_file_path = get_cookie_file_path(base_dir)

    download_dir = Path(tempfile.mkdtemp(prefix="xhs_publish_", dir=base_dir))

    media_requests = []
    if note_type == "video":
        video_url = payload.get("videoUrl")
        if not video_url:
            raise RuntimeError("videoUrl missing for video publish")
        filename = safe_filename(video_url, "video.mp4")
        media_requests.append(("video", video_url, filename))
    else:
        images = payload.get("images") or []
        if not images:
            raise RuntimeError("images missing for note publish")
        for index, url in enumerate(images, start=1):
            filename = safe_filename(url, f"image_{index}.jpg")
            media_requests.append(("image", url, filename))

    headless = os.environ.get("XHS_HEADLESS", "false").lower() in ("1", "true", "yes")

    # Anti-detection: Browser launch arguments
    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
        "--disable-extensions",
    ]

    # Proxy support
    proxy_url = os.environ.get("XHS_PROXY_URL", "").strip()

    async with async_playwright() as playwright:
        browser = None
        try:
            browser = await playwright.chromium.launch(
                headless=headless,
                channel="chrome",
                args=launch_args
            )
        except Exception:
            browser = await playwright.chromium.launch(
                headless=headless,
                args=launch_args
            )

        context_options = {
            "viewport": {"width": 1600, "height": 900},
            "user_agent": DEFAULT_UA,
            "locale": "zh-CN",
            "timezone_id": "Asia/Shanghai",
        }
        if proxy_url:
            context_options["proxy"] = {"server": proxy_url}
            log_step(f"using proxy: {proxy_url}")

        context = await browser.new_context(**context_options)
        await context.add_cookies(parse_cookie(cookie))

        log_step(f"download media count={len(media_requests)}")
        download_start = time.perf_counter()
        media_files = await download_media_files(context, media_requests, download_dir, source_url, cookie)
        log_step(f"download complete in {time.perf_counter() - download_start:.1f}s")

        page = await context.new_page()

        # Anti-detection: Apply playwright-stealth
        if STEALTH_MODE and HAS_STEALTH:
            log_step("applying stealth mode")
            await stealth_async(page)

        target = "video" if note_type == "video" else "note"
        publish_url = f"https://creator.xiaohongshu.com/publish/publish?from=homepage&target={target}"
        log_step(f"open publish page target={target}")
        page_start = time.perf_counter()
        await page.goto(publish_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass

        # Anti-detection: Simulate human reading behavior
        await human_delay(1500, 3000)
        log_step(f"publish page loaded in {time.perf_counter() - page_start:.1f}s")
        if "login" in page.url or await page.locator("text=手机号登录").count():
            raise RuntimeError("cookie invalid or expired for creator platform")
        if "/new/home" in page.url or "/home" in page.url:
            opened = await try_open_publish_from_home(page, note_type)
            if opened:
                await wait_for_publish_page(page)
        await try_click_publish_tab(page, note_type)
        if "/new/home" in page.url or "/home" in page.url:
            opened = await try_open_publish_from_home(page, note_type)
            if opened:
                await wait_for_publish_page(page)
        if note_type == "note":
            if "target=video" in page.url:
                log_step("force note publish url")
                await page.goto(
                    "https://creator.xiaohongshu.com/publish/publish?from=menu&target=note",
                    wait_until="domcontentloaded"
                )
                try:
                    await page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    pass
                await page.wait_for_timeout(1500)
            log_step("ensure note tab")
            await ensure_note_tab(page)

        # Upload media
        log_step("uploading media")
        upload_start = time.perf_counter()
        uploaded = await perform_upload(page, media_files, note_type)
        log_step(f"upload attempt done in {time.perf_counter() - upload_start:.1f}s")
        if not uploaded:
            fallback_url = f"https://creator.xiaohongshu.com/publish/publish?from=menu&target={target}"
            if page.url != fallback_url:
                log_step("upload retry on fallback publish page")
                await page.goto(fallback_url, wait_until="domcontentloaded")
                try:
                    await page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    pass
                await page.wait_for_timeout(2000)
                if "login" in page.url or await page.locator("text=手机号登录").count():
                    raise RuntimeError("cookie invalid or expired for creator platform")
                await try_click_publish_tab(page, note_type)
                if "/new/home" in page.url or "/home" in page.url:
                    opened = await try_open_publish_from_home(page, note_type)
                    if opened:
                        await wait_for_publish_page(page)
                if note_type == "note":
                    if "target=video" in page.url:
                        log_step("force note publish url (retry)")
                        await page.goto(
                            "https://creator.xiaohongshu.com/publish/publish?from=menu&target=note",
                            wait_until="domcontentloaded"
                        )
                        try:
                            await page.wait_for_load_state("networkidle", timeout=10000)
                        except Exception:
                            pass
                        await page.wait_for_timeout(1500)
                    log_step("ensure note tab (retry)")
                    await ensure_note_tab(page)
                upload_start = time.perf_counter()
                uploaded = await perform_upload(page, media_files, note_type)
                log_step(f"upload retry done in {time.perf_counter() - upload_start:.1f}s")

        if not uploaded:
            html_path, png_path = await dump_publish_debug(page, base_dir)
            frame_urls = [frame.url for frame in page.frames if frame.url]
            print(
                f"PUBLISH_DEBUG: file input not found; url={page.url}; frames={frame_urls}; "
                f"html={html_path}; screenshot={png_path}",
                file=sys.stderr
            )
            raise RuntimeError("file input not found on publish page")

        log_step("upload done")
        if note_type == "video":
            await wait_video_upload(page)
        else:
            await page.wait_for_timeout(5000)

        # Anti-detection: Add delay before filling content
        await human_delay(1000, 2500)

        # Fill title and content
        log_step("fill title and content")
        await fill_first_selector(
            page,
            [
                "div.plugin.title-container input.d-text",
                "input[placeholder*=\"标题\"]",
                "textarea[placeholder*=\"标题\"]",
                "input.d-text"
            ],
            title[:20]
        )

        # Anti-detection: Add delay between title and content
        await human_delay(800, 1800)

        await type_in_editor(
            page,
            [".ql-editor", "[contenteditable=\"true\"]"],
            content,
            tags
        )

        # Anti-detection: Add delay before clicking publish
        await human_delay(1500, 3500)

        log_step("click publish")
        publish_button = page.locator("button:has-text(\"发布\")")
        if await publish_button.count():
            await publish_button.first.click()
        else:
            raise RuntimeError("publish button not found")

        log_step("wait for publish result")
        publish_start = time.perf_counter()
        published = await wait_for_publish_result(page, timeout_seconds=90)
        if not published:
            html_path, png_path = await dump_publish_debug(page, base_dir)
            raise RuntimeError(
                "publish result timeout after "
                f"{time.perf_counter() - publish_start:.1f}s; "
                f"html={html_path}; screenshot={png_path}"
            )
        log_step(f"publish success in {time.perf_counter() - publish_start:.1f}s")

        # Save cookies for persistence (learned from xiaohongshu-mcp)
        await save_context_cookies(context, cookie_file_path)

        # Record this publish for rate limiting
        record_publish(base_dir, title)

        await context.close()
        await browser.close()

    return True


def main():
    args = parse_args()
    payload_path = Path(args.payload)
    if not payload_path.exists():
        raise RuntimeError("payload not found")
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    os.environ.setdefault("XHS_COOKIE", "")

    try:
        import asyncio
        asyncio.run(publish(payload))
        print("PUBLISH_OK")
    except Exception as exc:
        print(f"PUBLISH_FAILED: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
