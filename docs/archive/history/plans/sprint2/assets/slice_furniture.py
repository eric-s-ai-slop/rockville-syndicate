from PIL import Image, ImageDraw
import json, sys

SRC = "src/assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png"
img = Image.open(SRC).convert("RGBA")
W, H = img.size
px = img.load()
ALPHA = 12  # treat alpha<=ALPHA as background

# union-find over non-transparent pixels (4-connectivity), but to keep it fast we
# do a row-scan label with merging via simple flood using a stack on a downsampled mask.
# Full-res flood on 768x4272 (~3.3M px) is fine in Python with a visited bytearray.
visited = bytearray(W*H)
def soln():
    boxes=[]
    stack=[]
    for y in range(H):
        base=y*W
        for x in range(W):
            idx=base+x
            if visited[idx]: continue
            r,g,b,a = px[x,y]
            if a<=ALPHA:
                visited[idx]=1; continue
            # BFS island
            minx=maxx=x; miny=maxy=y
            stack.append((x,y)); visited[idx]=1
            while stack:
                cx,cy=stack.pop()
                if cx<minx:minx=cx
                if cx>maxx:maxx=cx
                if cy<miny:miny=cy
                if cy>maxy:maxy=cy
                for nx,ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                    if 0<=nx<W and 0<=ny<H:
                        nidx=ny*W+nx
                        if not visited[nidx]:
                            na=px[nx,ny][3]
                            if na>ALPHA:
                                visited[nidx]=1; stack.append((nx,ny))
                            else:
                                visited[nidx]=1
            w=maxx-minx+1; h=maxy-miny+1
            if w>=18 and h>=18:  # drop noise/text scribbles
                boxes.append([minx,miny,w,h])
    return boxes

boxes = soln()
# Merge boxes that are very close (likely one object split by a 1-2px transparent seam):
# expand each box by pad and union overlapping ones.
def merge(boxes, pad=4):
    changed=True
    bs=[b[:] for b in boxes]
    while changed:
        changed=False
        out=[]
        used=[False]*len(bs)
        for i in range(len(bs)):
            if used[i]:continue
            ax,ay,aw,ah=bs[i]; ax2,ay2=ax+aw,ay+ah
            for j in range(i+1,len(bs)):
                if used[j]:continue
                bx,by,bw,bh=bs[j]; bx2,by2=bx+bw,by+bh
                if ax-pad<bx2 and bx-pad<ax2 and ay-pad<by2 and by-pad<ay2:
                    nx=min(ax,bx); ny=min(ay,by); nx2=max(ax2,bx2); ny2=max(ay2,by2)
                    ax,ay,ax2,ay2=nx,ny,nx2,ny2; aw,ah=ax2-ax,ay2-ay
                    used[j]=True; changed=True
            used[i]=True
            out.append([ax,ay,ax2-ax,ay2-ay])
        bs=out
    return bs

boxes = merge(boxes, pad=3)
# sort top-to-bottom, then left-to-right (row banding by 24px)
boxes.sort(key=lambda b:(b[1]//24, b[0]))
print("ITEM_COUNT", len(boxes))
json.dump(boxes, open("tmp/furniture_boxes.json","w"))
