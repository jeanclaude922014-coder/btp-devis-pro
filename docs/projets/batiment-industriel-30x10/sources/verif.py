import sys, json, time, formulas
t=time.time()
xl = formulas.ExcelModel().loads(sys.argv[1]).finish()
sol = xl.calculate()
print('calc', round(time.time()-t,1),'s', len(sol))
import pickle
vals={}
err=[]
for k,v in sol.items():
    try: val=v.value[0,0] if hasattr(v,'value') else v
    except Exception: val=v
    vals[k]=val
    s=str(val)
    if s.startswith('#') : err.append((k,s))
print('errors', len(err), err[:15])
import numpy as np
def conv(v):
    if isinstance(v,(bool,np.bool_)): return bool(v)
    if isinstance(v,(int,float,np.integer,np.floating)): return float(v)
    return str(v)
json.dump({str(k):conv(v) for k,v in vals.items()}, open(sys.argv[1]+'.vals.json','w'))
cells=json.load(open(sys.argv[1]+'.cells.json'))
for n,(sh,c) in cells.items():
    for k in vals:
        if k.upper().endswith(f"{sh.upper()}'!{c}"):
            print(n, vals[k])
