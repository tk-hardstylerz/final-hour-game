import os
import shutil
import random
import time


def random_item(dir):
    """return a random item (a folder or a ffile) given a folder path.
    if the path given doesnt lead to a folder, returns the given path"""
    try: return f"{dir}/{random.choice(os.listdir(dir))}" if os.path.isdir(dir) else dir
    except IndexError as e: 
        print(e)
        return ""


def copy_folder(src, dst, retries=10, retry_delay=0.5, log_file=None):
    """
    Copy all files and folders from src to dst, overwriting existing files and folders in dst.
    Retries files that fail with PermissionError (temporary Windows locks) before giving up.
    """
    if not src.endswith("/") and not src.endswith("\\"):
        src = src + "/"
    if not dst.endswith("/") and not dst.endswith("\\"):
        dst = dst + "/"

    def log(message):
        print(message)
        if log_file:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(message + "\n")

    for src_dir, dirs, files in os.walk(src):
        dst_dir = src_dir.replace(src, dst, 1)
        if not os.path.exists(dst_dir):
            os.makedirs(dst_dir)
        for file_ in files:
            src_file = os.path.join(src_dir, file_)
            dst_file = os.path.join(dst_dir, file_)
            for attempt in range(retries + 1):
                try:
                    if os.path.exists(dst_file):
                        try:
                            if os.path.samefile(src_file, dst_file):
                                break
                        except (OSError, ValueError):
                            pass
                        os.remove(dst_file)
                    shutil.copy(src_file, dst_dir)
                    break
                except PermissionError as e:
                    if attempt >= retries:
                        log(f"copy failed after {retries} retries: {src_file} -> {dst_file}: {e}")
                    else:
                        time.sleep(retry_delay)
                except Exception as e:
                    log(f"copy failed: {src_file} -> {dst_file}: {e}")
                    break
