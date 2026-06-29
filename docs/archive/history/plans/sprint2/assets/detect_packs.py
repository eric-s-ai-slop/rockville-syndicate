from PIL import Image, ImageDraw, ImageFont
import json, math
sheets={
 "cars":"src/assets/images/game_decor/special/cars.jpg",
 "toolbooth":"src/assets/images/game_decor/special/toolbooth.jpg",
 "rail":"src/assets/images/game_decor/special/rail.jpg",
 "pool":"src/assets/images/game_decor/special/pool.jpg",
 "arcade":"src/assets/images/game_decor/special/arcade cab.jpg",
}
try: font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',15)
except: font=ImageFont.load_default()

def detect(path):
    im=Image.open(path).convert("RGB"); W,H=im.size; px=im.load()
    # sample bg color from several mockup-margin points and average
    pts=[(3,3),(W-3,3),(3,H-3),(W-3,H-3),(W//2,3),(3,H//2)]
    rs=gs=bs=0
    for x,y in pts: r,g,b=px[x,y]; rs+=r; gs+=g; bs+=b
    bg=(rs//len(pts),gs//len(pts),bs//len(pts))
    def isbg(r,g,b):
        return ((r-bg[0])**2+(g-bg[1])**2+(b-bg[2])**2)**0.5 < 26
    visited=bytearray(W*H); boxes=[]; stack=[]
    for y in range(H):
        for x in range(W):
            i=y*W+x
            if visited[i]: continue
            r,g,b=px[x,y]
            if isbg(r,g,b): visited[i]=1; continue
            minx=maxx=x; miny=maxy=y; stack.append((x,y)); visited[i]=1
            while stack:
                cx,cy=stack.pop()
                if cx<minx:minx=cx
                if cx>maxx:maxx=cx
                if cy<miny:miny=cy
                if cy>maxy:maxy=cy
                for nx,ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                    if 0<=nx<W and 0<=ny<H:
                        ni=ny*W+nx
                        if not visited[ni]:
                            nr,ng,nb=px[nx,ny]
                            if not isbg(nr,ng,nb): visited[ni]=1; stack.append((nx,ny))
                            else: visited[ni]=1
            w=maxx-minx+1; h=maxy-miny+1
            if w>=40 and h>=30: boxes.append([minx,miny,w,h])
    # merge overlapping/near (pad to bridge dashed boxes + drop shadows)
    def merge(bs,pad=10):
        ch=True; bs=[b[:] for b in bs]
        while ch:
            ch=False; out=[]; used=[False]*len(bs)
            for i in range(len(bs)):
                if used[i]:continue
                ax,ay,aw,ah=bs[i]; ax2,ay2=ax+aw,ay+ah
                for j in range(i+1,len(bs)):
                    if used[j]:continue
                    bx,by,bw,bh=bs[j]; bx2,by2=bx+bw,by+bh
                    if ax-pad<bx2 and bx-pad<ax2 and ay-pad<by2 and by-pad<ay2:
                        ax=min(ax,bx);ay=min(ay,by);ax2=max(ax2,bx2);ay2=max(ay2,by2)
                        aw,ah=ax2-ax,ay2-ay; used[j]=True; ch=True
                used[i]=True; out.append([ax,ay,ax2-ax,ay2-ay])
            bs=out
        return bs
    boxes=merge(boxes)
    boxes=[b for b in boxes if b[2]>=40 and b[3]>=30 and b[2]<W-20]
    boxes.sort(key=lambda b:(b[1]//40,b[0]))
    return im,boxes,bg

for name,p in sheets.items():
    im,boxes,bg=detect(p)
    json.dump(boxes,open(f"tmp/packboxes_{name}.json","w"))
    COLS=4;CELL=230;LBL=22;rows=math.ceil(len(boxes)/COLS)
    pg=Image.new("RGB",(COLS*CELL,max(1,rows)*CELL),(40,40,48));d=ImageDraw.Draw(pg)
    for k,b in enumerate(boxes):
        x,y,w,h=b;crop=im.crop((x,y,x+w,y+h))
        sc=min((CELL-8)/w,(CELL-LBL-8)/h,3.0);nw,nh=max(1,int(w*sc)),max(1,int(h*sc));crop=crop.resize((nw,nh))
        cx=(k%COLS)*CELL;cy=(k//COLS)*CELL
        pg.paste(crop,(cx+(CELL-nw)//2,cy+LBL+((CELL-LBL-nh)//2)))
        d.rectangle([cx,cy,cx+CELL-1,cy+CELL-1],outline=(90,90,110))
        d.text((cx+3,cy+3),f"#{k} {w}x{h}@{x},{y}",fill=(255,230,120),font=font)
    # paginate at ~1150 tall
    Hh=pg.size[1]; n=max(1,math.ceil(Hh/1150))
    for i in range(n): pg.crop((0,i*1150,pg.size[0],min(Hh,(i+1)*1150))).save(f"tmp/pack_{name}_{i}.png")
    print(f"{name}: {len(boxes)} items, bg={bg}, pages={n}")
