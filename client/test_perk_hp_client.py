import sys
sys.path.insert(0, ".")
from libs.event_handeler import EventHandeler


class FakePlayer:
    lock_weapon = False
    max_hp = 100
    _hp = 100

    @property
    def hp(self):
        return self._hp

    @hp.setter
    def hp(self, value):
        if self.lock_weapon:
            return
        self._hp = value if 0 <= value <= self.max_hp else self._hp


class FakeGameplay:
    def __init__(self):
        self.player = FakePlayer()
        self.running = False


eh = EventHandeler.__new__(EventHandeler)
eh.gameplay = FakeGameplay()

assert eh.gameplay.player.hp == 100
eh.set_hp({"amount": 650, "max": 650})
assert eh.gameplay.player.max_hp == 650, eh.gameplay.player.max_hp
assert eh.gameplay.player.hp == 650, eh.gameplay.player.hp

# amount > max stays clamped at max
eh.set_hp({"amount": 999, "max": 650})
assert eh.gameplay.player.hp == 650, eh.gameplay.player.hp

# old servers that don't send max: clamp still works at 100
eh2 = EventHandeler.__new__(EventHandeler)
eh2.gameplay = FakeGameplay()
eh2.set_hp({"amount": 650})
assert eh2.gameplay.player.max_hp == 100, eh2.gameplay.player.max_hp
assert eh2.gameplay.player.hp == 100, eh2.gameplay.player.hp

# perk flag handlers (real methods on the real class)
eh.gameplay.player.walktime = 270
eh.gameplay.player.runtime = 184
eh.gameplay.player.movetime = 270
eh.gameplay.running = False

eh.staminup({"value": True})
assert eh.gameplay.player.staminup is True
assert eh.gameplay.player.walktime == 230, eh.gameplay.player.walktime
assert eh.gameplay.player.runtime == 155, eh.gameplay.player.runtime
assert eh.gameplay.player.movetime == 230, eh.gameplay.player.movetime

eh.gameplay.running = True
eh.staminup({"value": True})
assert eh.gameplay.player.movetime == 155, eh.gameplay.player.movetime

eh.staminup({"value": False})
assert eh.gameplay.player.staminup is False
assert eh.gameplay.player.walktime == 270, eh.gameplay.player.walktime
assert eh.gameplay.player.runtime == 184, eh.gameplay.player.runtime

eh.double_tap_root_beer({"value": True})
assert eh.gameplay.player.double_tap_root_beer is True

eh.speed_cola({"value": True})
assert eh.gameplay.player.speed_cola is True

eh.double_tap_root_beer({"value": False})
eh.speed_cola({"value": False})
assert eh.gameplay.player.double_tap_root_beer is False
assert eh.gameplay.player.speed_cola is False

print("set_hp handler OK: max_hp propagated and clamped correctly")
print("perk handlers OK: staminup/speed_cola/double_tap flags set correctly")
