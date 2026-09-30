"""Download the promo fonts into scripts/promo/fonts and write fonts.css."""
import re, urllib.request, os, hashlib, subprocess, tarfile, tempfile, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.makedirs("fonts", exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
url = ("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900"
       "&family=Inter:wght@400..800&family=Inter+Tight:wght@500..900&family=JetBrains+Mono:wght@400..700"
       "&family=Caveat:wght@500..700&family=Noto+Serif+KR:wght@500;700;900"
       "&family=Noto+Sans+KR:wght@400;500;700;800&display=block")
css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read().decode()
def rep(m):
    u = m.group(1); n = hashlib.md5(u.encode()).hexdigest()[:12] + ".woff2"
    p = os.path.join("fonts", n)
    if not os.path.exists(p):
        open(p, "wb").write(urllib.request.urlopen(u).read())
    return f"url(fonts/{n})"
css = re.sub(r"url\((https://[^)]+)\)", rep, css)
# Pretendard (Korean headings) ships on npm, not Google Fonts.
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["npm", "pack", "pretendard@1.3.9", "--silent"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
    with tarfile.open(os.path.join(tmp, "pretendard-1.3.9.tgz")) as tf:
        src = tf.extractfile("package/dist/web/variable/woff2/PretendardVariable.woff2")
        open("fonts/PretendardVariable.woff2", "wb").write(src.read())
css += '@font-face{font-family:"Pretendard";src:url(fonts/PretendardVariable.woff2) format("woff2-variations");font-weight:45 920;font-display:block}\n'
open("fonts.css", "w").write(css)
print(len(css), len(os.listdir("fonts")))
