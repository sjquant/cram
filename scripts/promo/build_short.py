s=open('stage.html').read()
i=s.index("// ═════════════════════ SCENE A")
head=s[:i]
R=[("html,body{width:1920px;height:1080px;","html,body{width:1080px;height:1920px;"),
("#cam{position:absolute;inset:0;transform-origin:960px 540px}","#cam{position:absolute;inset:0;transform-origin:540px 960px}"),
("<title>Cram — promo</title>","<title>Cram — short</title>"),
("stagger = .07, d = .75, dy = 1.35)","stagger = .07, d = .75, dy = 1.35)")]
for a,b in R:
    assert a in head, a; head=head.replace(a,b)
open('short.html','w').write(head+open('short_scenes.js').read()+"\n</script>\n</body>\n</html>\n")
