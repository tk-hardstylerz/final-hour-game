import contextlib
import os
import json
from pygame import key
from . import consts
from .speech import speak


class Keyconfig:
    def __init__(self, file="keyconfig.json"):
        self.file = file
        self.keys = {}
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
