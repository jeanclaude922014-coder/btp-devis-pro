"""Ajoute les valeurs calculées (cache) dans les cellules formules d'un xlsx écrit par openpyxl."""
import sys, json, re, zipfile, html
src, vals_json, dst = sys.argv[1:4]
vals = json.load(open(vals_json))
fname = src.split('/')[-1]
zin = zipfile.ZipFile(src)
names = re.findall(r'<sheet [^>]*name="([^"]+)"', zin.read('xl/workbook.xml').decode())
names = [html.unescape(n) for n in names]
zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
n_ok = n_miss = 0
for item in zin.infolist():
    data = zin.read(item.filename)
    m = re.match(r'xl/worksheets/sheet(\d+)\.xml', item.filename)
    if m:
        sh = names[int(m.group(1)) - 1].upper()
        xml = data.decode()
        def rep(mo):
            global n_ok, n_miss
            ref, attrs, f = mo.group(1), mo.group(2), mo.group(3)
            v = vals.get(f"'[{fname}]{sh}'!{ref}")
            if v is None or (isinstance(v, str) and v.startswith('#')) or v == 'empty':
                n_miss += 1
                return mo.group(0)
            n_ok += 1
            if isinstance(v, bool):
                return f'<c r="{ref}"{attrs} t="b"><f>{f}</f><v>{int(v)}</v></c>'
            if isinstance(v, float):
                return f'<c r="{ref}"{attrs}><f>{f}</f><v>{repr(v)}</v></c>'
            return f'<c r="{ref}"{attrs} t="str"><f>{f}</f><v>{html.escape(str(v), quote=False)}</v></c>'
        xml = re.sub(r'<c r="([A-Z]+\d+)"((?: s="\d+")?)><f>(.*?)</f><v\s*/?>(?:</v>)?</c>', rep, xml)
        data = xml.encode()
    zout.writestr(item, data)
zout.close()
print('valeurs injectées', n_ok, 'manquantes', n_miss)
