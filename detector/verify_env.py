import sys
import importlib.util
import subprocess
import socket

def check_python_version():
    return sys.version_info >= (3, 10)

def check_opencv():
    try:
        import cv2
        # Ensure we loaded headless or standard, standard has GUI elements we don't care about but we need cv2
        return True
    except ImportError:
        return False

def check_ultralytics():
    return importlib.util.find_spec("ultralytics") is not None

def check_torch():
    return importlib.util.find_spec("torch") is not None

def check_mps():
    try:
        import torch
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return True
        return False
    except ImportError:
        return False

def check_cuda():
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False

def check_ytdlp():
    return importlib.util.find_spec("yt_dlp") is not None or subprocess.run(["yt-dlp", "--version"], capture_output=True).returncode == 0

def check_ffmpeg():
    try:
        resultado = subprocess.run(["ffmpeg", "-version"], capture_output=True)
        return resultado.returncode == 0
    except Exception:
        return False

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

def check_port_5001():
    return check_port(5001)

def check_nextjs():
    # If Next.js is running, port 3000 should NOT be free
    return not check_port(3000)

if __name__ == "__main__":
    checks = [
        ("Python >= 3.10", check_python_version),
        ("opencv-python-headless installed", check_opencv),
        ("ultralytics installed", check_ultralytics),
        ("torch available", check_torch),
        ("MPS available (Apple Silicon)", check_mps, True),   # non-fatal
        ("CUDA available", check_cuda, True),                  # non-fatal
        ("yt-dlp installed", check_ytdlp),
        ("ffmpeg installed", check_ffmpeg),
        ("Port 5001 free", check_port_5001),
        ("Port 3000 reachable (Next.js)", check_nextjs),
    ]

    all_passed = True

    print("NETRA ENVIRONMENT VERIFICATION")
    print("-" * 50)
    for check in checks:
        name = check[0]
        func = check[1]
        is_optional = len(check) > 2 and check[2]
        
        try:
            result = func()
        except Exception:
            result = False
            
        status = "PASSED" if result else ("SKIPPED" if is_optional else "FAILED")
        
        if status == "FAILED":
            all_passed = False
            
        color = "\033[92m" if status == "PASSED" else ("\033[93m" if status == "SKIPPED" else "\033[91m")
        reset = "\033[0m"
        
        print(f"{name:<35} : {color}{status}{reset}")

    print("-" * 50)
    if all_passed:
        print("\033[92mALL CHECKS PASSED — safe to continue\033[0m")
    else:
        print("\033[91mFIX THE ABOVE BEFORE PROCEEDING\033[0m")
        sys.exit(1)
