import sys
sys.path.insert(0, ".")
from libs.clock import Clock
from libs.weapons.weapon import weapon


class FakeClock(Clock):
    def __init__(self, elapsed=999999):
        super().__init__()
        self.elapsed = elapsed


class FakeNet:
    def __init__(self):
        self.sent = []

    def send(self, ch, ev, data=None, reliable=True):
        self.sent.append((ch, ev, data))


class FakeAudioMngr:
    def load_buffer(self, path):
        class B:
            sec_length = 1.0 if "speed_reload" in path else 2.0
        return B()

    def play_unbound(self, *a, **k):
        pass


class FakeGame:
    def __init__(self):
        self.network = FakeNet()
        self.audio_mngr = FakeAudioMngr()
        self.locked_ms = []

    def new_clock(self):
        return FakeClock()

    def call_after(self, ms, fn):
        self.locked_ms.append(ms)


class FakeMap:
    def get_tile_at(self, x, y, z):
        return "floor"


class FakePlayer:
    double_tap_root_beer = False
    speed_cola = False
    staminup = False
    map = FakeMap()

    def __init__(self):
        self.x = self.y = self.z = 0

    def play_sound(self, *a, **k):
        pass


game = FakeGame()
player = FakePlayer()
gp = type("GP", (), {"player": player})()

w = weapon(
    game, gp, "M1911",
    fire_time=1000, reload_time=-1,
    max_ammo=12, max_reserved_ammo=24,
    ammo=0, reserved_ammo=24,
)

# --- speed_cola: reload lock time halves ---
assert w.reload_time == 2000, w.reload_time
assert w.speed_reload_time == 1000, w.speed_reload_time
w.reload()
assert game.locked_ms and game.locked_ms[-1] == 2000, game.locked_ms
game.locked_ms.clear()
w.locked = False
w.reload_clock.elapsed = 999999
w.ammo = 0
w.reserved_ammo = 24
player.speed_cola = True
w.reload()
assert game.locked_ms and game.locked_ms[-1] == 1000, game.locked_ms
print("speed_cola reload lock OK: 2000 -> 1000 ms")

# --- double tap: fire_time halves ---
w2 = weapon(game, gp, "M1911", fire_time=1000, reload_time=2000, max_ammo=12, max_reserved_ammo=24, ammo=6, reserved_ammo=24)
w2.fire_clock = FakeClock(600)  # 600ms since last shot
player.double_tap_root_beer = False
w2.fire()
fired_normal = any(e == "weapon_fire" for _, e, _ in game.network.sent)
game.network.sent.clear()
w2.fire_clock = FakeClock(600)
player.double_tap_root_beer = True
w2.fire()
fired_dt = any(e == "weapon_fire" for _, e, _ in game.network.sent)
assert not fired_normal, "without double tap, 600ms < 1000ms must NOT fire"
assert fired_dt, "with double tap, 600ms >= 500ms MUST fire"
print("double_tap fire time OK: 1000 -> 500 ms")

print("ALL CLIENT WEAPON PERK LOGIC OK")
