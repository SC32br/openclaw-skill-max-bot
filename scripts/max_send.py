#!/usr/bin/env python3
"""
max_send.py — Send a message to a MAX chat or channel via MAX Bot API.

Usage:
    python3 max_send.py --token TOKEN --chat CHAT_ID --text "Hello!"
    MAX_TOKEN=xxx python3 max_send.py --chat 123456 --text "Hello!"

Environment:
    MAX_TOKEN — bot token (alternative to --token)
"""

import argparse
import json
import os
import sys
import urllib.request

MAX_API = "https://platform-api.max.ru"


def send_message(token: str, chat_id: str, text: str) -> dict:
    url = f"{MAX_API}/messages?chat_id={chat_id}"
    payload = json.dumps({"text": text[:4096]}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": token,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_typing(token: str, chat_id: str) -> None:
    url = f"{MAX_API}/chats/{chat_id}/actions"
    payload = json.dumps({"action": "typing_on"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": token,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5):
            pass
    except Exception:
        pass  # typing is best-effort


def get_me(token: str) -> dict:
    req = urllib.request.Request(
        f"{MAX_API}/me",
        headers={"Authorization": token},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="Send message via MAX Bot API")
    parser.add_argument("--token", default=os.environ.get("MAX_TOKEN"), help="Bot token")
    parser.add_argument("--chat", required=True, help="Chat or channel ID")
    parser.add_argument("--text", required=True, help="Message text (max 4096 chars)")
    parser.add_argument("--typing", action="store_true", help="Send typing indicator first")
    parser.add_argument("--whoami", action="store_true", help="Print bot info and exit")
    args = parser.parse_args()

    if not args.token:
        print("ERROR: --token or MAX_TOKEN env var required", file=sys.stderr)
        sys.exit(1)

    if args.whoami:
        info = get_me(args.token)
        print(json.dumps(info, ensure_ascii=False, indent=2))
        return

    if args.typing:
        send_typing(args.token, args.chat)

    result = send_message(args.token, args.chat, args.text)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
