import os
import pyperclip

buffers = []
bufferindex = 0

class buffer:
    def __init__(self, name, permanent=False, cap=500):
        self.name = name
        self.items = []
        self.index = 0
        self.muted = False
        self.permanent = permanent
        self.cap = cap

    def speak_item(self):
        from .speech import speak as tts
        if self.items:
            tts(self.items[self.index].format_text(), False, id=f'buffer_{self.name}')

class buffer_item:
    def __init__(self, text):
        self.text = text

    def format_text(self):
        return self.text

def get_or_create(name, cap=500):
    for b in buffers:
        if b.name == name:
            return b
    b = buffer(name, name == "general", cap)
    buffers.append(b)
    return b

def append_item(buf, text):
    was_last = len(buf.items) == 0 or buf.index >= len(buf.items) - 1
    item = buffer_item(text)
    buf.items.append(item)
    if was_last:
        buf.index = len(buf.items) - 1
    if len(buf.items) > buf.cap:
        overflow = len(buf.items) - buf.cap
        del buf.items[:overflow]
        buf.index = max(0, buf.index - overflow)
    return item

def add_item(game, name, text, speak=True, sound="", mirror=True):
    buf = get_or_create(name)
    append_item(buf, text)
    if mirror and name != "general":
        append_item(get_or_create("general", 1000), text)
    if sound:
        game.direct_soundgroup.play(sound)

def cycle_item(dir):
    if not buffers:
        return
    buf = buffers[bufferindex]
    if not buf.items:
        return
    if dir == 1:
        buf.index = min(buf.index + 1, len(buf.items) - 1)
    elif dir == 2:
        buf.index = max(buf.index - 1, 0)
    elif dir == 3:
        buf.index = 0
    elif dir == 4:
        buf.index = len(buf.items) - 1
    buf.speak_item()

def cycle(dir):
    global bufferindex
    if not buffers:
        return
    if dir == 1:
        bufferindex = (bufferindex + 1) % len(buffers)
    elif dir == 2:
        bufferindex = (bufferindex - 1) % len(buffers)
    elif dir == 3:
        bufferindex = (bufferindex + 5) % len(buffers)
    elif dir == 4:
        bufferindex = (bufferindex - 5) % len(buffers)
    bufferindex = min(bufferindex, len(buffers) - 1)
    buf = buffers[bufferindex]
    from .speech import speak as tts
    tts(f"Buffer {buf.name}, {len(buf.items)} items", False)

def toggle_mute():
    if buffers:
        buf = buffers[bufferindex]
        buf.muted = not buf.muted
        from .speech import speak as tts
        tts(f"{'Muted' if buf.muted else 'Unmuted'} buffer {buf.name}", False)

def toggle_interrupt():
    pass

def move(dir):
    cycle_item(dir)

def copy_item():
    if buffers and buffers[bufferindex].items:
        text = buffers[bufferindex].items[buffers[bufferindex].index].text
        pyperclip.copy(text)
        from .speech import speak as tts
        tts("Copied to clipboard", False)

def speak_total_item_count():
    total = sum(len(b.items) for b in buffers)
    from .speech import speak as tts
    tts(f"Total buffer items: {total}", False)

def get_current_links():
    if not buffers:
        return []
    buf = buffers[bufferindex]
    if not buf.items:
        return []
    item = buf.items[buf.index]
    links = []
    for word in item.text.split():
        if word.startswith(("http://", "https://")):
            links.append({"url": word, "title": word})
    return links

def format_url(item, short=False):
    url = item.get("url", "")
    if short and len(url) > 60:
        return url[:57] + "..."
    return url

def remove_buffer():
    global bufferindex
    if buffers:
        buf = buffers[bufferindex]
        if buf.permanent:
            from .speech import speak as tts
            tts(f"Buffer {buf.name} can't be removed", False)
            return
        buffers.pop(bufferindex)
        bufferindex = min(bufferindex, max(0, len(buffers) - 1))
        from .speech import speak as tts
        tts(f"Removed buffer {buf.name}", False)

def export_buffers():
    from . import consts
    path = os.path.join(consts.BASE_DIR, "buffers.txt")
    try:
        with open(path, "w", encoding="utf-8") as f:
            for buf in buffers:
                f.write(f"=== {buf.name} ===\n")
                for item in buf.items:
                    f.write(f"{item.text}\n")
                f.write("\n")
        from .speech import speak as tts
        tts("Buffers exported", False)
    except Exception as e:
        from .speech import speak as tts
        tts(f"Failed to export buffers: {e}", False)

def add_buffer(*args):
    if args:
        name = args[0]
        permanent = args[1] if len(args) > 1 else False
        cap = args[2] if len(args) > 2 else 500
        buffers.append(buffer(name, permanent, cap))

get_or_create("general", 1000)
