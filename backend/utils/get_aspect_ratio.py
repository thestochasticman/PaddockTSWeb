from PIL import Image  # pip install pillow

def get_aspect_ratio(path: str) -> float:
    """Return height/width for a PNG at `path`."""
    with Image.open(path) as img:
        width, height = img.size
    return height / width