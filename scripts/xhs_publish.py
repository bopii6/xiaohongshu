import argparse
import json
import os
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

from playwright.async_api import async_playwright

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


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
            "button:has-text(\"图文\")",
            "[role=\"tab\"]:has-text(\"图文\")",
            "[role=\"button\"]:has-text(\"图文\")",
            "text=图文笔记",
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
    timeout_seconds = 25 if note_type == "video" else 15
    if note_type == "video":
        try:
            await page.wait_for_function(
                "() => !!document.querySelector('input.upload-input')",
                timeout=timeout_seconds * 1000
            )
            handle = await page.query_selector("input.upload-input")
            if handle:
                await handle.set_input_files(media_files[0])
                return True
        except Exception as exc:
            try:
                count = await page.evaluate("document.querySelectorAll('input[type=file]').length")
                print(f"PUBLISH_DEBUG: file input count in DOM={count}", file=sys.stderr)
            except Exception:
                pass
            print(f"PUBLISH_WARN: direct upload-input failed: {exc}", file=sys.stderr)
            pass
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

    base_dir = Path(payload.get("workDir") or Path(__file__).resolve().parent.parent / "data" / "publish")
    base_dir.mkdir(parents=True, exist_ok=True)
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

    async with async_playwright() as playwright:
        browser = None
        try:
            browser = await playwright.chromium.launch(headless=headless, channel="chrome")
        except Exception:
            browser = await playwright.chromium.launch(headless=headless)

        context = await browser.new_context(
            viewport={"width": 1600, "height": 900},
            user_agent=DEFAULT_UA,
        )
        await context.add_cookies(parse_cookie(cookie))

        media_files = []
        for kind, url, filename in media_requests:
            dest_path = download_dir / filename
            if kind == "video":
                download_file(url, dest_path, referer=source_url, cookie=cookie)
            else:
                try:
                    await download_with_context(context, url, dest_path, referer=source_url, cookie=cookie)
                except Exception as exc:
                    print(f"PUBLISH_WARN: context download failed for {url} ({exc}), fallback to urllib", file=sys.stderr)
                    download_file(url, dest_path, referer=source_url, cookie=cookie)
            media_files.append(str(dest_path))

        page = await context.new_page()
        target = "video" if note_type == "video" else "note"
        publish_url = f"https://creator.xiaohongshu.com/publish/publish?from=homepage&target={target}"
        await page.goto(publish_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        await page.wait_for_timeout(2000)
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

        # Upload media
        uploaded = await perform_upload(page, media_files, note_type)
        if not uploaded:
            fallback_url = "https://creator.xiaohongshu.com/publish/publish"
            if page.url != fallback_url:
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
                uploaded = await perform_upload(page, media_files, note_type)

        if not uploaded:
            html_path, png_path = await dump_publish_debug(page, base_dir)
            frame_urls = [frame.url for frame in page.frames if frame.url]
            print(
                f"PUBLISH_DEBUG: file input not found; url={page.url}; frames={frame_urls}; "
                f"html={html_path}; screenshot={png_path}",
                file=sys.stderr
            )
            raise RuntimeError("file input not found on publish page")

        if note_type == "video":
            await wait_video_upload(page)
        else:
            await page.wait_for_timeout(5000)

        # Fill title and content
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

        await type_in_editor(
            page,
            [".ql-editor", "[contenteditable=\"true\"]"],
            content,
            tags
        )

        publish_button = page.locator("button:has-text(\"发布\")")
        if await publish_button.count():
            await publish_button.first.click()
        else:
            raise RuntimeError("publish button not found")

        await page.wait_for_url(re.compile(r"/publish/success"), timeout=60000)

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
