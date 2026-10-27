import contextlib
import os
import json
import ctypes
import string
from pygame import key
import pygame
from . import consts
from .speech import speak


def _build_us_scan_tables():
    key_to_scan = {}
    for i, ch in enumerate(string.ascii_lowercase):
        key_to_scan[ord(ch)] = 4 + i
    for i, ch in enumerate("1234567890"):
        key_to_scan[ord(ch)] = 30 + i
    named = [
        (pygame.K_RETURN, 40), (pygame.K_ESCAPE, 41), (pygame.K_BACKSPACE, 42),
        (pygame.K_TAB, 43), (pygame.K_SPACE, 44), (pygame.K_MINUS, 45),
        (pygame.K_EQUALS, 46), (pygame.K_LEFTBRACKET, 47), (pygame.K_RIGHTBRACKET, 48),
        (pygame.K_BACKSLASH, 49), (pygame.K_SEMICOLON, 51), (pygame.K_QUOTE, 52),
        (pygame.K_BACKQUOTE, 53), (pygame.K_COMMA, 54), (pygame.K_PERIOD, 55),
        (pygame.K_SLASH, 56),
        (pygame.K_F1, 58), (pygame.K_F2, 59), (pygame.K_F3, 60), (pygame.K_F4, 61),
        (pygame.K_F5, 62), (pygame.K_F6, 63), (pygame.K_F7, 64), (pygame.K_F8, 65),
        (pygame.K_F9, 66), (pygame.K_F10, 67), (pygame.K_F11, 68), (pygame.K_F12, 69),
        (pygame.K_INSERT, 73), (pygame.K_HOME, 74), (pygame.K_PAGEUP, 75),
        (pygame.K_DELETE, 76), (pygame.K_END, 77), (pygame.K_PAGEDOWN, 78),
        (pygame.K_RIGHT, 79), (pygame.K_LEFT, 80), (pygame.K_DOWN, 81), (pygame.K_UP, 82),
        (pygame.K_LCTRL, 224), (pygame.K_LSHIFT, 225), (pygame.K_LALT, 226),
        (pygame.K_RCTRL, 228), (pygame.K_RSHIFT, 229), (pygame.K_RALT, 230),
    ]
    for k, s in named:
        key_to_scan[k] = s
    scan_to_key = {s: k for k, s in key_to_scan.items()}
    return key_to_scan, scan_to_key


US_KEY_TO_SCAN, SCAN_TO_US_KEY = _build_us_scan_tables()


class ScanState:
    """polls the physical keyboard state by scancode (layout independent)."""

    def __init__(self):
        self.fn = None
        candidates = ["SDL2.dll"]
        with contextlib.suppress(Exception):
            candidates.append(os.path.join(os.path.dirname(pygame.__file__), "SDL2.dll"))
        for path in candidates:
            try:
                dll = ctypes.CDLL(path)
                fn = dll.SDL_GetKeyboardState
                fn.restype = ctypes.POINTER(ctypes.c_uint8)
                fn.argtypes = [ctypes.POINTER(ctypes.c_int)]
                self.fn = fn
                break
            except (OSError, AttributeError):
                continue

    def available(self):
        return self.fn is not None

    def pressed(self, scancode):
        if self.fn is None:
            return False
        return bool(self.fn(None)[scancode])


class Keyconfig:
    def __init__(self, file="keyconfig.json"):
        self.file = file
        self.keys = {}
        self.scan_state = ScanState()
        self.load()

    def load(self):
        with contextlib.suppress(FileNotFoundError):
            path = self.file if os.path.exists(self.file) else os.path.join(consts.BASE_DIR, "default_keyconfig.json")
            with open(path, "rb") as f:
                keys = json.loads(f.read())
                for k, v in keys.items():
                    try:
                        try:
                            key_code = int(k.strip())
                        except ValueError:
                            key_code = key.key_code(k.strip())
                        self.keys[v.strip()] = key_code
                    except ValueError:
                        speak(f"Invalid key string for {v}: {k}. Using default.")

    def save(self):
        keys = {str(v): k for k, v in self.keys.items()}
        with open(self.file, "wb") as f:
            data = json.dumps(keys, indent=4).encode("utf-8", "ignore")
            f.write(data)

    def get(self, func, default):
        """returns the key constant asociated with {func}. if that key is not set, return {default}."""
        return self.keys.get(func, default)

    def set(self, k, func, autosave=True):
        """takes a key constant as {k} and a function string as {func} and sets that in the keyconfig. if autosave = True (default), saves the current key configuration to the file automaticly after setting."""
        self.keys[func] = k
        if autosave:
            self.save()

    def us_scancode(self, keycode):
        """returns the US-layout physical scancode for {keycode}, or None."""
        return US_KEY_TO_SCAN.get(keycode)

    def us_key_for(self, event):
        """returns the US-layout key constant for the physical key that generated {event}, no matter the system keyboard layout."""
        return SCAN_TO_US_KEY.get(getattr(event, "scancode", None), event.key)
