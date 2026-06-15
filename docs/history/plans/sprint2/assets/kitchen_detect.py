from PIL import Image, ImageDraw, ImageFont
import json, math
SRC="src/assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png"
full=Image.open(SRC).convert("RGBA")
OX,OY,RW,RH=3,3171,765,933
img=full.crop((OX,OY,OX+RW,OY+RH))
W,H=img.size; px=img.load(); ALPHA=12
visited=bytearray(W*H); boxes=[]; stack=[]
for y in range(H):
    for x in range(W):
        idx=y*W+x
        if visited[idx]:continue
        if px[x,y][3]<=ALPHA: visited[idx]=1; continue
        minx=maxx=x; miny=maxy=y; stack.append((x,y)); visited[idx]=1
        while stack:
            cx,cy=stack.pop()
            minx=min(minx,cx);maxx=max(maxx,cx);miny=min(miny,cy);maxy=max(maxy,cy)
            for nx,ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                if 0<=nx<W and 0<=ny<H:
                    nidx=ny*W+nx
                    if not visited[nidx]:
                        if px[nx,ny][3]>ALPHA: visited[nidx]=1; stack.append((nx,ny))
                        else: visited[nidx]=1
        w=maxx-minx+1;h=maxy-miny+1
        if w>=20 and h>=20: boxes.append([minx+OX,miny+OY,w,h])
boxes.sort(key=lambda b:(b[1]//24,b[0]))
print("kitchen sub-items:",len(boxes))
json.dump(boxes,open("tmp/kitchen_boxes.json","w"))
# montage
COLS=5;CELL=165;LBL=18;rows=math.ceil(len(boxes)/COLS)
try: font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",14)
except: font=ImageFont.load_default()
pg=Image.new("RGB",(COLS*CELL,rows*CELL),(28,28,36));d=ImageDraw.Draw(pg)
for k,b in enumerate(boxes):
    x,y,w,h=b;crop=full.crop((x,y,x+w,y+h))
    sc=min((CELL-6)/w,(CELL-LBL-6)/h,4.5);nw,nh=int(w*sc),int(h*sc);crop=crop.resize((nw,nh))
    cx=(k%COLS)*CELL;cy=(k//COLS)*CELL
    pg.paste(crop,(cx+(CELL-nw)//2,cy+LBL+((CELL-LBL-nh)//2)),crop)
    d.rectangle([cx,cy,cx+CELL-1,cy+CELL-1],outline=(90,90,110))
    d.text((cx+2,cy+2),f"{w}x{h}@{x},{y}",fill=(255,230,120),font=font)
pg.save("tmp/kitchen_items.png");print("size",pg.size)
