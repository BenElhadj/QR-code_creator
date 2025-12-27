import sys
import os
import warnings
import qrcode
from PIL import Image, ImageFile

Image.MAX_IMAGE_PIXELS = None
ImageFile.LOAD_TRUNCATED_IMAGES = True
warnings.simplefilter("ignore", Image.DecompressionBombWarning)

def create_qr(data, logo_path, output_path):
    if not os.path.isfile(logo_path):
        raise FileNotFoundError(f"❌ Logo introuvable : {logo_path}")

    # --------- QUALITÉ ---------
    box_size = 20
    border = 2
    logo_ratio = 0.27  # logo bien visible

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )

    qr.add_data(data)
    qr.make(fit=True)

    qr_img = qr.make_image(
        fill_color="black",
        back_color="white"
    ).convert("RGBA")

    qr_w, qr_h = qr_img.size

    # --------- LOGO (TRANSPARENCE -> BLANC) ---------
    logo = Image.open(logo_path).convert("RGBA")
    logo_size = int(qr_w * logo_ratio)
    logo.thumbnail((logo_size, logo_size), Image.LANCZOS)

    # Créer une version du logo avec fond blanc
    logo_white_bg = Image.new("RGBA", logo.size, "WHITE")
    logo_white_bg.paste(logo, (0, 0), mask=logo)

    logo_pos = (
        (qr_w - logo_white_bg.size[0]) // 2,
        (qr_h - logo_white_bg.size[1]) // 2
    )

    # Collage sans bordure
    qr_img.paste(logo_white_bg, logo_pos)

    # --------- SORTIE ---------
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    qr_img.save(
        output_path,
        format="PNG",
        dpi=(300, 300),
        optimize=True
    )

    print(f"✅ QR Code HD (logo fond blanc sans bordure) : {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("❌ Utilisation : py qr_code_creator.py <url> <logo.png> <output.png>")
        sys.exit(1)

    url = sys.argv[1]
    logo_file = sys.argv[2]
    output_file = sys.argv[3]

    create_qr(url, logo_file, output_file)


"""
===============================================
QR Code Creator with Center Logo (HD)

Usage (commande à lancer dans le terminal) :
-----------------------------------------------
py qr_code_creator.py "<url_ou_texte>" <chemin_logo.png> <fichier_sortie.png>

Exemple :
-----------------------------------------------
py qr_code_creator.py "https://benelhadj.github.io/Portfolio/#contact" messages.png qr_Email.png

Description :
-----------------------------------------------
- Génère un QR Code en haute qualité (PNG, 300 DPI)
- Insère un logo au centre
- La transparence du logo est remplacée par un fond blanc
- Le QR reste lisible grâce à une correction d'erreur élevée

Prérequis :
-----------------------------------------------
pip install qrcode[pil] pillow

===============================================
"""
